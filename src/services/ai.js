const STORAGE_PROVIDER = "inkflow_ai_provider";
const STORAGE_OPENAI_KEY = "inkflow_ai_openai_key";
const STORAGE_GEMINI_KEY = "inkflow_ai_gemini_key";
const STORAGE_MODEL_PREFIX = "inkflow_ai_model_";

/** Feature tiers: light = cheap/fast; advanced = better model for complex tasks. */
export const TIERS = Object.freeze({ LIGHT: "light", ADVANCED: "advanced" });

/** Global quality bias: faster keeps defaults, best upgrades eligible LIGHT contexts to ADVANCED. */
export const QUALITY_BIAS = Object.freeze({ FASTER: "faster", BEST: "best" });
const STORAGE_QUALITY_BIAS = "inkflow_quality_bias";

export function getQualityBias() {
  return localStorage.getItem(STORAGE_QUALITY_BIAS) || QUALITY_BIAS.FASTER;
}
export function setQualityBias(bias) {
  if (bias === QUALITY_BIAS.BEST) localStorage.setItem(STORAGE_QUALITY_BIAS, bias);
  else localStorage.removeItem(STORAGE_QUALITY_BIAS);
}

/**
 * Named usage contexts. Each maps to a base tier; the quality bias may upgrade
 * LIGHT contexts to ADVANCED (except CHAT, which stays LIGHT regardless of cost).
 */
export const CONTEXTS = Object.freeze({
  CHAT:                    "chat",                  // casual otter conversation → always LIGHT
  CHAT_WITH_TOOLS:         "chat_with_tools",       // otter actions / tool use → always ADVANCED
  EXPAND_SHORT:            "expand_short",          // quick field expansion → LIGHT (upgradeable)
  OUTLINE_DRAFT_FULL:      "outline_draft_full",    // full story outline → always ADVANCED
  OUTLINE_DRAFT_SECTION:   "outline_draft_section", // single spine section → LIGHT (upgradeable)
  SCENE_PROSE:             "scene_prose",           // scene prose generation → LIGHT (upgradeable)
  CONSISTENCY:             "consistency",           // fact extraction + check → LIGHT (upgradeable)
});

const CONTEXT_BASE_TIER = Object.freeze({
  [CONTEXTS.CHAT]:                  TIERS.LIGHT,
  [CONTEXTS.CHAT_WITH_TOOLS]:       TIERS.ADVANCED,
  [CONTEXTS.EXPAND_SHORT]:          TIERS.LIGHT,
  [CONTEXTS.OUTLINE_DRAFT_FULL]:    TIERS.ADVANCED,
  [CONTEXTS.OUTLINE_DRAFT_SECTION]: TIERS.LIGHT,
  [CONTEXTS.SCENE_PROSE]:           TIERS.LIGHT,
  [CONTEXTS.CONSISTENCY]:           TIERS.LIGHT,
});

// These contexts always use their base tier regardless of the quality bias.
const BIAS_LOCKED = new Set([CONTEXTS.CHAT, CONTEXTS.CHAT_WITH_TOOLS, CONTEXTS.OUTLINE_DRAFT_FULL]);

/**
 * Resolve a usage context to a tier, applying the current quality bias.
 * In "best" mode, LIGHT contexts that are not bias-locked are upgraded to ADVANCED.
 * @param {string} context - one of CONTEXTS.*
 * @returns {"light"|"advanced"}
 */
export function tierForContext(context) {
  const base = CONTEXT_BASE_TIER[context] ?? TIERS.LIGHT;
  if (BIAS_LOCKED.has(context)) return base;
  if (getQualityBias() === QUALITY_BIAS.BEST) return TIERS.ADVANCED;
  return base;
}

/** Default models per provider per tier. Light = fast/cheap; advanced = better when API supports it. */
const DEFAULT_MODELS = Object.freeze({
  gemini: {
    light: "gemini-2.5-flash",
    advanced: "gemini-2.5-pro",
  },
  openai: {
    light: "gpt-4o-mini",
    advanced: "gpt-4o",
  },
});

/**
 * Ordered fallback chains: when a model fails with a retryable error (429 / 503 / 404)
 * we walk down the chain until one succeeds or there are no more options.
 */
const GEMINI_FALLBACK_CHAIN = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const OPENAI_FALLBACK_CHAIN = ["gpt-4o", "gpt-4o-mini"];

/** Preset options for UI dropdowns (id = model id sent to API). Order: default first, then by tier. */
export const GEMINI_MODEL_OPTIONS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (default, 5 RPM / 250K TPM)" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite (10 RPM / 250K TPM)" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.0-flash", name: "Gemini 2 Flash" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
];
export const OPENAI_MODEL_OPTIONS = [
  { id: "gpt-4o-mini", name: "GPT-4o mini (fast, cheap)" },
  { id: "gpt-4o", name: "GPT-4o" },
];

export const PROVIDERS = [
  { id: "openai", name: "OpenAI (GPT)", placeholder: "sk-..." },
  { id: "gemini", name: "Google Gemini", placeholder: "AIza..." },
];

export function getProvider() {
  return localStorage.getItem(STORAGE_PROVIDER) || "gemini";
}

export function setProvider(id) {
  localStorage.setItem(STORAGE_PROVIDER, id);
}

export function getApiKey() {
  const provider = getProvider();
  const key =
    provider === "gemini"
      ? localStorage.getItem(STORAGE_GEMINI_KEY) || ""
      : localStorage.getItem(STORAGE_OPENAI_KEY) || "";
  return key;
}

export function setApiKey(key) {
  const provider = getProvider();
  if (provider === "gemini") {
    if (key) localStorage.setItem(STORAGE_GEMINI_KEY, key);
    else localStorage.removeItem(STORAGE_GEMINI_KEY);
  } else {
    if (key) localStorage.setItem(STORAGE_OPENAI_KEY, key);
    else localStorage.removeItem(STORAGE_OPENAI_KEY);
  }
}

/**
 * Get model id for a provider and tier. Uses saved override or default.
 * @param {"gemini"|"openai"} provider
 * @param {"light"|"advanced"} tier
 */
export function getModel(provider, tier) {
  const key = `${STORAGE_MODEL_PREFIX}${provider}_${tier}`;
  const saved = localStorage.getItem(key);
  if (saved?.trim()) return saved.trim();
  return DEFAULT_MODELS[provider]?.[tier] ?? DEFAULT_MODELS[provider]?.light ?? "gemini-1.5-flash";
}

/**
 * Save model override for a provider and tier.
 * @param {"gemini"|"openai"} provider
 * @param {"light"|"advanced"} tier
 * @param {string} modelId
 */
export function setModel(provider, tier, modelId) {
  const key = `${STORAGE_MODEL_PREFIX}${provider}_${tier}`;
  if (modelId?.trim()) localStorage.setItem(key, modelId.trim());
  else localStorage.removeItem(key);
}

export const LOCALE_TO_LANGUAGE = Object.freeze({
  en: "English",
  zh: "Chinese (中文)",
  es: "Spanish (Español)",
  fr: "French (Français)",
});

/** Strong language instruction so the model never switches language. */
export function getLanguageRule(locale) {
  const lang = LOCALE_TO_LANGUAGE[locale] || "English";
  if (locale === "zh") {
    return `CRITICAL: You must write the entire response in Chinese only (中文). Do not use English or any other language. 请只用中文回复。`;
  }
  return `CRITICAL: You must write the entire response in ${lang} only. Do not use any other language.`;
}

function buildPrompt(fieldName, storyBlurb, ideasBlurb, charsBlurb, briefText, outputLocale, extraContext) {
  const lang = LOCALE_TO_LANGUAGE[outputLocale] || "English";
  const languageRule = getLanguageRule(outputLocale);
  const extra = extraContext && extraContext.trim() ? `\n\nExtra guidance:\n${extraContext.trim()}` : "";
  const systemPrompt = `You are a fiction writing assistant. The writer is using the Snowflake Method. Keep all output in Snowflake style: simple, clear, structural—no artistic or flowery descriptions, no purple prose. The text must relate to and stay consistent with the story spine, idea cards, and characters provided. When extra guidance includes an existing chapters or scenes list, use it only for consistency—do not repeat or contradict them. Your expansion must be one complete, finished unit: if the field is a Setup, write a full setup; if it is a Disaster, write a full disaster beat; if it is a scene or character field, write a complete beat or description. The result must be immediately usable for story design. Never stop mid-sentence or mid-thought. ${languageRule} Output only the expanded text, no preamble, no "Here is...", no quotes around the result.`;

  const isEmpty = !(briefText && briefText.trim());
  const userPrompt = isEmpty
    ? `The user has left this field empty. Generate content for the field "${fieldName}" based only on the story, ideas, and characters below. Your text must continue the same narrative (same characters, setting, and events already described). Do not invent a new story or generic filler. Use the same language as the existing story content when possible. ${languageRule}

Story context:
${storyBlurb || "(Not filled yet)"}${extra}

Idea cards:
${ideasBlurb}

Characters:
${charsBlurb}

Generate appropriate content for "${fieldName}" (output only the text, in the required language):`
    : `Current field: "${fieldName}".

Story context (use this to keep the expansion consistent with the plot):
${storyBlurb || "(Not filled yet)"}

Idea cards (weave in relevant ideas from these when they fit):
${ideasBlurb}

Characters (reference names and traits so the expansion fits the cast):
${charsBlurb}

Brief text to expand:
${briefText}

Expanded version (one complete "${fieldName}" only; no mid-sentence cutoff; ${languageRule} output only the text):`;

  return { systemPrompt, userPrompt };
}

/**
 * Expand brief text using context (story, ideas, characters).
 * Supports OpenAI and Google Gemini. Returns expanded text or throws.
 */
const STORAGE_LOCALE = "inkflow_locale";

export async function expandWithAi({
  currentText,
  fieldName,
  story = {},
  ideas = [],
  characters = [],
  locale: localeParam,
  extraContext = "",
}) {
  const provider = getProvider();
  const apiKey = getApiKey();
  if (!apiKey?.trim()) {
    throw new Error(
      `Add your ${provider === "gemini" ? "Gemini" : "OpenAI"} API key in Export → AI settings to use this feature.`
    );
  }

  const outputLocale = localeParam && LOCALE_TO_LANGUAGE[localeParam] ? localeParam : (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_LOCALE) : null) || "en";

  // If user typed /ai, use the rest as the brief idea
  const briefText = (currentText || "")
    .replace(/\s*\/ai\s*$/i, "")
    .replace(/^\s*\/ai\s*/, "")
    .trim();

  const storyBlurb = [
    story.oneSentence && `One-sentence: ${story.oneSentence}`,
    story.setup && `Setup: ${story.setup}`,
    story.disaster1 && `Disaster 1: ${story.disaster1}`,
    story.disaster2 && `Disaster 2: ${story.disaster2}`,
    story.disaster3 && `Disaster 3: ${story.disaster3}`,
    story.ending && `Ending: ${story.ending}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ideasBlurb =
    ideas.length > 0
      ? ideas
          .map(
            (i) =>
              `- [${i.type}] ${i.title || "Untitled"}: ${(i.body || "").slice(0, 200)}`
          )
          .join("\n")
      : "(No idea cards yet)";

  const charsBlurb =
    characters.length > 0
      ? characters
          .map(
            (c) =>
              `- ${c.name || "Unnamed"}: ${(c.oneSentence || "").slice(0, 120)}`
          )
          .join("\n")
      : "(No characters yet)";

  const { systemPrompt, userPrompt } = buildPrompt(
    fieldName,
    storyBlurb,
    ideasBlurb,
    charsBlurb,
    briefText,
    outputLocale,
    extraContext
  );

  // Quick expand uses the EXPAND_SHORT context (upgrades to ADVANCED in "best" mode).
  const tier = tierForContext(CONTEXTS.EXPAND_SHORT);
  const expandMaxTokens = 1024;
  if (provider === "gemini") {
    return callGemini(apiKey.trim(), systemPrompt, userPrompt, { tier, maxTokens: expandMaxTokens });
  }
  return callOpenAI(apiKey.trim(), systemPrompt, userPrompt, { tier, maxTokens: expandMaxTokens });
}

/**
 * Single completion with custom prompts. Used by generation and consistency services.
 * @param {{ systemPrompt: string, userPrompt: string, tier?: string, maxTokens?: number }} opts
 * @returns {Promise<string>}
 */
export async function completeWithAi({ systemPrompt, userPrompt, tier = TIERS.LIGHT, maxTokens = 1024 }) {
  const provider = getProvider();
  const apiKey = getApiKey();
  if (!apiKey?.trim()) {
    throw new Error(
      `Add your ${provider === "gemini" ? "Gemini" : "OpenAI"} API key in Export → AI settings to use this feature.`
    );
  }
  if (provider === "gemini") {
    return callGemini(apiKey.trim(), systemPrompt, userPrompt, { tier, maxTokens });
  }
  return callOpenAI(apiKey.trim(), systemPrompt, userPrompt, { tier, maxTokens });
}

async function callOpenAI(apiKey, systemPrompt, userPrompt, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const maxTokens = options.maxTokens ?? (tier === TIERS.ADVANCED ? 2048 : 500);
  const model = options._model ?? getModel("openai", tier);

  let res;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.6,
      }),
    });
  } catch {
    throw new Error("Network error — check your internet connection and try again.");
  }

  if (!res.ok) {
    // Auto-fallback on rate limit or service error
    if (res.status === 429 || res.status === 503) {
      const idx = OPENAI_FALLBACK_CHAIN.indexOf(model);
      if (idx >= 0 && idx < OPENAI_FALLBACK_CHAIN.length - 1) {
        return callOpenAI(apiKey, systemPrompt, userPrompt, { ...options, _model: OPENAI_FALLBACK_CHAIN[idx + 1] });
      }
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(friendlyOpenAIError(err?.error?.message || `API error: ${res.status}`, res.status));
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned an empty response.");
  return content;
}

async function callGemini(apiKey, systemPrompt, userPrompt, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const model = options._model ?? getModel("gemini", tier);
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const maxOutputTokens = options.maxTokens ?? (tier === TIERS.ADVANCED ? 2048 : 500);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens, temperature: 0.6 },
      }),
    });
  } catch {
    throw new Error("Network error — check your internet connection and try again.");
  }

  if (!res.ok) {
    // Auto-fallback on rate limit, quota, service errors, or model not found
    if (res.status === 429 || res.status === 503 || res.status === 404) {
      const idx = GEMINI_FALLBACK_CHAIN.indexOf(model);
      if (idx >= 0 && idx < GEMINI_FALLBACK_CHAIN.length - 1) {
        return callGemini(apiKey, systemPrompt, userPrompt, { ...options, _model: GEMINI_FALLBACK_CHAIN[idx + 1] });
      }
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(friendlyGeminiError(err?.error?.message || err?.message || `API error: ${res.status}`, res.status));
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const reason = candidate?.finishReason || "Unknown";
    if (reason === "SAFETY") throw new Error("Response blocked by Gemini safety filters. Try rephrasing your prompt.");
    if (reason === "MAX_TOKENS") throw new Error("Response was cut off (token limit). Try simplifying your prompt.");
    throw new Error(`Empty response from Gemini (${reason}). Try again.`);
  }
  return text;
}

/**
 * Multi-turn chat completion. Maintains conversation history for both providers.
 * @param {{ messages: {role:'user'|'assistant', content:string}[], systemPrompt: string, tier?: string, maxTokens?: number }}
 * @returns {Promise<string>}
 */
export async function chatWithAi({ messages, systemPrompt, tier = TIERS.LIGHT, maxTokens = 1024 }) {
  const provider = getProvider();
  const apiKey = getApiKey();
  if (!apiKey?.trim()) {
    throw new Error(
      `Add your ${provider === "gemini" ? "Gemini" : "OpenAI"} API key in Settings to chat.`
    );
  }
  if (provider === "gemini") {
    return chatGemini(apiKey.trim(), systemPrompt, messages, { tier, maxTokens });
  }
  return chatOpenAIChat(apiKey.trim(), systemPrompt, messages, { tier, maxTokens });
}

async function chatOpenAIChat(apiKey, systemPrompt, messages, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const maxTokens = options.maxTokens ?? 1024;
  const model = options._model ?? getModel("openai", tier);

  let res;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: maxTokens,
        temperature: 0.8,
      }),
    });
  } catch {
    throw new Error("Network error — check your internet connection and try again.");
  }

  if (!res.ok) {
    if (res.status === 429 || res.status === 503) {
      const idx = OPENAI_FALLBACK_CHAIN.indexOf(model);
      if (idx >= 0 && idx < OPENAI_FALLBACK_CHAIN.length - 1) {
        return chatOpenAIChat(apiKey, systemPrompt, messages, { ...options, _model: OPENAI_FALLBACK_CHAIN[idx + 1] });
      }
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(friendlyOpenAIError(err?.error?.message || `API error: ${res.status}`, res.status));
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned an empty response.");
  return content;
}

async function chatGemini(apiKey, systemPrompt, messages, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const model = options._model ?? getModel("gemini", tier);
  const maxOutputTokens = options.maxTokens ?? 1024;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens, temperature: 0.8 },
      }),
    });
  } catch {
    throw new Error("Network error — check your internet connection and try again.");
  }

  if (!res.ok) {
    if (res.status === 429 || res.status === 503 || res.status === 404) {
      const idx = GEMINI_FALLBACK_CHAIN.indexOf(model);
      if (idx >= 0 && idx < GEMINI_FALLBACK_CHAIN.length - 1) {
        return chatGemini(apiKey, systemPrompt, messages, { ...options, _model: GEMINI_FALLBACK_CHAIN[idx + 1] });
      }
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(friendlyGeminiError(err?.error?.message || `API error: ${res.status}`, res.status));
  }
  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const reason = candidate?.finishReason || "Unknown";
    if (reason === "SAFETY") throw new Error("Response blocked by safety filters. Try rephrasing.");
    if (reason === "MAX_TOKENS") throw new Error("Response was cut off (token limit). Try a shorter message.");
    throw new Error(`Empty response from Gemini (${reason}). Try again.`);
  }
  return text;
}

/**
 * Test if the given (or saved) API key works. Uses minimal request.
 * @param {string} [key] - Key to test; if omitted uses saved key for current provider
 * @param {string} [providerId] - "openai" | "gemini"; if omitted uses getProvider()
 */
export async function testApiKey(key, providerId) {
  const provider = providerId || getProvider();
  const apiKey = (key && key.trim()) || getApiKey().trim();
  if (!apiKey) {
    throw new Error("Enter an API key first, then click Test.");
  }

  if (provider === "gemini") {
    const model = getModel("gemini", TIERS.LIGHT);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Reply with exactly: OK" }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || err?.message || `HTTP ${res.status}`;
      throw new Error(friendlyGeminiError(msg, res.status));
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      const reason = data.candidates?.[0]?.finishReason || "Unknown";
      throw new Error(`Gemini returned no text (${reason}). Check quota or model access.`);
    }
    return true;
  }

  // OpenAI
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      max_tokens: 10,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || err?.message || `HTTP ${res.status}`;
    throw new Error(friendlyOpenAIError(msg, res.status));
  }
  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error("OpenAI returned an empty response.");
  }
  return true;
}

function friendlyOpenAIError(msg, status) {
  if (status === 401 || (typeof msg === "string" && (msg.includes("invalid") || msg.includes("401") || msg.includes("Incorrect API key"))))
    return "Invalid API key. Check your OpenAI API key in Settings.";
  if (status === 429 || (typeof msg === "string" && (msg.includes("429") || msg.includes("rate limit") || msg.includes("quota"))))
    return "Rate limit or quota exceeded (OpenAI). Try again in a moment, or upgrade your plan.";
  if (status === 403 || (typeof msg === "string" && (msg.includes("403") || msg.includes("permission"))))
    return "Access denied. Check your API key and permissions.";
  if (status === 503 || (typeof msg === "string" && msg.includes("503")))
    return "OpenAI service is temporarily unavailable. Try again in a moment.";
  if (typeof msg !== "string") return "API request failed.";
  return msg;
}

function friendlyGeminiError(msg, status) {
  if (status === 404 || (typeof msg === "string" && (msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("not found"))))
    return "Model not found. All fallback models were tried — check your quota or try again later.";
  if (typeof msg !== "string") return "API request failed.";
  if (msg.includes("API_KEY_INVALID") || msg.includes("invalid") || msg.includes("401"))
    return "Invalid API key. Get a key at Google AI Studio: aistudio.google.com/app/apikey";
  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate") || msg.includes("RESOURCE_EXHAUSTED"))
    return "Rate limit or quota exhausted (Gemini). All fallback models were tried — wait a moment and try again.";
  if (msg.includes("403") || msg.includes("permission"))
    return "Access denied. Check that the Gemini API is enabled for your key.";
  if (msg.includes("503") || msg.includes("unavailable"))
    return "Gemini service is temporarily unavailable. Try again in a moment.";
  return msg;
}

/**
 * Classify an error thrown by the AI service into a short category string.
 * Use this in UI components to show user-friendly, context-appropriate messages.
 * @param {Error|unknown} error
 * @returns {"rate_limit"|"invalid_key"|"access_denied"|"network"|"empty"|"service_down"|"unknown"}
 */
export function classifyAiError(error) {
  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed"))
    return "network";
  if (msg.includes("invalid api key") || msg.includes("api_key_invalid") || msg.includes("incorrect api key"))
    return "invalid_key";
  if (msg.includes("access denied") || msg.includes("permission") || msg.includes("403"))
    return "access_denied";
  if (msg.includes("rate limit") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("429"))
    return "rate_limit";
  if (msg.includes("503") || msg.includes("unavailable") || msg.includes("temporarily"))
    return "service_down";
  if (msg.includes("safety"))
    return "safety";
  if (msg.includes("cut off") || msg.includes("token limit") || msg.includes("max_tokens"))
    return "token_limit";
  if (msg.includes("empty response") || msg.includes("blank response"))
    return "empty";
  return "unknown";
}
