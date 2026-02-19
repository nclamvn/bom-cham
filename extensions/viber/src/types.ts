/** Viber Bot API types. See https://developers.viber.com/docs/api/rest-bot-api/ */

export type ViberUser = {
  id: string;
  name: string;
  avatar?: string;
  language?: string;
  country?: string;
  api_version?: number;
};

export type ViberMessagePayload = {
  type: "text" | "picture" | "video" | "file" | "contact" | "location" | "sticker";
  text?: string;
  media?: string;
  thumbnail?: string;
  file_name?: string;
  file_size?: number;
  sticker_id?: number;
  contact?: { name: string; phone_number: string };
  location?: { lat: number; lon: number };
};

export type ViberWebhookEvent = {
  event: "message" | "subscribed" | "unsubscribed" | "seen" | "delivered" | "webhook" | "conversation_started";
  timestamp: number;
  chat_hostname?: string;
  message_token?: number;
  user_id?: string;
  sender?: ViberUser;
  user?: ViberUser;
  message?: ViberMessagePayload;
  silent?: boolean;
};

export type ViberSendMessageRequest = {
  receiver: string;
  type: "text" | "picture" | "file";
  text?: string;
  media?: string;
  thumbnail?: string;
  file_name?: string;
  file_size?: number;
  sender: {
    name: string;
    avatar?: string;
  };
  min_api_version?: number;
};

export type ViberApiResponse = {
  status: number;
  status_message: string;
  message_token?: number;
  chat_hostname?: string;
};

export type ViberAccountInfo = {
  status: number;
  status_message: string;
  id: string;
  name: string;
  uri: string;
  icon: string;
  background: string;
  category: string;
  subcategory: string;
  location: { lat: number; lon: number };
  country: string;
  webhook: string;
  event_types: string[];
  subscribers_count: number;
  members: ViberUser[];
};

export type ViberConfig = {
  authToken?: string;
  botName?: string;
  botAvatar?: string;
  webhookUrl?: string;
  webhookPath?: string;
  enabled?: boolean;
  allowFrom?: (string | number)[];
  dmPolicy?: "open" | "pairing" | "disabled";
  accounts?: Record<string, ViberAccountConfig>;
};

export type ViberAccountConfig = {
  authToken?: string;
  botName?: string;
  botAvatar?: string;
  webhookUrl?: string;
  webhookPath?: string;
  enabled?: boolean;
  allowFrom?: (string | number)[];
  dmPolicy?: "open" | "pairing" | "disabled";
};
