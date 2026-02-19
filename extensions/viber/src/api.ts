/** Viber Bot REST API client. Base URL: https://chatapi.viber.com/pa/ */

import type {
  ViberAccountInfo,
  ViberApiResponse,
  ViberSendMessageRequest,
} from "./types.js";

const VIBER_API_BASE = "https://chatapi.viber.com/pa";
const REQUEST_TIMEOUT_MS = 10_000;

export type ViberFetch = typeof globalThis.fetch;

async function viberRequest<T>(
  endpoint: string,
  token: string,
  body: Record<string, unknown>,
  fetcher: ViberFetch = globalThis.fetch,
): Promise<T> {
  const url = `${VIBER_API_BASE}/${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        "X-Viber-Auth-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Viber API ${endpoint}: HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function setWebhook(
  token: string,
  webhookUrl: string,
  eventTypes?: string[],
  fetcher?: ViberFetch,
): Promise<ViberApiResponse> {
  return viberRequest<ViberApiResponse>(
    "set_webhook",
    token,
    {
      url: webhookUrl,
      event_types: eventTypes ?? ["message", "subscribed", "unsubscribed", "conversation_started"],
      send_name: true,
      send_photo: true,
    },
    fetcher,
  );
}

export async function removeWebhook(
  token: string,
  fetcher?: ViberFetch,
): Promise<ViberApiResponse> {
  return viberRequest<ViberApiResponse>(
    "set_webhook",
    token,
    { url: "" },
    fetcher,
  );
}

export async function sendTextMessage(
  token: string,
  receiverId: string,
  text: string,
  senderName: string,
  senderAvatar?: string,
  fetcher?: ViberFetch,
): Promise<ViberApiResponse> {
  const body: ViberSendMessageRequest = {
    receiver: receiverId,
    type: "text",
    text,
    sender: { name: senderName, avatar: senderAvatar },
    min_api_version: 1,
  };
  return viberRequest<ViberApiResponse>("send_message", token, body as unknown as Record<string, unknown>, fetcher);
}

export async function sendPictureMessage(
  token: string,
  receiverId: string,
  text: string,
  mediaUrl: string,
  senderName: string,
  senderAvatar?: string,
  fetcher?: ViberFetch,
): Promise<ViberApiResponse> {
  const body: ViberSendMessageRequest = {
    receiver: receiverId,
    type: "picture",
    text,
    media: mediaUrl,
    sender: { name: senderName, avatar: senderAvatar },
    min_api_version: 1,
  };
  return viberRequest<ViberApiResponse>("send_message", token, body as unknown as Record<string, unknown>, fetcher);
}

export async function getAccountInfo(
  token: string,
  fetcher?: ViberFetch,
): Promise<ViberAccountInfo> {
  return viberRequest<ViberAccountInfo>("get_account_info", token, {}, fetcher);
}

export async function getUserDetails(
  token: string,
  userId: string,
  fetcher?: ViberFetch,
): Promise<ViberApiResponse & { user?: Record<string, unknown> }> {
  return viberRequest("get_user_details", token, { id: userId }, fetcher);
}
