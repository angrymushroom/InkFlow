const STORAGE_PROVIDER    = "inkflow_ai_provider";
const STORAGE_GEMINI_KEY  = "inkflow_ai_gemini_key";   // kept for backward compat
const STORAGE_OPENAI_KEY  = "inkflow_ai_openai_key";   // kept for backward compat
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
  CHAT:                    "chat",
  CHAT_WITH_TOOLS:         "chat_with_tools",
  EXPAND_SHORT:            "expand_short",
  OUTLINE_DRAFT_FULL:      "outline_draft_full",
  OUTLINE_DRAFT_SECTION:   "outline_draft_section",
  SCENE_PROSE:             "scene_prose",
  CONSISTENCY:             "consistency",
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

const BIAS_LOCKED = new Set([CONTEXTS.CHAT, CONTEXTS.CHAT_WITH_TOOLS, CONTEXTS.OUTLINE_DRAFT_FULL]);

export function tierForContext(context) {
  const base = CONTEXT_BASE_TIER[context] ?? TIERS.LIGHT;
  if (BIAS_LOCKED.has(context)) return base;
  if (getQualityBias() === QUALITY_BIAS.BEST) return TIERS.ADVANCED;
  return base;
}

// ─── Provider registry ────────────────────────────────────────────────────────
//
// format: "openai"  → uses OpenAI-compatible Chat Completions API
//         "gemini"  → uses Google Generative Language API (different format)
//
// baseUrl: base URL for OpenAI-compatible providers (without /v1). Gemini ignores this.
// fallbackChain: ordered list of model ids to try when a request fails with 429/503/404.
// modelOptions: preset list shown in any future model-picker UI.

export const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    format: "gemini",
    placeholder: "AIza...",
    keyHelpUrl: "https://aistudio.google.com/app/apikey",
    keyHelpLabel: "Google AI Studio",
    defaultModels: { light: "gemini-2.5-flash", advanced: "gemini-2.5-pro" },
    fallbackChain: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ],
    modelOptions: [
      { id: "gemini-2.5-flash",      name: "Gemini 2.5 Flash (default)" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
      { id: "gemini-2.5-pro",        name: "Gemini 2.5 Pro" },
      { id: "gemini-2.0-flash",      name: "Gemini 2 Flash" },
      { id: "gemini-1.5-flash",      name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro",        name: "Gemini 1.5 Pro" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI (GPT)",
    format: "openai",
    baseUrl: "https://api.openai.com",
    placeholder: "sk-...",
    keyHelpUrl: "https://platform.openai.com/api-keys",
    keyHelpLabel: "OpenAI Platform",
    defaultModels: { light: "gpt-4o-mini", advanced: "gpt-4o" },
    fallbackChain: ["gpt-4o", "gpt-4o-mini"],
    modelOptions: [
      { id: "gpt-4o-mini", name: "GPT-4o mini (fast, cheap)" },
      { id: "gpt-4o",      name: "GPT-4o" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    format: "openai",
    baseUrl: "https://api.deepseek.com",
    placeholder: "sk-...",
    keyHelpUrl: "https://platform.deepseek.com/api_keys",
    keyHelpLabel: "DeepSeek Platform",
    defaultModels: { light: "deepseek-chat", advanced: "deepseek-chat" },
    fallbackChain: ["deepseek-chat"],
    modelOptions: [
      { id: "deepseek-chat",     name: "DeepSeek V3 (fast, cheap)" },
      { id: "deepseek-reasoner", name: "DeepSeek R1 (reasoning)" },
    ],
  },
  {
    id: "qwen",
    name: "通义千问 (Qwen)",
    format: "openai",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
    placeholder: "sk-...",
    keyHelpUrl: "https://bailian.console.aliyun.com/",
    keyHelpLabel: "阿里云百炼",
    defaultModels: { light: "qwen-plus", advanced: "qwen-max" },
    fallbackChain: ["qwen-max", "qwen-plus", "qwen-turbo"],
    modelOptions: [
      { id: "qwen-turbo",        name: "Qwen Turbo (fastest)" },
      { id: "qwen-plus",         name: "Qwen Plus (balanced, default)" },
      { id: "qwen-max",          name: "Qwen Max (best quality)" },
      { id: "qwen3-235b-a22b",   name: "Qwen3 235B" },
    ],
  },
  {
    id: "minimax",
    name: "MiniMax",
    format: "openai",
    baseUrl: "https://api.minimax.chat",
    placeholder: "...",
    keyHelpUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
    keyHelpLabel: "MiniMax Platform",
    defaultModels: { light: "MiniMax-Text-01", advanced: "MiniMax-Text-01" },
    fallbackChain: ["MiniMax-Text-01", "abab6.5s-chat"],
    modelOptions: [
      { id: "MiniMax-Text-01", name: "MiniMax Text 01 (default)" },
      { id: "abab6.5s-chat",   name: "ABAB 6.5s (fast)" },
    ],
  },
];

// Keep named exports for any code that imported these directly from ai.js
export const GEMINI_MODEL_OPTIONS = PROVIDERS.find((p) => p.id === "gemini").modelOptions;
export const OPENAI_MODEL_OPTIONS  = PROVIDERS.find((p) => p.id === "openai").modelOptions;

// ─── Provider / key helpers ──────────────────────────────────────────────────

export function getProvider() {
  return localStorage.getItem(STORAGE_PROVIDER) || "gemini";
}

export function setProvider(id) {
  localStorage.setItem(STORAGE_PROVIDER, id);
}

/** Return the localStorage key for a given provider's API key. */
function getKeyStorageKey(providerId) {
  // Preserve existing localStorage keys so existing users don't lose their saved keys.
  if (providerId === "gemini") return STORAGE_GEMINI_KEY;
  if (providerId === "openai") return STORAGE_OPENAI_KEY;
  return `inkflow_ai_key_${providerId}`;
}

/** Get the saved API key for a provider (defaults to current provider). */
export function getApiKey(providerId) {
  const id = providerId ?? getProvider();
  return localStorage.getItem(getKeyStorageKey(id)) || "";
}

/** Save the API key for a provider (defaults to current provider). */
export function setApiKey(key, providerId) {
  const id = providerId ?? getProvider();
  const storageKey = getKeyStorageKey(id);
  if (key) localStorage.setItem(storageKey, key);
  else localStorage.removeItem(storageKey);
}

/**
 * Get model id for a provider and tier. Uses saved override or provider default.
 * @param {string} providerId
 * @param {"light"|"advanced"} tier
 */
export function getModel(providerId, tier) {
  const key = `${STORAGE_MODEL_PREFIX}${providerId}_${tier}`;
  const saved = localStorage.getItem(key);
  if (saved?.trim()) return saved.trim();
  const config = PROVIDERS.find((p) => p.id === providerId);
  return config?.defaultModels?.[tier] ?? config?.defaultModels?.light ?? "gemini-2.5-flash";
}

/**
 * Save model override for a provider and tier.
 */
export function setModel(providerId, tier, modelId) {
  const key = `${STORAGE_MODEL_PREFIX}${providerId}_${tier}`;
  if (modelId?.trim()) localStorage.setItem(key, modelId.trim());
  else localStorage.removeItem(key);
}

// ─── Language helpers (unchanged) ────────────────────────────────────────────

export const LOCALE_TO_LANGUAGE = Object.freeze({
  en: "English",
  zh: "Chinese (中文)",
  es: "Spanish (Español)",
  fr: "French (Français)",
});

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

// ─── Core call functions ──────────────────────────────────────────────────────

/**
 * Generic OpenAI-compatible completion. Works with any provider that speaks
 * the /v1/chat/completions format (OpenAI, DeepSeek, Qwen, MiniMax, etc.).
 *
 * @param {string} baseUrl  - Provider base URL without /v1 (e.g. "https://api.deepseek.com")
 * @param {string} apiKey
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} options  - tier, maxTokens, _model (fallback override), _fallbackChain
 */
async function callOpenAICompat(baseUrl, apiKey, systemPrompt, userPrompt, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const maxTokens = options.maxTokens ?? (tier === TIERS.ADVANCED ? 2048 : 500);
  const fallbackChain = options._fallbackChain ?? [];
  const model = options._model ?? fallbackChain[0] ?? "gpt-4o-mini";

  let res;
  try {
    res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.6,
      }),
    });
  } catch {
    throw new Error("Network error — check your internet connection and try again.");
  }

  if (!res.ok) {
    if (res.status === 429 || res.status === 503) {
      const idx = fallbackChain.indexOf(model);
      if (idx >= 0 && idx < fallbackChain.length - 1) {
        return callOpenAICompat(baseUrl, apiKey, systemPrompt, userPrompt, {
          ...options, _model: fallbackChain[idx + 1],
        });
      }
    }
    const err = await res.json().catch(() => ({}));
    const errMsg = err?.error?.message || `API error: ${res.status}`;
    if (res.status === 400) {
      const lower = errMsg.toLowerCase();
      if (lower.includes("context length") || lower.includes("maximum context") || lower.includes("too many tokens")) {
        throw new Error(`Input too long for model — ${errMsg}`);
      }
    }
    throw new Error(friendlyOpenAIError(errMsg, res.status));
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("API returned an empty response.");
  return content;
}

/**
 * Multi-turn OpenAI-compatible chat. Same base URL abstraction as callOpenAICompat.
 */
async function chatOpenAICompat(baseUrl, apiKey, systemPrompt, messages, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const maxTokens = options.maxTokens ?? 1024;
  const fallbackChain = options._fallbackChain ?? [];
  const model = options._model ?? fallbackChain[0] ?? "gpt-4o-mini";

  let res;
  try {
    res = await fetch(`${baseUrl}/v1/chat/completions`, {
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
      const idx = fallbackChain.indexOf(model);
      if (idx >= 0 && idx < fallbackChain.length - 1) {
        return chatOpenAICompat(baseUrl, apiKey, systemPrompt, messages, {
          ...options, _model: fallbackChain[idx + 1],
        });
      }
    }
    const err = await res.json().catch(() => ({}));
    const errMsg = err?.error?.message || `API error: ${res.status}`;
    if (res.status === 400) {
      const lower = errMsg.toLowerCase();
      if (lower.includes("context length") || lower.includes("maximum context") || lower.includes("too many tokens")) {
        throw new Error(`Input too long for model — ${errMsg}`);
      }
    }
    throw new Error(friendlyOpenAIError(errMsg, res.status));
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("API returned an empty response.");
  return content;
}

async function callGemini(apiKey, systemPrompt, userPrompt, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const geminiConfig = PROVIDERS.find((p) => p.id === "gemini");
  const fallbackChain = geminiConfig?.fallbackChain ?? [];
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
    if (res.status === 429 || res.status === 503 || res.status === 404) {
      const idx = fallbackChain.indexOf(model);
      if (idx >= 0 && idx < fallbackChain.length - 1) {
        return callGemini(apiKey, systemPrompt, userPrompt, { ...options, _model: fallbackChain[idx + 1] });
      }
    }
    const err = await res.json().catch(() => ({}));
    const errMsg = err?.error?.message || err?.message || `API error: ${res.status}`;
    if (res.status === 400) {
      const lower = errMsg.toLowerCase();
      if (lower.includes("token") || lower.includes("too large") || lower.includes("payload") || (lower.includes("exceeds") && lower.includes("limit"))) {
        throw new Error(`Input too long for model — ${errMsg}`);
      }
    }
    throw new Error(friendlyGeminiError(errMsg, res.status));
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const reason = candidate?.finishReason || "Unknown";
    if (reason === "SAFETY") throw new Error("Response blocked by Gemini safety filters. Try rephrasing your prompt.");
    if (reason === "MAX_TOKENS") throw new Error("Response was cut off (output too long). Try simplifying your prompt.");
    throw new Error(`Empty response from Gemini (${reason}). Try again.`);
  }
  return text;
}

async function chatGemini(apiKey, systemPrompt, messages, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const geminiConfig = PROVIDERS.find((p) => p.id === "gemini");
  const fallbackChain = geminiConfig?.fallbackChain ?? [];
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
      const idx = fallbackChain.indexOf(model);
      if (idx >= 0 && idx < fallbackChain.length - 1) {
        return chatGemini(apiKey, systemPrompt, messages, { ...options, _model: fallbackChain[idx + 1] });
      }
    }
    const err = await res.json().catch(() => ({}));
    const errMsg = err?.error?.message || err?.message || `API error: ${res.status}`;
    if (res.status === 400) {
      const lower = errMsg.toLowerCase();
      if (lower.includes("token") || lower.includes("too large") || lower.includes("payload") || (lower.includes("exceeds") && lower.includes("limit"))) {
        throw new Error(`Input too long for model — ${errMsg}`);
      }
    }
    throw new Error(friendlyGeminiError(errMsg, res.status));
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const reason = candidate?.finishReason || "Unknown";
    if (reason === "SAFETY") throw new Error("Response blocked by safety filters. Try rephrasing.");
    if (reason === "MAX_TOKENS") throw new Error("Response was cut off (output too long). Try asking for a shorter reply.");
    throw new Error(`Empty response from Gemini (${reason}). Try again.`);
  }
  return text;
}

// ─── Public AI entry points ───────────────────────────────────────────────────

const STORAGE_LOCALE = "inkflow_locale";

/**
 * Expand brief text using context (story, ideas, characters).
 * Supports all configured providers. Returns expanded text or throws.
 */
export async function expandWithAi({
  currentText,
  fieldName,
  story = {},
  ideas = [],
  characters = [],
  locale: localeParam,
  extraContext = "",
}) {
  const providerId = getProvider();
  const apiKey = getApiKey(providerId);
  const providerConfig = PROVIDERS.find((p) => p.id === providerId);
  if (!apiKey?.trim()) {
    throw new Error(
      `Add your ${providerConfig?.name ?? providerId} API key in Settings → AI to use this feature.`
    );
  }

  const outputLocale = localeParam && LOCALE_TO_LANGUAGE[localeParam]
    ? localeParam
    : (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_LOCALE) : null) || "en";

  const briefText = (currentText || "")
    .replace(/\s*\/ai\s*$/i, "")
    .replace(/^\s*\/ai\s*/, "")
    .trim();

  const storyBlurb = [
    story.oneSentence && `One-sentence: ${story.oneSentence}`,
    story.setup       && `Setup: ${story.setup}`,
    story.disaster1   && `Disaster 1: ${story.disaster1}`,
    story.disaster2   && `Disaster 2: ${story.disaster2}`,
    story.disaster3   && `Disaster 3: ${story.disaster3}`,
    story.ending      && `Ending: ${story.ending}`,
  ].filter(Boolean).join("\n");

  const ideasBlurb = ideas.length > 0
    ? ideas.map((i) => `- [${i.type}] ${i.title || "Untitled"}: ${(i.body || "").slice(0, 200)}`).join("\n")
    : "(No idea cards yet)";

  const charsBlurb = characters.length > 0
    ? characters.map((c) => `- ${c.name || "Unnamed"}: ${(c.oneSentence || "").slice(0, 120)}`).join("\n")
    : "(No characters yet)";

  const { systemPrompt, userPrompt } = buildPrompt(
    fieldName, storyBlurb, ideasBlurb, charsBlurb, briefText, outputLocale, extraContext
  );

  const tier = tierForContext(CONTEXTS.EXPAND_SHORT);
  const expandMaxTokens = 1024;

  if (providerConfig?.format === "gemini") {
    return callGemini(apiKey.trim(), systemPrompt, userPrompt, { tier, maxTokens: expandMaxTokens });
  }
  const model = getModel(providerId, tier);
  return callOpenAICompat(providerConfig.baseUrl, apiKey.trim(), systemPrompt, userPrompt, {
    tier, maxTokens: expandMaxTokens,
    _model: model,
    _fallbackChain: providerConfig?.fallbackChain ?? [],
  });
}

/**
 * Single completion with custom prompts. Used by generation and consistency services.
 */
export async function completeWithAi({ systemPrompt, userPrompt, tier = TIERS.LIGHT, maxTokens = 1024 }) {
  const providerId = getProvider();
  const apiKey = getApiKey(providerId);
  const providerConfig = PROVIDERS.find((p) => p.id === providerId);
  if (!apiKey?.trim()) {
    throw new Error(
      `Add your ${providerConfig?.name ?? providerId} API key in Settings → AI to use this feature.`
    );
  }
  if (providerConfig?.format === "gemini") {
    return callGemini(apiKey.trim(), systemPrompt, userPrompt, { tier, maxTokens });
  }
  const model = getModel(providerId, tier);
  return callOpenAICompat(providerConfig.baseUrl, apiKey.trim(), systemPrompt, userPrompt, {
    tier, maxTokens,
    _model: model,
    _fallbackChain: providerConfig?.fallbackChain ?? [],
  });
}

/**
 * Multi-turn OpenAI-compatible streaming chat. Calls onChunk(text) for each token.
 * Returns the full accumulated text when complete.
 */
async function chatOpenAICompatStream(baseUrl, apiKey, systemPrompt, messages, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const maxTokens = options.maxTokens ?? 1024;
  const fallbackChain = options._fallbackChain ?? [];
  const model = options._model ?? fallbackChain[0] ?? "gpt-4o-mini";
  const { onChunk } = options;

  let res;
  try {
    res = await fetch(`${baseUrl}/v1/chat/completions`, {
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
        stream: true,
      }),
    });
  } catch {
    throw new Error("Network error — check your internet connection and try again.");
  }

  if (!res.ok) {
    if (res.status === 429 || res.status === 503) {
      const idx = fallbackChain.indexOf(model);
      if (idx >= 0 && idx < fallbackChain.length - 1) {
        return chatOpenAICompatStream(baseUrl, apiKey, systemPrompt, messages, {
          ...options, _model: fallbackChain[idx + 1],
        });
      }
    }
    const err = await res.json().catch(() => ({}));
    const errMsg = err?.error?.message || `API error: ${res.status}`;
    throw new Error(friendlyOpenAIError(errMsg, res.status));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6).trim();
      if (data === "[DONE]") return fullText;
      try {
        const json = JSON.parse(data);
        const text = json.choices?.[0]?.delta?.content;
        if (text) { fullText += text; onChunk?.(text); }
      } catch { /* ignore malformed SSE chunks */ }
    }
  }
  return fullText;
}

/**
 * Gemini streaming chat via streamGenerateContent?alt=sse.
 * Calls onChunk(text) for each token, returns full accumulated text.
 */
async function chatGeminiStream(apiKey, systemPrompt, messages, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const geminiConfig = PROVIDERS.find((p) => p.id === "gemini");
  const fallbackChain = geminiConfig?.fallbackChain ?? [];
  const model = options._model ?? getModel("gemini", tier);
  const maxOutputTokens = options.maxTokens ?? 1024;
  const { onChunk } = options;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;

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
      const idx = fallbackChain.indexOf(model);
      if (idx >= 0 && idx < fallbackChain.length - 1) {
        return chatGeminiStream(apiKey, systemPrompt, messages, { ...options, _model: fallbackChain[idx + 1] });
      }
    }
    const err = await res.json().catch(() => ({}));
    const errMsg = err?.error?.message || err?.message || `API error: ${res.status}`;
    throw new Error(friendlyGeminiError(errMsg, res.status));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6).trim();
      try {
        const json = JSON.parse(data);
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { fullText += text; onChunk?.(text); }
      } catch { /* ignore malformed SSE chunks */ }
    }
  }

  if (!fullText.trim()) throw new Error("Empty streaming response from Gemini. Try again.");
  return fullText;
}

/**
 * Multi-turn chat completion. Maintains conversation history for all providers.
 */
export async function chatWithAi({ messages, systemPrompt, tier = TIERS.LIGHT, maxTokens = 1024 }) {
  const providerId = getProvider();
  const apiKey = getApiKey(providerId);
  const providerConfig = PROVIDERS.find((p) => p.id === providerId);
  if (!apiKey?.trim()) {
    throw new Error(
      `Add your ${providerConfig?.name ?? providerId} API key in Settings to chat.`
    );
  }
  if (providerConfig?.format === "gemini") {
    return chatGemini(apiKey.trim(), systemPrompt, messages, { tier, maxTokens });
  }
  const model = getModel(providerId, tier);
  return chatOpenAICompat(providerConfig.baseUrl, apiKey.trim(), systemPrompt, messages, {
    tier, maxTokens,
    _model: model,
    _fallbackChain: providerConfig?.fallbackChain ?? [],
  });
}

/**
 * Streaming version of chatWithAi — for OtterChat only.
 * Calls onChunk(text) for each token as it arrives.
 */
export async function chatWithAiStream({ messages, systemPrompt, tier = TIERS.LIGHT, maxTokens = 1024, onChunk }) {
  const providerId = getProvider();
  const apiKey = getApiKey(providerId);
  const providerConfig = PROVIDERS.find((p) => p.id === providerId);
  if (!apiKey?.trim()) {
    throw new Error(
      `Add your ${providerConfig?.name ?? providerId} API key in Settings to chat.`
    );
  }
  if (providerConfig?.format === "gemini") {
    return chatGeminiStream(apiKey.trim(), systemPrompt, messages, { tier, maxTokens, onChunk });
  }
  const model = getModel(providerId, tier);
  return chatOpenAICompatStream(providerConfig.baseUrl, apiKey.trim(), systemPrompt, messages, {
    tier, maxTokens, onChunk,
    _model: model,
    _fallbackChain: providerConfig?.fallbackChain ?? [],
  });
}

/**
 * Test if the given (or saved) API key works. Uses a minimal request.
 */
export async function testApiKey(key, providerId) {
  const id = providerId || getProvider();
  const apiKey = (key && key.trim()) || getApiKey(id).trim();
  const providerConfig = PROVIDERS.find((p) => p.id === id);
  if (!apiKey) throw new Error("Enter an API key first, then click Test.");

  if (providerConfig?.format === "gemini") {
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

  // OpenAI-compatible test
  const model = getModel(id, TIERS.LIGHT);
  const res = await fetch(`${providerConfig.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
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
  if (!data.choices?.[0]?.message?.content) throw new Error("API returned an empty response.");
  return true;
}

// ─── Error helpers (unchanged) ────────────────────────────────────────────────

function friendlyOpenAIError(msg, status) {
  if (status === 401 || (typeof msg === "string" && (msg.includes("invalid") || msg.includes("401") || msg.includes("Incorrect API key"))))
    return "Invalid API key. Check your API key in Settings.";
  if (status === 429 || (typeof msg === "string" && (msg.includes("429") || msg.includes("rate limit") || msg.includes("quota"))))
    return "Rate limit or quota exceeded. Try again in a moment, or upgrade your plan.";
  if (status === 403 || (typeof msg === "string" && (msg.includes("403") || msg.includes("permission"))))
    return "Access denied. Check your API key and permissions.";
  if (status === 503 || (typeof msg === "string" && msg.includes("503")))
    return "Service is temporarily unavailable. Try again in a moment.";
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
  if (msg.includes("output too long") || msg.includes("cut off"))
    return "token_limit";
  if (msg.includes("input too long") || msg.includes("too long for the model"))
    return "context_too_long";
  if (msg.includes("empty response") || msg.includes("blank response"))
    return "empty";
  return "unknown";
}

export function friendlyAiError(error) {
  const type = classifyAiError(error);
  if (type === "network")       return "Couldn't reach the AI — check your internet connection and try again.";
  if (type === "invalid_key")   return "Your API key doesn't work. Go to Settings → AI to check it.";
  if (type === "access_denied") return "Access denied — your API key may not have the right permissions. Check Settings → AI.";
  if (type === "rate_limit")    return "Rate or quota limit reached. All fallback models were tried — wait a moment and try again.";
  if (type === "service_down")  return "The AI service is temporarily unavailable. Try again in a moment.";
  if (type === "safety")        return "Response blocked by content safety filters. Try rephrasing your request.";
  if (type === "token_limit")   return "The AI response was too long to complete. Try asking for something shorter.";
  if (type === "context_too_long") return "Your request was too long for the model. Try shortening your input.";
  if (type === "empty")         return "The AI returned an empty response. Try again.";
  const raw = (error?.message || "please try again").replace(/[.!?]+$/, "");
  return `Something went wrong — ${raw}.`;
}
