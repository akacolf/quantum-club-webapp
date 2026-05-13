// Pre-LLM filter: cheap regex checks that catch noise the LLM would otherwise
// waste Fluid CPU on (greetings, emoji reactions, acks, pure numbers).
//
// Returns:
//   { skip: false }                       → continue to LLM intent
//   { skip: true }                        → silently 200 OK, no reply
//   { skip: true, reply: "…" }            → reply with canned text, no LLM

export type SkipResult =
  | { skip: false }
  | { skip: true; reply?: string };

const GREETINGS = new Set([
  "hi", "hey", "hello", "yo", "sup", "wassup", "whatsup",
  "gm", "gn", "good morning", "good night", "good evening", "good afternoon",
  "hola", "ola", "ciao", "salut",
]);

const ACKS = new Set([
  "ok", "okay", "k", "kk", "kkk",
  "thanks", "thank you", "thx", "ty",
  "lol", "lmao", "haha", "hehe", "rofl",
  "cool", "nice", "great", "awesome", "based", "true", "fr", "facts",
  "yes", "no", "yep", "nope", "yup", "ye", "nah",
  "mhm", "hm", "hmm",
]);

// Matches messages composed entirely of emoji + whitespace.
// \p{Extended_Pictographic} is the closest Unicode class to "what humans call emoji".
// Includes ZWJ (200D), variation selector (FE0F), and skin-tone modifiers so
// multi-codepoint emoji like 👨‍👩‍👧 or 👍🏽 are detected.
const EMOJI_ONLY =
  /^[\p{Extended_Pictographic}\u{200D}\u{FE0F}\u{1F3FB}-\u{1F3FF}\s]+$/u;

// Matches pure numbers, with optional decimal and units like "k", "m", "$"
const PURE_NUMBER = /^[$€£]?\s*\d+(\.\d+)?\s*[kmbt]?$/i;

const GREETING_REPLY =
  "Hey! Type `help` to see what I can do — try `price TON`, `route 10 TON USDT`, or `link` to connect your wallet.";

/**
 * Decide whether a free-text message should bypass the LLM intent layer.
 * Runs *before* any LLM call to protect Fluid CPU budget.
 */
export function preLLMCheck(text: string): SkipResult {
  const trimmed = text.trim().toLowerCase();

  if (!trimmed) return { skip: true };
  if (trimmed.length > 200) return { skip: false };

  if (GREETINGS.has(trimmed)) return { skip: true, reply: GREETING_REPLY };
  if (ACKS.has(trimmed)) return { skip: true };

  if (EMOJI_ONLY.test(text.trim())) return { skip: true };
  if (PURE_NUMBER.test(trimmed)) return { skip: true };

  // Single-char and 2-char garbage messages aren't worth an LLM call.
  if (trimmed.length < 3 && !/^[a-z]/.test(trimmed)) return { skip: true };

  return { skip: false };
}
