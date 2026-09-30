import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual module with an explicit dependency allowlist. Unmocked
// imports and network access fail closed; no application DB/provider is loaded.
export function loadIsolated<T = any>(file: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}): T {
  const filename = resolve(process.cwd(), file);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const isolatedModule = { exports: {} };
  const context = vm.createContext({
    module: isolatedModule, exports: isolatedModule.exports,
    require(name: string) {
      if (!(name in dependencies)) throw new Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
    process: { env: {} },
    console: { log() {}, error() {}, warn() {} },
    fetch() { throw new Error('Network forbidden in regression tests'); },
    URL, AbortSignal, ...globals,
  });
  new vm.Script(source, { filename }).runInContext(context);
  return isolatedModule.exports as T;
}
