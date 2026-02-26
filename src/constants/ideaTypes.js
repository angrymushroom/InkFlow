/**
 * Built-in idea types for professional writers.
 * Slug is stored in ideas.type; locale key is ideas.<slug> (e.g. ideas.plot).
 */
export const BUILT_IN_IDEA_TYPES = [
  { slug: "plot", group: "story" },
  { slug: "subplot", group: "story" },
  { slug: "scene", group: "story" },
  { slug: "event", group: "story" },
  { slug: "character", group: "characters" },
  { slug: "relationship", group: "characters" },
  { slug: "faction", group: "characters" },
  { slug: "world", group: "world" },
  { slug: "location", group: "world" },
  { slug: "culture", group: "world" },
  { slug: "item", group: "objects" },
  { slug: "creature", group: "objects" },
  { slug: "magic_system", group: "objects" },
  { slug: "technology", group: "objects" },
  { slug: "concept", group: "abstract" },
  { slug: "conflict", group: "abstract" },
  { slug: "mystery", group: "abstract" },
  { slug: "symbol", group: "abstract" },
  { slug: "prophecy", group: "abstract" },
  { slug: "other", group: "other" },
];

export const DEFAULT_IDEA_TYPE = "plot";

/** All built-in slugs in display order */
export function getBuiltInSlugs() {
  return BUILT_IN_IDEA_TYPES.map((t) => t.slug);
}

/** Check if a type string is a built-in slug */
export function isBuiltInType(type) {
  return BUILT_IN_IDEA_TYPES.some((t) => t.slug === type);
}
