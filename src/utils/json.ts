import { logError } from "./logger";

export function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    logError("Failed to parse JSON:", err);
    return null;
  }
}
