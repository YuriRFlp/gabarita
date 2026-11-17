import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';

// Layer dependency rules: docs/06-padroes-de-codigo.md § Regras de dependência.
// In flat config the last matching block replaces a rule's options for that file,
// so each layer receives the full list (general rules + its own).

const MODULE_INTERNAL_FILE = {
  regex: '^@/modules/[^/]+/.+',
  message: "Use the module's public API (@/modules/<module>), not its internal files.",
};
const LEAVES_MODULE = {
  regex: '^(\\.\\./){2,}',
  message: 'Inside a module, import only from the same layer or a sibling layer (../).',
};

const GENERAL = [MODULE_INTERNAL_FILE];
const GENERAL_IN_MODULE = [MODULE_INTERNAL_FILE, LEAVES_MODULE];

const FORBIDDEN_ENV = {
  selector:
    "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|NEXT_PUBLIC_(?!SUPABASE_URL$|SUPABASE_PUBLISHABLE_KEY$).*)$/]",
  message:
    'Secret keys never reach the app; only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are public.',
};

const NON_DETERMINISTIC = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'The domain is deterministic: take `now: Date` as a parameter.',
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'The domain is deterministic: take `now: Date` as a parameter.',
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: 'The domain is deterministic: take `random: () => number` as a parameter.',
  },
];

function forbid(names, message) {
  return names.map((name) => ({
    regex: `^${name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(/.*)?$`,
    message,
  }));
}

function imports(patterns) {
  return { 'no-restricted-imports': ['error', { patterns }] };
}

const DOMAIN = [
  {
    regex: '^@/modules/[^/]+/(?!domain$).+',
    message: 'Between domains, import only @/modules/<module>/domain (the domain/index.ts).',
  },
  {
    regex: '^@/modules/[^/]+$',
    message:
      "The domain does not import another module's public API (it exposes actions and components).",
  },
  LEAVES_MODULE,
  ...forbid(
    ['react', 'react-dom', 'next', 'zod', '@/shared/supabase', '@/shared/ui'],
    'The domain is pure: no React, Next, Supabase, Zod or UI.',
  ),
  { regex: '^@supabase/', message: 'The domain is pure: no Supabase.' },
  ...forbid(
    ['../data', '../actions', '../components'],
    'The domain does not depend on other layers.',
  ),
];

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'src/shared/supabase/database.types.ts',
    ],
  },
  ...nextVitals,
  ...nextTs,
  eslintComments.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/disable-enable-pair': ['error', { allowWholeFile: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { ...imports(GENERAL), 'no-restricted-syntax': ['error', FORBIDDEN_ENV] },
  },
  {
    files: ['src/modules/**/*.{ts,tsx}'],
    rules: imports(GENERAL_IN_MODULE),
  },
  {
    files: ['src/modules/*/domain/**/*.{ts,tsx}'],
    rules: {
      ...imports(DOMAIN),
      'no-restricted-syntax': ['error', FORBIDDEN_ENV, ...NON_DETERMINISTIC],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'The domain does no I/O.' },
        { name: 'process', message: 'The domain does not read the environment.' },
      ],
    },
  },
  {
    files: ['src/modules/*/data/**/*.{ts,tsx}'],
    rules: imports([
      ...GENERAL_IN_MODULE,
      ...forbid(['react', 'react-dom'], 'The data layer does not use React.'),
      ...forbid(
        ['../components', '../actions'],
        'The data layer does not depend on actions or components.',
      ),
    ]),
  },
  {
    files: ['src/modules/*/actions/**/*.{ts,tsx}'],
    rules: imports([
      ...GENERAL_IN_MODULE,
      ...forbid(['../components'], 'Actions do not import components.'),
    ]),
  },
  {
    files: ['src/modules/*/components/**/*.{ts,tsx}'],
    rules: imports([
      ...GENERAL_IN_MODULE,
      ...forbid(
        ['../data', '@/shared/supabase'],
        'Components do not access the database; use the module actions.',
      ),
    ]),
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: imports([
      { regex: '^@/modules(/.*)?$', message: 'shared/ does not depend on modules.' },
    ]),
  },
  prettier,
];

export default config;
