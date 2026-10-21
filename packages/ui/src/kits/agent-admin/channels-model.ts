/** Channel platform model: `ChannelPlatform`, the per-platform id rules and display names (`channelPlatforms`) and `validateChannelId`. */


/* ------------------------------------------------------------------ */
/* Platforms                                                           */
/* ------------------------------------------------------------------ */

export type ChannelPlatform =
  | "telegram"
  | "whatsapp"
  | "slack"
  | "discord"
  | "signal"
  | "matrix"
  | "email"
  | "sms"
  | "imessage"
  | "webhook";

export interface ChannelIdRule {
  /** Pattern a single user / chat id must match. */
  pattern: RegExp;
  /** Human description used in errors, e.g. "numeric chat ID". */
  description: string;
  example: string;
}

export interface ChannelPlatformInfo {
  label: string;
  idRule: ChannelIdRule;
}

const PHONE: ChannelIdRule = { pattern: /^\+?[1-9]\d{6,14}$/, description: "phone number in international format", example: "+14155550123" };
const EMAIL: ChannelIdRule = { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, description: "email address", example: "ada@example.com" };

/** Display names and per-platform user / chat id rules. */
export const channelPlatforms: Record<ChannelPlatform, ChannelPlatformInfo> = {
  telegram: {
    label: "Telegram",
    idRule: { pattern: /^-?\d{5,16}$/, description: "numeric chat ID", example: "123456789 or -1001234567890" },
  },
  whatsapp: { label: "WhatsApp", idRule: PHONE },
  slack: {
    label: "Slack",
    idRule: { pattern: /^[UWCGD][A-Z0-9]{6,12}$/, description: "Slack ID (U…, C…, G… or D…)", example: "U024BE7LH" },
  },
  discord: {
    label: "Discord",
    idRule: { pattern: /^\d{17,20}$/, description: "17–20 digit Discord ID", example: "80351110224678912" },
  },
  signal: { label: "Signal", idRule: PHONE },
  matrix: {
    label: "Matrix",
    idRule: { pattern: /^[@!#][^:\s]+:[^\s]+$/, description: "Matrix ID (@user:server)", example: "@ada:matrix.org" },
  },
  email: { label: "Email", idRule: EMAIL },
  sms: { label: "SMS", idRule: PHONE },
  imessage: {
    label: "iMessage",
    idRule: {
      pattern: new RegExp(`(${PHONE.pattern.source})|(${EMAIL.pattern.source})`),
      description: "phone number or Apple ID email",
      example: "+14155550123",
    },
  },
  webhook: { label: "Webhook", idRule: { pattern: /^\S+$/, description: "caller ID", example: "ci-bot" } },
};

/** Whether `id` is a valid user / chat id for `platform`. */
export function validateChannelId(platform: ChannelPlatform, id: string): boolean {
  return channelPlatforms[platform].idRule.pattern.test(id.trim());
}
