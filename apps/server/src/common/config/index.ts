function optional(key: string, fallback: string) {
  return process.env[key] ?? fallback;
}

function required(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error("Missing required env var: " + key);
  }
  return value;
}

const config = {
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
    refreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "7d"),
  },
  database: {
    url: required("DATABASE_URL"),
  },
  valkey: {
    url: required("VALKEY_URL"),
  },
  port: Number(optional("PORT", "8000")),
  twilio: {
    accountSid: optional("TWILIO_ACCOUNT_SID", ""),
    apiKeySid: optional("TWILIO_API_KEY_SID", ""),
    apiKeySecret: optional("TWILIO_API_KEY_SECRET", ""),
    fromNumber: optional("TWILIO_FROM_NUMBER", ""),
    toNumber: optional("TWILIO_TO_NUMBER", ""),
  },
  otpStubMode: optional("OTP_STUB_MODE", "true"),
  ai: {
    apiKey: required("OPENROUTER_API_KEY"),
    moderationModel: optional("MODERATION_MODEL", "meta-llama/llama-3.1-8b-instruct"),
    icebreakerModel: optional("ICEBREAKER_MODEL", "meta-llama/llama-3.1-8b-instruct"),
    baseUrl: optional("AI_BASE_URL", "https://openrouter.ai/api/v1"),
  },
};
export default config;