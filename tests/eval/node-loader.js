/**
 * Node.js ESM hook: resolves Vite's '@/' path alias to 'src/'.
 * Registered by node-register.js via --import flag.
 */

const srcRoot = new URL('../../src/', import.meta.url).href

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return nextResolve(srcRoot + specifier.slice(2), context)
  }
  return nextResolve(specifier, context)
}
