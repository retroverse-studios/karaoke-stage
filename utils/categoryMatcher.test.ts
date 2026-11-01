import { describe, it, expect } from 'vitest';
import { matchCategories } from './categoryMatcher';

describe('matchCategories', () => {
  it('matches christmas songs', () => {
    expect(matchCategories('Jingle Bells')).toContain('christmas');
    expect(matchCategories('White Christmas - 04')).toContain('christmas');
  });

  it('matches halloween songs', () => {
    expect(matchCategories('Thriller')).toContain('halloween');
  });

  it('is case-insensitive', () => {
    expect(matchCategories('SANTA CLAUS IS COMING')).toContain('christmas');
  });

  it('can match multiple categories', () => {
    const matches = matchCategories('Monster Love Party');
    expect(matches).toContain('halloween');
    expect(matches).toContain('love');
    expect(matches).toContain('party');
  });

  it('returns an empty array for unmatched titles', () => {
    expect(matchCategories('Bohemian Rhapsody')).toEqual([]);
  });

  it('never returns the classic catch-all', () => {
    expect(matchCategories('classic rock')).not.toContain('classic');
  });
});

describe('matchCategories word boundaries', () => {
  it('does not match keywords embedded in other words', () => {
    expect(matchCategories('Glove Story')).not.toContain('love');
    expect(matchCategories('Scrabble Night')).not.toContain('kids');
  });

  it('still matches standalone keywords and phrases', () => {
    expect(matchCategories('Crazy in Love')).toContain('love');
    expect(matchCategories('Silent Night')).toContain('christmas');
  });
});
