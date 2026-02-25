import chalk from 'chalk';

// Enable detailed logs in development or when explicitly requested
const isVerbose =
  process.argv.includes('--verbose') ||
  process.argv.includes('-v') ||
  process.env.VERBOSE === 'true';

// Debug logs are enabled with --debug, DEBUG=true, or when verbose is active
const isDebug = isVerbose || process.env.DEBUG === 'true';

export const log = {
  /** Regular info – shown only in verbose mode */
  info: (...args: any[]) => isVerbose && console.log('   ℹ ', ...args),

  /** Success message – shown only in verbose mode */
  success: (...args: any[]) =>
    isVerbose && console.log('   ✓ ', chalk.green(...args)),

  /** Warning – shown only in verbose mode */
  warn: (...args: any[]) =>
    isVerbose && console.log('   ⚠ ', chalk.yellow(...args)),

  /** Error – always shown (even in production) */
  error: (...args: any[]) => console.error('   ✗ ', chalk.red(...args)),

  /** Debug messages – only when --debug or DEBUG=true */
  debug: (...args: any[]) =>
    isDebug && console.log(chalk.gray('   ›'), ...args),
};
