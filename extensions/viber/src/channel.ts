import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk";
import {
  buildChannelConfigSchema,
  DEFAULT_ACCOUNT_ID,
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "openclaw/plugin-sdk";

import {
  listViberAccountIds,
  resolveDefaultViberAccountId,
  resolveViberAccount,
  type ResolvedViberAccount,
} from "./accounts.js";
import { sendViberMessage, sendViberPhoto } from "./send.js";
import { monitorViberProvider } from "./monitor.js";
import { getViberRuntime } from "./runtime.js";
import { getAccountInfo } from "./api.js";

const meta = {
  id: "viber",
  label: "Viber",
  selectionLabel: "Viber (Bot API)",
  docsPath: "/channels/viber",
  docsLabel: "viber",
  blurb: "Viber Bot API for eldercare messaging in Vietnam.",
  aliases: ["vb"],
  order: 85,
  quickstartAllowFrom: true,
};

// Minimal config schema for Viber — authToken is the main field
const ViberConfigSchema = {
  type: "object",
  properties: {
    authToken: { type: "string" },
    botName: { type: "string" },
    botAvatar: { type: "string" },
    webhookUrl: { type: "string" },
    webhookPath: { type: "string" },
    enabled: { type: "boolean" },
    dmPolicy: { type: "string", enum: ["open", "pairing", "disabled"] },
    allowFrom: { type: "array", items: { type: ["string", "number"] } },
    accounts: { type: "object", additionalProperties: true },
  },
  additionalProperties: false,
};

function normalizeViberMessagingTarget(raw: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^(viber|vb):/i, "");
}

export const viberPlugin: ChannelPlugin<ResolvedViberAccount> = {
  id: "viber",
  meta,
  capabilities: {
    chatTypes: ["direct"],
    media: true,
    reactions: false,
    threads: false,
    polls: false,
    nativeCommands: false,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.viber"] },
  configSchema: buildChannelConfigSchema(ViberConfigSchema),
  config: {
    listAccountIds: (cfg) => listViberAccountIds(cfg as OpenClawConfig),
    resolveAccount: (cfg, accountId) =>
      resolveViberAccount({ cfg: cfg as OpenClawConfig, accountId }),
    defaultAccountId: (cfg) => resolveDefaultViberAccountId(cfg as OpenClawConfig),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg,
        sectionKey: "viber",
        accountId,
        enabled,
        allowTopLevel: true,
      }),
    deleteAccount: ({ cfg, accountId }) =>
      deleteAccountFromConfigSection({
        cfg,
        sectionKey: "viber",
        accountId,
        clearBaseFields: ["authToken", "botName"],
      }),
    isConfigured: (account) => Boolean(account.token?.trim()),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.token?.trim()),
      tokenSource: account.tokenSource,
    }),
    resolveAllowFrom: ({ cfg, accountId }) =>
      (resolveViberAccount({ cfg: cfg as OpenClawConfig, accountId }).config.allowFrom ?? []).map(
        (entry) => String(entry),
      ),
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.replace(/^(viber|vb):/i, ""))
        .map((entry) => entry.toLowerCase()),
  },
  pairing: {
    idLabel: "viberUserId",
    normalizeAllowEntry: (entry) => entry.replace(/^(viber|vb):/i, ""),
    notifyApproval: async ({ cfg, id }) => {
      const account = resolveViberAccount({ cfg: cfg as OpenClawConfig });
      if (!account.token) throw new Error("viber token not configured");
      const botName = account.config.botName ?? "Bờm Chăm";
      const { sendTextMessage } = await import("./api.js");
      await sendTextMessage(account.token, id, "Approved! You can now send messages.", botName);
    },
  },
  security: {
    resolveDmPolicy: ({ account }) => ({
      policy: account.config.dmPolicy ?? "pairing",
      allowFrom: account.config.allowFrom ?? [],
      policyPath: "channels.viber.dmPolicy",
      allowFromPath: "channels.viber.",
      normalizeEntry: (raw) => raw.replace(/^(viber|vb):/i, ""),
    }),
  },
  messaging: {
    normalizeTarget: normalizeViberMessagingTarget,
    targetResolver: {
      looksLikeId: (raw) => /^[A-Za-z0-9+/=]{20,}$/.test(raw.trim()),
      hint: "<viberUserId>",
    },
  },
  threading: {
    resolveReplyToMode: () => "off",
  },
  outbound: {
    deliveryMode: "direct",
    chunker: (text, limit) => getViberRuntime().channel.text.chunkMarkdownText(text, limit),
    chunkerMode: "markdown",
    textChunkLimit: 7000,
    sendText: async ({ to, text, accountId, cfg }) => {
      const account = resolveViberAccount({ cfg: cfg as OpenClawConfig, accountId });
      const result = await sendViberMessage(account.token, to, text, account);
      return { channel: "viber", ...result };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId, cfg }) => {
      const account = resolveViberAccount({ cfg: cfg as OpenClawConfig, accountId });
      if (mediaUrl) {
        const result = await sendViberPhoto(account.token, to, text, mediaUrl, account);
        return { channel: "viber", ...result };
      }
      const result = await sendViberMessage(account.token, to, text, account);
      return { channel: "viber", ...result };
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    buildAccountSnapshot: ({ account, runtime }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.token?.trim()),
      tokenSource: account.tokenSource,
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
    }),
    probeAccount: async ({ account, timeoutMs }) => {
      if (!account.token) return { ok: false, error: "no token" };
      try {
        const info = await getAccountInfo(account.token);
        return { ok: info.status === 0, bot: { name: info.name, id: info.id } };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      const token = account.token.trim();
      const webhookUrl = account.config.webhookUrl ?? process.env.VIBER_WEBHOOK_URL;

      if (!webhookUrl) {
        ctx.log?.warn?.(`[${account.accountId}] Viber: no webhookUrl configured, skipping`);
        return;
      }

      let botLabel = "";
      try {
        const info = await getAccountInfo(token);
        if (info.status === 0 && info.name) {
          botLabel = ` (${info.name})`;
        }
      } catch (err) {
        if (getViberRuntime().logging.shouldLogVerbose()) {
          ctx.log?.debug?.(`[${account.accountId}] Viber probe failed: ${String(err)}`);
        }
      }

      ctx.log?.info(`[${account.accountId}] starting Viber provider${botLabel}`);

      return monitorViberProvider({
        token,
        account,
        config: ctx.cfg,
        runtime: {
          log: (msg) => ctx.log?.info(msg),
          error: (msg) => ctx.log?.error?.(msg),
        },
        abortSignal: ctx.abortSignal,
        webhookUrl,
        webhookPath: account.config.webhookPath,
        statusSink: (patch) => {
          const current = ctx.getStatus();
          ctx.setStatus({ ...current, ...patch });
        },
      });
    },
    logoutAccount: async ({ cfg }) => {
      const account = resolveViberAccount({ cfg: cfg as OpenClawConfig });
      if (account.token) {
        const { removeWebhook } = await import("./api.js");
        await removeWebhook(account.token).catch(() => {});
      }
      return { cleared: true, loggedOut: true };
    },
  },
};
