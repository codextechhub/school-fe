import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // An `_`-prefixed binding is a deliberate discard, and a property pulled
      // out only to omit it from a rest spread is never read by design. Both
      // are intent, not oversight. Same rule and same reasoning as console-fe.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // The browser's own date box looks different in every browser and shows
      // dates in the reader's system format, so a raw one sits on a form beside
      // the house calendar as a stranger. `Input` and `CustomInput` route
      // `type="date"` to the picker themselves; only a bare `<input>` escapes.
      // The native time box has the same fault with the clock: it writes
      // "8:00 AM" or "08:00" by the reader's device, not the school's setting.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.value=/^(date|datetime-local|month|week)$/]",
          message:
            'Use DatePickerInput (@/components/ui/date-picker-input) or <Input type="date">, not the browser\'s native date box.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.value='time']",
          message:
            'Use TimeInput (@/components/ui/time-input) or <Input type="time">, not the browser\'s native time box: it follows the device clock, not the school\'s.',
        },
      ],
    },
  },
  {
    // shadcn-style component files co-export their cva variants and small
    // helpers; losing fast-refresh for these vendored files is acceptable.
    //
    // The two page modules are the same co-export pattern by choice, and
    // console-fe carves out its `health/primitives.tsx` for the same reason.
    // `branch-display.tsx` says in its own docstring why it is a module rather
    // than exports on the list: the drawer imports it and the list imports the
    // drawer, so splitting it further would restore the cycle it was made to
    // break. `promotion-picker.tsx` co-exports the read/write pair for the
    // control it defines, which belong beside it.
    //
    // `xvs-host.tsx` is the @xvs/finance host contract, and the package asserts
    // one module against HostContract at compile time. Its hooks and its
    // components have to BE the same module or that assertion has nothing to
    // check, so splitting it would trade a build failure for a blank screen.
    //
    // The two route tables export their mounted paths beside the routes. That
    // constant is derived from the route list on purpose: the school's nav is
    // filtered against what is actually mounted, and a separate file would be a
    // second list to keep in step - the drift they were written to prevent.
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/pages/protected/branches/branch-display.tsx',
      'src/pages/protected/academics/programs/promotion-picker.tsx',
      'src/xvs-host.tsx',
      'src/routes/protected/finance-routes.tsx',
      'src/routes/protected/procurement-routes.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
