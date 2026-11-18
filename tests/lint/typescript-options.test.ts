import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// "Object is possibly 'undefined'" (2532) and "'x' is possibly 'undefined'" (18048).
const POSSIBLY_UNDEFINED = [2532, 18048];

function diagnosticCodes(code: string): number[] {
  const configPath = resolve('tsconfig.json');
  const config = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve('.'));
  const fileName = resolve('src/__typescript-options-probe__.ts');

  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, ...rest) =>
    name === fileName
      ? ts.createSourceFile(name, code, languageVersion)
      : getSourceFile(name, languageVersion, ...rest);
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (name) => name === fileName || fileExists(name);

  const program = ts.createProgram(
    [fileName],
    { ...options, noEmit: true, incremental: false },
    host,
  );
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => diagnostic.code);
}

// Each probe builds a full TS program, which can exceed the default 5 s timeout on a loaded machine.
const SLOW = 30_000;

describe('TypeScript options (CA-2)', { timeout: SLOW }, () => {
  it('rejects an indexed access used without a check', () => {
    const code = 'const list: string[] = [];\nexport const size = list[0].length;\n';
    expect(diagnosticCodes(code).some((c) => POSSIBLY_UNDEFINED.includes(c))).toBe(true);
  });

  it('accepts the same access after a check', () => {
    const code =
      'const list: string[] = [];\nconst first = list[0];\nexport const size = first === undefined ? 0 : first.length;\n';
    expect(diagnosticCodes(code)).toEqual([]);
  });
});
