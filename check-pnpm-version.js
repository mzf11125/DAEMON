const { execSync } = require('child_process');

const REQUIRED = '9.15.0';
try {
  const actual = execSync('pnpm --version', { encoding: 'utf8' }).trim();
  if (actual !== REQUIRED) {
    console.error(`\n  ✘ pnpm version mismatch: found ${actual}, need ${REQUIRED}`);
    console.error(`  → Use: export PATH="$HOME/.local/bin:$PATH" (pnpm@9.15.0 installed there)\n`);
    process.exit(1);
  }
} catch {
  // pnpm not found — let pnpm itself handle it
}
