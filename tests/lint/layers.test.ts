import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function violatedRules(path: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path });
  return (result?.messages ?? []).flatMap((message) => (message.ruleId ? [message.ruleId] : []));
}

const DOMAIN = 'src/modules/questions/domain/example.ts';

// The first run loads every plugin and exceeds the default 5 s timeout.
beforeAll(async () => {
  await eslint.lintText('export {};\n', { filePath: DOMAIN });
}, 300_000);

describe('lint rules: TypeScript', () => {
  it('forbids explicit any', async () => {
    expect(await violatedRules(DOMAIN, 'export const x: any = 1;\n')).toContain(
      '@typescript-eslint/no-explicit-any',
    );
  });

  it('forbids @ts-ignore', async () => {
    const code = '// @ts-ignore\nexport const x = 1;\n';
    expect(await violatedRules(DOMAIN, code)).toContain('@typescript-eslint/ban-ts-comment');
  });

  it('requires a description on eslint-disable', async () => {
    const code = '// eslint-disable-next-line no-console\nconsole.log(1);\n';
    expect(await violatedRules('src/app/x.ts', code)).toContain(
      '@eslint-community/eslint-comments/require-description',
    );
  });
});

describe('lint rules: pure domain', () => {
  it.each([
    ["import { useState } from 'react';", 'react'],
    ["import { redirect } from 'next/navigation';", 'next/*'],
    ["import { createClient } from '@supabase/supabase-js';", '@supabase/*'],
    ["import { z } from 'zod';", 'zod'],
    ["import { createSupabaseServerClient } from '@/shared/supabase';", 'shared/supabase'],
    ["import { Button } from '@/shared/ui';", 'shared/ui'],
    ["import { x } from '../data/repository';", '../data'],
    ["import { x } from '../actions/action';", '../actions'],
    ["import { x } from '../components/X';", '../components'],
    ["import { x } from '@/modules/review';", "another module's public API"],
  ])('forbids %s (%s)', async (importLine) => {
    expect(await violatedRules(DOMAIN, `${importLine}\nexport {};\n`)).toContain(
      'no-restricted-imports',
    );
  });

  it.each([
    ['Date.now()', 'export const t = Date.now();'],
    ['new Date() without arguments', 'export const t = new Date();'],
    ['Math.random()', 'export const t = Math.random();'],
  ])('forbids %s', async (_case, code) => {
    expect(await violatedRules(DOMAIN, `${code}\n`)).toContain('no-restricted-syntax');
  });

  it('allows new Date with an argument', async () => {
    expect(await violatedRules(DOMAIN, "export const t = new Date('2026-01-01');\n")).toEqual([]);
  });

  it('forbids fetch', async () => {
    expect(await violatedRules(DOMAIN, "export const r = fetch('/x');\n")).toContain(
      'no-restricted-globals',
    );
  });

  it("allows importing another module's domain through domain/index.ts", async () => {
    const code =
      "import { decideAccess } from '@/modules/auth/domain';\nexport { decideAccess };\n";
    expect(await violatedRules(DOMAIN, code)).toEqual([]);
  });

  it('forbids importing an internal domain file of another module', async () => {
    const code =
      "import { decideAccess } from '@/modules/auth/domain/decide-access';\nexport { decideAccess };\n";
    expect(await violatedRules(DOMAIN, code)).toContain('no-restricted-imports');
  });
});

describe('lint rules: layer dependencies', () => {
  it('forbids app from importing a module internal file', async () => {
    const code = "import { x } from '@/modules/questions/data/repository';\nexport { x };\n";
    expect(await violatedRules('src/app/page.tsx', code)).toContain('no-restricted-imports');
  });

  it('allows app to import the module public API', async () => {
    const code = "import { x } from '@/modules/questions';\nexport { x };\n";
    expect(await violatedRules('src/app/page.tsx', code)).toEqual([]);
  });

  it("forbids importing another module's domain outside domain/", async () => {
    const code = "import { x } from '@/modules/questions/domain';\nexport { x };\n";
    expect(await violatedRules('src/modules/review/actions/action.ts', code)).toContain(
      'no-restricted-imports',
    );
  });

  it('forbids a component from importing data', async () => {
    const code = "import { x } from '../data/repository';\nexport { x };\n";
    expect(await violatedRules('src/modules/questions/components/X.tsx', code)).toContain(
      'no-restricted-imports',
    );
  });

  it('forbids a component from using the Supabase client', async () => {
    const code =
      "import { createSupabaseServerClient } from '@/shared/supabase';\nexport { createSupabaseServerClient };\n";
    expect(await violatedRules('src/modules/questions/components/X.tsx', code)).toContain(
      'no-restricted-imports',
    );
  });

  it('forbids data from importing React', async () => {
    const code = "import { useState } from 'react';\nexport { useState };\n";
    expect(await violatedRules('src/modules/questions/data/repository.ts', code)).toContain(
      'no-restricted-imports',
    );
  });

  it('forbids actions from importing components', async () => {
    const code = "import { X } from '../components/X';\nexport { X };\n";
    expect(await violatedRules('src/modules/questions/actions/action.ts', code)).toContain(
      'no-restricted-imports',
    );
  });

  it('forbids a relative path that leaves the module', async () => {
    const code = "import { x } from '../../review/data/repository';\nexport { x };\n";
    expect(await violatedRules('src/modules/questions/actions/action.ts', code)).toContain(
      'no-restricted-imports',
    );
  });

  it('forbids shared from importing modules', async () => {
    const code = "import { x } from '@/modules/questions';\nexport { x };\n";
    expect(await violatedRules('src/shared/ui/X.tsx', code)).toContain('no-restricted-imports');
  });
});

describe('lint rules: environment variables', () => {
  it.each(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'NEXT_PUBLIC_OTHER_KEY'])(
    'forbids process.env.%s',
    async (name) => {
      expect(
        await violatedRules('src/app/x.ts', `export const v = process.env.${name};\n`),
      ).toContain('no-restricted-syntax');
    },
  );

  it.each(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])(
    'allows process.env.%s',
    async (name) => {
      expect(
        await violatedRules('src/app/x.ts', `export const v = process.env.${name};\n`),
      ).toEqual([]);
    },
  );
});
