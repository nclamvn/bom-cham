import { sendTextMessage, sendPictureMessage, type ViberFetch } from "./api.js";
import type { ResolvedViberAccount } from "./accounts.js";

const DEFAULT_BOT_NAME = "Bờm Chăm";

export type ViberSendResult = {
  messageId?: string;
  error?: string;
};

export async function sendViberMessage(
  token: string,
  receiverId: string,
  text: string,
  account: ResolvedViberAccount,
  fetcher?: ViberFetch,
): Promise<ViberSendResult> {
  const senderName = account.name ?? account.config.botName ?? DEFAULT_BOT_NAME;
  const senderAvatar = account.config.botAvatar;

  try {
    const result = await sendTextMessage(token, receiverId, text, senderName, senderAvatar, fetcher);
    if (result.status !== 0) {
      return { error: `Viber API error ${result.status}: ${result.status_message}` };
    }
    return { messageId: result.message_token != null ? String(result.message_token) : undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendViberPhoto(
  token: string,
  receiverId: string,
  text: string,
  mediaUrl: string,
  account: ResolvedViberAccount,
  fetcher?: ViberFetch,
): Promise<ViberSendResult> {
  const senderName = account.name ?? account.config.botName ?? DEFAULT_BOT_NAME;
  const senderAvatar = account.config.botAvatar;

  try {
    const result = await sendPictureMessage(token, receiverId, text, mediaUrl, senderName, senderAvatar, fetcher);
    if (result.status !== 0) {
      return { error: `Viber API error ${result.status}: ${result.status_message}` };
    }
    return { messageId: result.message_token != null ? String(result.message_token) : undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
