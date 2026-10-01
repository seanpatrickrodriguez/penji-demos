import { validateConfiguration } from '@penji-demos/record-engine';
import { describe, expect, it } from 'vitest';
import { PROGRAM_CONFIGURATION } from './program-configuration';

describe('the diabetes prevention program configuration', () => {
  it('resolves every reference, and every field its standards, grants and facts read is supplied', () => {
    expect(validateConfiguration(PROGRAM_CONFIGURATION)).toEqual([]);
  });
});
