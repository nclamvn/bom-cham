import type { IncomingMessage, ServerResponse } from "node:http";
import { createHmac } from "node:crypto";

import type { OpenClawConfig, MarkdownTableMode } from "openclaw/plugin-sdk";

import type { ResolvedViberAccount } from "./accounts.js";
import type { ViberWebhookEvent } from "./types.js";
import { setWebhook, removeWebhook, sendTextMessage, type ViberFetch } from "./api.js";
import { getViberRuntime } from "./runtime.js";

export type ViberRuntimeEnv = {
  log?: (message: string) => void;
  error?: (message: string) => void;
};

export type ViberMonitorOptions = {
  token: string;
  account: ResolvedViberAccount;
  config: OpenClawConfig;
  runtime: ViberRuntimeEnv;
  abortSignal: AbortSignal;
  webhookUrl: string;
  webhookPath?: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
  fetcher?: ViberFetch;
};

export type ViberMonitorResult = {
  stop: () => void;
};

const VIBER_TEXT_LIMIT = 7000;

type ViberCoreRuntime = ReturnType<typeof getViberRuntime>;

function logVerbose(core: ViberCoreRuntime, runtime: ViberRuntimeEnv, message: string): void {
  if (core.logging.shouldLogVerbose()) {
    runtime.log?.(`[viber] ${message}`);
  }
}

function verifySignature(body: string, token: string, signature: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", token).update(body).digest("hex");
  return expected === signature;
}

function isSenderAllowed(senderId: string, allowFrom: string[]): boolean {
  if (allowFrom.includes("*")) return true;
  const normalizedSenderId = senderId.toLowerCase();
  return allowFrom.some((entry) => {
    const normalized = entry.toLowerCase().replace(/^(viber|vb):/i, "");
    return normalized === normalizedSenderId;
  });
}

async function readRawBody(req: IncomingMessage, maxBytes: number): Promise<{ ok: boolean; raw?: string; error?: string }> {
  const chunks: Buffer[] = [];
  let total = 0;
  return await new Promise((resolve) => {
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        resolve({ ok: false, error: "payload too large" });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({ ok: false, error: "empty payload" });
        return;
      }
      resolve({ ok: true, raw });
    });
    req.on("error", (err) => {
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });
  });
}

type WebhookTarget = {
  token: string;
  account: ResolvedViberAccount;
  config: OpenClawConfig;
  runtime: ViberRuntimeEnv;
  core: ViberCoreRuntime;
  path: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
  fetcher?: ViberFetch;
};

const webhookTargets = new Map<string, WebhookTarget[]>();

function normalizeWebhookPath(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "/viber/webhook";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) {
    return withSlash.slice(0, -1);
  }
  return withSlash;
}

function resolveWebhookPath(webhookPath?: string, webhookUrl?: string): string {
  const trimmedPath = webhookPath?.trim();
  if (trimmedPath) return normalizeWebhookPath(trimmedPath);
  if (webhookUrl?.trim()) {
    try {
      const parsed = new URL(webhookUrl);
      return normalizeWebhookPath(parsed.pathname || "/viber/webhook");
    } catch {
      return "/viber/webhook";
    }
  }
  return "/viber/webhook";
}

export function registerViberWebhookTarget(target: WebhookTarget): () => void {
  const key = normalizeWebhookPath(target.path);
  const normalizedTarget = { ...target, path: key };
  const existing = webhookTargets.get(key) ?? [];
  const next = [...existing, normalizedTarget];
  webhookTargets.set(key, next);
  return () => {
    const updated = (webhookTargets.get(key) ?? []).filter((entry) => entry !== normalizedTarget);
    if (updated.length > 0) {
      webhookTargets.set(key, updated);
    } else {
      webhookTargets.delete(key);
    }
  };
}

export async function handleViberWebhookRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = normalizeWebhookPath(url.pathname);
  const targets = webhookTargets.get(path);
  if (!targets || targets.length === 0) return false;

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("Method Not Allowed");
    return true;
  }

  const rawBody = await readRawBody(req, 1024 * 1024);
  if (!rawBody.ok || !rawBody.raw) {
    res.statusCode = rawBody.error === "payload too large" ? 413 : 400;
    res.end(rawBody.error ?? "invalid payload");
    return true;
  }

  // Verify signature against all registered targets
  const signature = String(req.headers["x-viber-content-signature"] ?? "");
  const target = targets.find((entry) => verifySignature(rawBody.raw!, entry.token, signature));
  if (!target) {
    // On first webhook setup, Viber sends a verification without valid signature.
    // Try to match any target for the "webhook" event type.
    let event: ViberWebhookEvent | undefined;
    try {
      event = JSON.parse(rawBody.raw) as ViberWebhookEvent;
    } catch {
      res.statusCode = 400;
      res.end("invalid JSON");
      return true;
    }
    if (event?.event === "webhook") {
      // Viber webhook verification — respond 200
      res.statusCode = 200;
      res.end("ok");
      return true;
    }
    res.statusCode = 403;
    res.end("invalid signature");
    return true;
  }

  let event: ViberWebhookEvent;
  try {
    event = JSON.parse(rawBody.raw) as ViberWebhookEvent;
  } catch {
    res.statusCode = 400;
    res.end("invalid JSON");
    return true;
  }

  // Respond immediately, process async
  res.statusCode = 200;
  res.end("ok");

  target.statusSink?.({ lastInboundAt: Date.now() });
  processEvent(event, target).catch((err) => {
    target.runtime.error?.(`[${target.account.accountId}] Viber webhook failed: ${String(err)}`);
  });

  return true;
}

async function processEvent(event: ViberWebhookEvent, target: WebhookTarget): Promise<void> {
  const { runtime, core, account } = target;

  switch (event.event) {
    case "webhook":
      logVerbose(core, runtime, "Webhook verified");
      break;

    case "subscribed":
      logVerbose(core, runtime, `User subscribed: ${event.user?.id ?? "unknown"}`);
      break;

    case "unsubscribed":
      logVerbose(core, runtime, `User unsubscribed: ${event.user_id ?? "unknown"}`);
      break;

    case "conversation_started": {
      const user = event.user;
      if (user) {
        logVerbose(core, runtime, `Conversation started with ${user.name} (${user.id})`);
        // Send welcome message
        try {
          const botName = account.config.botName ?? "Bờm Chăm";
          await sendTextMessage(
            target.token,
            user.id,
            `Xin chào! Tôi là ${botName}, trợ lý chăm sóc người thân. Nhắn tin để bắt đầu.`,
            botName,
            account.config.botAvatar,
            target.fetcher,
          );
          target.statusSink?.({ lastOutboundAt: Date.now() });
        } catch (err) {
          runtime.error?.(`[${account.accountId}] Viber welcome message failed: ${String(err)}`);
        }
      }
      break;
    }

    case "message":
      await handleMessage(event, target);
      break;

    case "seen":
    case "delivered":
      // Ignore delivery/read receipts
      break;

    default:
      logVerbose(core, runtime, `Unknown event: ${event.event}`);
  }
}

async function handleMessage(event: ViberWebhookEvent, target: WebhookTarget): Promise<void> {
  const { token, account, config, runtime, core, statusSink, fetcher } = target;
  const sender = event.sender;
  if (!sender || !event.message) return;

  const messageType = event.message.type;
  let text = "";
  let mediaPath: string | undefined;
  let mediaType: string | undefined;

  switch (messageType) {
    case "text":
      text = event.message.text?.trim() ?? "";
      break;

    case "picture":
      text = event.message.text?.trim() ?? "";
      if (event.message.media) {
        try {
          const fetched = await core.channel.media.fetchRemoteMedia({ url: event.message.media });
          const saved = await core.channel.media.saveMediaBuffer(
            fetched.buffer,
            fetched.contentType,
            "inbound",
            5 * 1024 * 1024,
          );
          mediaPath = saved.path;
          mediaType = saved.contentType;
        } catch (err) {
          runtime.error?.(`[${account.accountId}] Failed to download Viber image: ${String(err)}`);
        }
        if (!text) text = "<media:image>";
      }
      break;

    case "video":
      text = "[Video message]";
      break;

    case "file":
      text = `[File: ${event.message.file_name ?? "unknown"}]`;
      break;

    case "contact":
      text = event.message.contact
        ? `[Contact: ${event.message.contact.name} — ${event.message.contact.phone_number}]`
        : "[Contact]";
      break;

    case "location":
      text = event.message.location
        ? `[Location: ${event.message.location.lat}, ${event.message.location.lon}]`
        : "[Location]";
      break;

    case "sticker":
      logVerbose(core, runtime, `Received sticker from ${sender.id}`);
      return;

    default:
      text = `[Unsupported message type: ${messageType}]`;
  }

  if (!text && !mediaPath) return;

  const senderId = sender.id;
  const senderName = sender.name;
  const dmPolicy = account.config.dmPolicy ?? "pairing";
  const configAllowFrom = (account.config.allowFrom ?? []).map((v) => String(v));
  const shouldComputeAuth = core.channel.commands.shouldComputeCommandAuthorized(text, config);
  const storeAllowFrom =
    dmPolicy !== "open" || shouldComputeAuth
      ? await core.channel.pairing.readAllowFromStore("viber").catch(() => [])
      : [];
  const effectiveAllowFrom = [...configAllowFrom, ...storeAllowFrom];
  const useAccessGroups = config.commands?.useAccessGroups !== false;
  const senderAllowedForCommands = isSenderAllowed(senderId, effectiveAllowFrom);
  const commandAuthorized = shouldComputeAuth
    ? core.channel.commands.resolveCommandAuthorizedFromAuthorizers({
        useAccessGroups,
        authorizers: [
          { configured: effectiveAllowFrom.length > 0, allowed: senderAllowedForCommands },
        ],
      })
    : undefined;

  if (dmPolicy === "disabled") {
    logVerbose(core, runtime, `Blocked viber DM from ${senderId} (dmPolicy=disabled)`);
    return;
  }

  if (dmPolicy !== "open") {
    if (!senderAllowedForCommands) {
      if (dmPolicy === "pairing") {
        const { code, created } = await core.channel.pairing.upsertPairingRequest({
          channel: "viber",
          id: senderId,
          meta: { name: senderName ?? undefined },
        });

        if (created) {
          logVerbose(core, runtime, `viber pairing request sender=${senderId}`);
          try {
            const botName = account.config.botName ?? "Bờm Chăm";
            await sendTextMessage(
              token,
              senderId,
              core.channel.pairing.buildPairingReply({
                channel: "viber",
                idLine: `Your Viber user id: ${senderId}`,
                code,
              }),
              botName,
              account.config.botAvatar,
              fetcher,
            );
            statusSink?.({ lastOutboundAt: Date.now() });
          } catch (err) {
            logVerbose(core, runtime, `viber pairing reply failed for ${senderId}: ${String(err)}`);
          }
        }
      } else {
        logVerbose(core, runtime, `Blocked unauthorized viber sender ${senderId} (dmPolicy=${dmPolicy})`);
      }
      return;
    }
  }

  const route = core.channel.routing.resolveAgentRoute({
    cfg: config,
    channel: "viber",
    accountId: account.accountId,
    peer: { kind: "dm", id: senderId },
  });

  const fromLabel = senderName || `user:${senderId}`;
  const storePath = core.channel.session.resolveStorePath(config.session?.store, {
    agentId: route.agentId,
  });
  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(config);
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  });
  const body = core.channel.reply.formatAgentEnvelope({
    channel: "Viber",
    from: fromLabel,
    timestamp: event.timestamp,
    previousTimestamp,
    envelope: envelopeOptions,
    body: text,
  });

  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    RawBody: text,
    CommandBody: text,
    From: `viber:${senderId}`,
    To: `viber:${senderId}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: "direct" as const,
    ConversationLabel: fromLabel,
    SenderName: senderName || undefined,
    SenderId: senderId,
    CommandAuthorized: commandAuthorized,
    Provider: "viber",
    Surface: "viber",
    MessageSid: event.message_token != null ? String(event.message_token) : undefined,
    MediaPath: mediaPath,
    MediaType: mediaType,
    MediaUrl: mediaPath,
    OriginatingChannel: "viber",
    OriginatingTo: `viber:${senderId}`,
  });

  await core.channel.session.recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    onRecordError: (err) => {
      runtime.error?.(`viber: failed updating session meta: ${String(err)}`);
    },
  });

  const tableMode = core.channel.text.resolveMarkdownTableMode({
    cfg: config,
    channel: "viber",
    accountId: account.accountId,
  });

  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: config,
    dispatcherOptions: {
      deliver: async (payload) => {
        await deliverViberReply({
          payload,
          token,
          receiverId: senderId,
          account,
          runtime,
          core,
          config,
          statusSink,
          fetcher,
          tableMode,
        });
      },
      onError: (err, info) => {
        runtime.error?.(`[${account.accountId}] Viber ${info.kind} reply failed: ${String(err)}`);
      },
    },
  });
}

async function deliverViberReply(params: {
  payload: { text?: string; mediaUrls?: string[]; mediaUrl?: string };
  token: string;
  receiverId: string;
  account: ResolvedViberAccount;
  runtime: ViberRuntimeEnv;
  core: ViberCoreRuntime;
  config: OpenClawConfig;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
  fetcher?: ViberFetch;
  tableMode?: MarkdownTableMode;
}): Promise<void> {
  const { payload, token, receiverId, account, runtime, core, config, statusSink, fetcher } = params;
  const tableMode = params.tableMode ?? "code";
  const text = core.channel.text.convertMarkdownTables(payload.text ?? "", tableMode);
  const botName = account.config.botName ?? "Bờm Chăm";
  const botAvatar = account.config.botAvatar;

  const mediaList = payload.mediaUrls?.length
    ? payload.mediaUrls
    : payload.mediaUrl
      ? [payload.mediaUrl]
      : [];

  if (mediaList.length > 0) {
    const { sendPictureMessage } = await import("./api.js");
    let first = true;
    for (const mediaUrl of mediaList) {
      const caption = first ? text : "";
      first = false;
      try {
        await sendPictureMessage(token, receiverId, caption, mediaUrl, botName, botAvatar, fetcher);
        statusSink?.({ lastOutboundAt: Date.now() });
      } catch (err) {
        runtime.error?.(`Viber photo send failed: ${String(err)}`);
      }
    }
    return;
  }

  if (text) {
    const chunkMode = core.channel.text.resolveChunkMode(config, "viber", account.accountId);
    const chunks = core.channel.text.chunkMarkdownTextWithMode(text, VIBER_TEXT_LIMIT, chunkMode);
    for (const chunk of chunks) {
      try {
        await sendTextMessage(token, receiverId, chunk, botName, botAvatar, fetcher);
        statusSink?.({ lastOutboundAt: Date.now() });
      } catch (err) {
        runtime.error?.(`Viber message send failed: ${String(err)}`);
      }
    }
  }
}

export async function monitorViberProvider(options: ViberMonitorOptions): Promise<ViberMonitorResult> {
  const {
    token,
    account,
    config,
    runtime,
    abortSignal,
    webhookUrl,
    webhookPath,
    statusSink,
    fetcher: fetcherOverride,
  } = options;

  const core = getViberRuntime();

  const stopHandlers: Array<() => void> = [];

  const stop = () => {
    for (const handler of stopHandlers) {
      handler();
    }
  };

  if (!webhookUrl) {
    throw new Error("Viber requires webhookUrl for receiving messages");
  }

  const path = resolveWebhookPath(webhookPath, webhookUrl);

  // Set webhook with Viber API
  const webhookResult = await setWebhook(token, webhookUrl, undefined, fetcherOverride);
  if (webhookResult.status !== 0) {
    throw new Error(`Viber set_webhook failed: ${webhookResult.status_message}`);
  }

  runtime.log?.(`[${account.accountId}] Viber webhook set: ${webhookUrl}`);

  const unregister = registerViberWebhookTarget({
    token,
    account,
    config,
    runtime,
    core,
    path,
    statusSink: (patch) => statusSink?.(patch),
    fetcher: fetcherOverride,
  });
  stopHandlers.push(unregister);

  abortSignal.addEventListener(
    "abort",
    () => {
      void removeWebhook(token, fetcherOverride).catch(() => {});
    },
    { once: true },
  );

  return { stop };
}
