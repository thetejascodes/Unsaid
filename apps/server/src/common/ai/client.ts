import OpenAI from "openai";
import config from "../config/index.js";

export const aiClient = new OpenAI({
  apiKey: config.ai.apiKey,
  baseURL: config.ai.baseUrl,
});