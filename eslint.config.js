import pluginVue from 'eslint-plugin-vue'
import configPrettier from '@vue/eslint-config-prettier'
import globals from 'globals'

export default [
  { ignores: ['dist/', 'node_modules/', 'e2e/', 'playwright-report/', 'test-results/'] },
  ...pluginVue.configs['flat/recommended'],
  configPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'warn',
      'no-unused-vars': 'warn',
    },
  },
]
