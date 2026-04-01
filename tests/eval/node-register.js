/**
 * Loaded via --import to register the @/ alias hook before any modules load.
 * Usage: node --import ./tests/eval/node-register.js tests/eval/run-all.js
 */

import { register } from 'node:module'
register('./node-loader.js', import.meta.url)
