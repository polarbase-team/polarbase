import * as fs from 'fs/promises';
import * as path from 'path';
import * as vm from 'vm';

export interface Sandbox {
  readFile(filePath: string, encoding: 'utf-8'): Promise<string>;
  readdir(
    dirPath: string,
    opts: { withFileTypes: true }
  ): Promise<{ name: string; isDirectory(): boolean }[]>;
  execScript(
    code: string,
    context?: Record<string, unknown>
  ): Promise<{ stdout: string; stderr: string }>;
  execBash(command: string): Promise<{ stdout: string; stderr: string }>;
}

/**
 * Create a sandbox scoped to a base directory.
 * All file operations are restricted to `baseDir` and below.
 */
export function createSandbox(
  baseDir: string,
  execScriptMode: 'fs' | 'vm' = 'fs'
): Sandbox {
  const resolve = (p: string) => {
    const resolved = path.resolve(baseDir, p);
    if (!resolved.startsWith(path.resolve(baseDir))) {
      throw new Error(`Access denied: path escapes sandbox root`);
    }
    return resolved;
  };

  return {
    async readFile(filePath: string, encoding: 'utf-8') {
      return fs.readFile(resolve(filePath), encoding);
    },

    async readdir(dirPath: string, opts: { withFileTypes: true }) {
      const entries = await fs.readdir(resolve(dirPath), opts);
      return entries.map((e) => ({
        name: e.name,
        isDirectory: () => e.isDirectory(),
      }));
    },

    async execScript(code: string, context: Record<string, unknown> = {}) {
      if (execScriptMode === 'vm') {
        return execWithVM(code, context);
      }
      return execWithFunction(code, context);
    },

    async execBash(command: string) {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      try {
        const { stdout, stderr } = await execAsync(command, { cwd: baseDir });
        return { stdout, stderr };
      } catch (err: any) {
        return {
          stdout: err.stdout || '',
          stderr: err.stderr || err.message || String(err),
        };
      }
    },
  };
}

/**
 * Execute code via `new Function` with a minimal scope.
 * Fast but shares the same V8 isolate — suitable for trusted skill scripts.
 */
async function execWithFunction(
  code: string,
  context: Record<string, unknown>
): Promise<{ stdout: string; stderr: string }> {
  const logs: string[] = [];
  const errs: string[] = [];

  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      error: (...args: unknown[]) => errs.push(args.map(String).join(' ')),
      warn: (...args: unknown[]) => errs.push(args.map(String).join(' ')),
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Promise,
    ...context,
  };

  const keys = Object.keys(sandbox);
  const values = Object.values(sandbox);

  try {
    const fn = new Function(...keys, code);
    const result = fn(...values);

    // Await if the script returns a promise
    if (result && typeof result.then === 'function') {
      return result.then(() => ({
        stdout: logs.join('\n'),
        stderr: errs.join('\n'),
      }));
    }

    return Promise.resolve({
      stdout: logs.join('\n'),
      stderr: errs.join('\n'),
    });
  } catch (err: any) {
    return Promise.resolve({
      stdout: logs.join('\n'),
      stderr: errs.join('\n') + '\n' + (err.message || String(err)),
    });
  }
}

/**
 * Execute code inside `vm.runInNewContext`.
 * Provides stronger isolation (separate global scope), though still
 * in-process. Good default for production use.
 */
async function execWithVM(
  code: string,
  context: Record<string, unknown>
): Promise<{ stdout: string; stderr: string }> {
  const logs: string[] = [];
  const errs: string[] = [];

  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      error: (...args: unknown[]) => errs.push(args.map(String).join(' ')),
      warn: (...args: unknown[]) => errs.push(args.map(String).join(' ')),
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Promise,
    ...context,
  };

  try {
    const vmContext = vm.createContext(sandbox);
    const result = vm.runInNewContext(code, vmContext, {
      timeout: 10_000, // 10 seconds max
      filename: 'skill-script.js',
    });

    if (result && typeof result.then === 'function') {
      return result.then(() => ({
        stdout: logs.join('\n'),
        stderr: errs.join('\n'),
      }));
    }

    return Promise.resolve({
      stdout: logs.join('\n'),
      stderr: errs.join('\n'),
    });
  } catch (err: any) {
    return Promise.resolve({
      stdout: logs.join('\n'),
      stderr: errs.join('\n') + '\n' + (err.message || String(err)),
    });
  }
}
