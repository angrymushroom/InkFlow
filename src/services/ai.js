const STORAGE_PROVIDER = "inkflow_ai_provider";
const STORAGE_OPENAI_KEY = "inkflow_ai_openai_key";
const STORAGE_GEMINI_KEY = "inkflow_ai_gemini_key";
const STORAGE_MODEL_PREFIX = "inkflow_ai_model_";

/** Feature tiers: light = cheap/fast (quick expand); advanced = better model for long-form. */
export const TIERS = Object.freeze({ LIGHT: "light", ADVANCED: "advanced" });

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

const LOCALE_TO_LANGUAGE = Object.freeze({
  en: "English",
  zh: "Chinese (中文)",
  es: "Spanish (Español)",
  fr: "French (Français)",
});

/** Strong language instruction so the model never switches language. */
function getLanguageRule(locale) {
  const lang = LOCALE_TO_LANGUAGE[locale] || "English";
  if (locale === "zh") {
    return `CRITICAL: You must write the entire response in Chinese only (中文). Do not use English or any other language. 请只用中文回复。`;
  }
  return `CRITICAL: You must write the entire response in ${lang} only. Do not use any other language.`;
}

function buildPrompt(fieldName, storyBlurb, ideasBlurb, charsBlurb, briefText, outputLocale) {
  const lang = LOCALE_TO_LANGUAGE[outputLocale] || "English";
  const languageRule = getLanguageRule(outputLocale);
  const systemPrompt = `You are a fiction writing assistant. The writer is using the Snowflake Method. Keep all output in Snowflake style: simple, clear, structural—no artistic or flowery descriptions, no purple prose. The text must relate to and stay consistent with the story spine, idea cards, and characters provided. ${languageRule} Output only the expanded text, no preamble, no "Here is...", no quotes around the result.`;

  const isEmpty = !(briefText && briefText.trim());
  const userPrompt = isEmpty
    ? `The user has left this field empty. Generate content for the field "${fieldName}" based only on the story, ideas, and characters below. Your text must continue the same narrative (same characters, setting, and events already described). Do not invent a new story or generic filler. Use the same language as the existing story content when possible. ${languageRule}

Story context:
${storyBlurb || "(Not filled yet)"}

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

Expanded version (${languageRule} output only the text):`;

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
    outputLocale
  );

  // Quick expand is a light-tier feature (cheap, fast model).
  const tier = TIERS.LIGHT;
  if (provider === "gemini") {
    return callGemini(apiKey.trim(), systemPrompt, userPrompt, { tier });
  }
  return callOpenAI(apiKey.trim(), systemPrompt, userPrompt, { tier });
}

async function callOpenAI(apiKey, systemPrompt, userPrompt, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const model = getModel("openai", tier);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: tier === TIERS.ADVANCED ? 2048 : 500,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from AI");
  return content;
}

async function callGemini(apiKey, systemPrompt, userPrompt, options = {}) {
  const tier = options.tier ?? TIERS.LIGHT;
  const model = getModel("gemini", tier);
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: tier === TIERS.ADVANCED ? 2048 : 500,
        temperature: 0.6,
      },
    }),
  });

  if (!res.ok) {
    if (res.status === 404 && tier === TIERS.ADVANCED) {
      const fallback = getModel("gemini", TIERS.LIGHT);
      if (fallback !== model) {
        return callGemini(apiKey, systemPrompt, userPrompt, { tier: TIERS.LIGHT });
      }
    }
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || err?.message || `API error: ${res.status}`;
    throw new Error(friendlyGeminiError(msg, res.status));
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason || "Unknown";
    throw new Error(`Empty response from Gemini (${reason})`);
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
    const msg = err?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error("OpenAI returned an empty response.");
  }
  return true;
}

function friendlyGeminiError(msg, status) {
  if (status === 404 || (typeof msg === "string" && (msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("not found"))))
    return "Model not found (404). Try a different model in Export → AI (e.g. Gemini 2.5 Flash).";
  if (typeof msg !== "string") return "API request failed.";
  if (msg.includes("API_KEY_INVALID") || msg.includes("invalid") || msg.includes("401"))
    return "Invalid API key. Get a key at Google AI Studio: aistudio.google.com/app/apikey";
  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate"))
    return "Rate limit or quota exceeded. Try again later or check your Google Cloud quota.";
  if (msg.includes("403") || msg.includes("permission"))
    return "Access denied. Check that the API is enabled for your key.";
  return msg;
}
