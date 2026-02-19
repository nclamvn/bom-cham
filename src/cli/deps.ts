import { logWebSelfId, sendMessageWhatsApp } from "../channels/web/index.js";
import type { OutboundSendDeps } from "../infra/outbound/deliver.js";
import { sendMessageTelegram } from "../telegram/send.js";

const sendMessageDiscord: (...args: unknown[]) => Promise<{ messageId: string }> = async () => ({ messageId: "" });
const sendMessageIMessage: (...args: unknown[]) => Promise<{ messageId: string }> = async () => ({ messageId: "" });
const sendMessageSignal: (...args: unknown[]) => Promise<{ messageId: string }> = async () => ({ messageId: "" });
const sendMessageSlack: (...args: unknown[]) => Promise<{ messageId: string }> = async () => ({ messageId: "" });

export type CliDeps = {
  sendMessageWhatsApp: typeof sendMessageWhatsApp;
  sendMessageTelegram: typeof sendMessageTelegram;
  sendMessageDiscord: typeof sendMessageDiscord;
  sendMessageSlack: typeof sendMessageSlack;
  sendMessageSignal: typeof sendMessageSignal;
  sendMessageIMessage: typeof sendMessageIMessage;
};

export function createDefaultDeps(): CliDeps {
  return {
    sendMessageWhatsApp,
    sendMessageTelegram,
    sendMessageDiscord,
    sendMessageSlack,
    sendMessageSignal,
    sendMessageIMessage,
  };
}

// Provider docking: extend this mapping when adding new outbound send deps.
export function createOutboundSendDeps(deps: CliDeps): OutboundSendDeps {
  return {
    sendWhatsApp: deps.sendMessageWhatsApp,
    sendTelegram: deps.sendMessageTelegram,
    sendDiscord: deps.sendMessageDiscord,
    sendSlack: deps.sendMessageSlack,
    sendSignal: deps.sendMessageSignal,
    sendIMessage: deps.sendMessageIMessage,
  };
}

export { logWebSelfId };
