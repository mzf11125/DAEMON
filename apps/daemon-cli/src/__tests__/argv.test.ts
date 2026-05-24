import { describe, expect, it } from 'vitest';
import { normalizeArgv } from '../argv.js';

describe('normalizeArgv', () => {
  it('removes pnpm/npm argument separator', () => {
    expect(normalizeArgv(['node', 'index.ts', '--', '--help'])).toEqual([
      'node',
      'index.ts',
      '--help',
    ]);
  });

  it('leaves argv unchanged when separator is absent', () => {
    const argv = ['node', 'index.ts', 'tenant', 'token', '--help'];
    expect(normalizeArgv(argv)).toEqual(argv);
  });
});
