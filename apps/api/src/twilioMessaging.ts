import { createHmac, timingSafeEqual } from "node:crypto";

export const TWILIO_INBOUND_WEBHOOK_PATH = "/api/webhooks/twilio/inbound";
export const TWILIO_STATUS_WEBHOOK_PATH = "/api/webhooks/twilio/status";

export interface TwilioMessagingConfig {
  accountSid: string;
  authToken: string;
  apiKey: string;
  apiSecret: string;
  phoneNumber: string;
  messagingServiceSid: string;
  webhookBaseUrl: string;
  defaultStoreCode: string;
}

type TwilioRequirement = "send" | "webhook";
type TwilioWebhookParams = Record<string, unknown>;

interface TwilioSendPayloadInput {
  body: string;
  mediaUrl?: string;
  statusCallbackUrl?: string;
  to: string;
}

function normalizeEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeWebhookValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeWebhookValue(entry));
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  return [];
}

export function getTwilioMessagingConfig(env: NodeJS.ProcessEnv): TwilioMessagingConfig {
  return {
    accountSid: normalizeEnvValue(env.TWILIO_ACCOUNT_SID),
    authToken: normalizeEnvValue(env.TWILIO_AUTH_TOKEN),
    apiKey: normalizeEnvValue(env.TWILIO_API_KEY),
    apiSecret: normalizeEnvValue(env.TWILIO_API_SECRET),
    phoneNumber: normalizeEnvValue(env.TWILIO_PHONE_NUMBER),
    messagingServiceSid: normalizeEnvValue(env.TWILIO_MESSAGING_SERVICE_SID),
    webhookBaseUrl: stripTrailingSlashes(normalizeEnvValue(env.TWILIO_WEBHOOK_BASE_URL)),
    defaultStoreCode: normalizeEnvValue(env.TWILIO_DEFAULT_STORE_CODE)
  };
}

export function getTwilioMissingConfig(config: TwilioMessagingConfig, requirement: TwilioRequirement) {
  const missing: string[] = [];

  if (!config.accountSid) {
    missing.push("TWILIO_ACCOUNT_SID");
  }

  if (!config.authToken && !(config.apiKey && config.apiSecret)) {
    missing.push("TWILIO_AUTH_TOKEN or TWILIO_API_KEY + TWILIO_API_SECRET");
  }

  if (!config.phoneNumber && !config.messagingServiceSid) {
    missing.push("TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID");
  }

  if (requirement === "webhook") {
    if (!config.authToken) {
      missing.push("TWILIO_AUTH_TOKEN");
    }

    if (!config.webhookBaseUrl) {
      missing.push("TWILIO_WEBHOOK_BASE_URL");
    }

    if (!config.defaultStoreCode) {
      missing.push("TWILIO_DEFAULT_STORE_CODE");
    }
  }

  return missing;
}

export function getTwilioWebhookUrl(config: TwilioMessagingConfig, path: string) {
  if (!config.webhookBaseUrl) {
    return null;
  }

  return `${config.webhookBaseUrl}${path}`;
}

export function getTwilioMessagesEndpoint(config: TwilioMessagingConfig) {
  return `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
}

export function getTwilioAuthorizationHeader(config: TwilioMessagingConfig) {
  const username = config.apiKey || config.accountSid;
  const password = config.apiSecret || config.authToken;

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export function buildTwilioMessagePayload(config: TwilioMessagingConfig, input: TwilioSendPayloadInput) {
  const payload = new URLSearchParams();

  payload.set("To", input.to);
  payload.set("Body", input.body);

  if (config.messagingServiceSid) {
    payload.set("MessagingServiceSid", config.messagingServiceSid);
  } else {
    payload.set("From", config.phoneNumber);
  }

  if (input.mediaUrl) {
    payload.set("MediaUrl", input.mediaUrl);
  }

  const statusCallbackUrl = input.statusCallbackUrl ?? getTwilioWebhookUrl(config, TWILIO_STATUS_WEBHOOK_PATH);

  if (statusCallbackUrl) {
    payload.set("StatusCallback", statusCallbackUrl);
  }

  return payload;
}

export function buildTwilioRequestSignature(url: string, params: TwilioWebhookParams, authToken: string) {
  let payload = url;

  for (const key of Object.keys(params).sort((left, right) => left.localeCompare(right))) {
    for (const value of normalizeWebhookValue(params[key])) {
      payload += `${key}${value}`;
    }
  }

  return createHmac("sha1", authToken).update(payload, "utf8").digest("base64");
}

export function validateTwilioRequestSignature(input: {
  authToken: string;
  params: TwilioWebhookParams;
  signature: string | undefined;
  url: string;
}) {
  if (!input.signature || !input.authToken) {
    return false;
  }

  const expectedSignature = buildTwilioRequestSignature(input.url, input.params, input.authToken);
  const actualBuffer = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}