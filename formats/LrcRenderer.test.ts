import { describe, it, expect } from 'vitest';
import { LrcRenderer } from './LrcRenderer';

function load(lrc: string): LrcRenderer {
  const renderer = new LrcRenderer();
  renderer.load(lrc);
  return renderer;
}

describe('LrcRenderer parsing', () => {
  it('parses basic timestamped lines and sorts by time', () => {
    const r = load('[00:10.00]Second\n[00:05.00]First');
    const lines = r.getLines();
    expect(lines.map(l => l.text)).toEqual(['First', 'Second']);
    expect(lines[0].time).toBeCloseTo(5);
    expect(lines[1].time).toBeCloseTo(10);
  });

  it('parses metadata tags', () => {
    const r = load('[ar:The Artist]\n[ti:The Title]\n[00:01.00]Hi');
    expect(r.getMetadata()).toMatchObject({ artist: 'The Artist', title: 'The Title' });
  });

  it('handles CRLF line endings', () => {
    const r = load('[00:01.00]A\r\n[00:02.00]B');
    expect(r.getLines()).toHaveLength(2);
  });

  it('expands multiple timestamps on one line', () => {
    const r = load('[00:05.00][00:20.00]Chorus');
    const lines = r.getLines();
    expect(lines).toHaveLength(2);
    expect(lines[0].time).toBeCloseTo(5);
    expect(lines[1].time).toBeCloseTo(20);
  });

  it('keeps timed empty lines so the display clears during breaks', () => {
    const r = load('[00:05.00]First\n[00:10.00]\n[00:15.00]Second');
    expect(r.getLines()).toHaveLength(3);
    const result = r.render(12);
    expect(result.lyrics?.currentLine).toBe('');
  });
});

describe('LrcRenderer offset handling', () => {
  it('shifts lyrics EARLIER for a positive offset (LRC convention)', () => {
    const r = load('[offset:+500]\n[00:10.00]Hello');
    expect(r.getLines()[0].time).toBeCloseTo(9.5);
  });

  it('shifts lyrics LATER for a negative offset', () => {
    const r = load('[offset:-1000]\n[00:10.00]Hello');
    expect(r.getLines()[0].time).toBeCloseTo(11);
  });

  it('applies the offset to lines that appear BEFORE the tag', () => {
    const r = load('[00:10.00]Hello\n[offset:+500]\n[00:20.00]World');
    const lines = r.getLines();
    expect(lines[0].time).toBeCloseTo(9.5);
    expect(lines[1].time).toBeCloseTo(19.5);
  });

  it('applies the offset to enhanced-LRC word times', () => {
    const r = load('[offset:+500]\n[00:10.00]<00:10.00>Hel<00:10.40>lo');
    const words = r.getLines()[0].words!;
    expect(words[0].time).toBeCloseTo(9.5);
    expect(words[1].time).toBeCloseTo(9.9);
  });
});

describe('LrcRenderer enhanced LRC (word timing)', () => {
  it('parses word/syllable segments', () => {
    const r = load('[00:10.00]<00:10.00>Ne<00:10.30>ver <00:10.60>gon<00:10.90>na');
    const line = r.getLines()[0];
    expect(line.text).toBe('Never gonna');
    expect(line.words!.map(w => w.text)).toEqual(['Ne', 'ver ', 'gon', 'na']);
  });

  it('keeps text that precedes the first word tag', () => {
    const r = load('[00:10.00]Oh <00:11.00>ba<00:11.50>by');
    const line = r.getLines()[0];
    expect(line.text).toBe('Oh baby');
    expect(line.words![0]).toMatchObject({ text: 'Oh ' });
    expect(line.words![0].time).toBeCloseTo(10); // sung from line start
  });

  it('reports the current segment index and segment list while rendering', () => {
    const r = load('[00:10.00]<00:10.00>Ne<00:10.30>ver <00:10.60>gon<00:10.90>na');
    const result = r.render(10.7);
    expect(result.lyrics?.words).toEqual(['Ne', 'ver ', 'gon', 'na']);
    expect(result.lyrics?.currentWordIndex).toBe(2);
  });
});

describe('LrcRenderer rendering', () => {
  it('shows the upcoming line before the first timestamp', () => {
    const r = load('[00:05.00]First');
    const result = r.render(1);
    expect(result.lyrics).toMatchObject({ currentLine: '', nextLine: 'First', lineProgress: 0 });
  });

  it('reports previous/current/next lines', () => {
    const r = load('[00:05.00]A\n[00:10.00]B\n[00:15.00]C');
    const result = r.render(11);
    expect(result.lyrics).toMatchObject({ previousLine: 'A', currentLine: 'B', nextLine: 'C' });
  });

  it('computes line progress between line starts', () => {
    const r = load('[00:10.00]A\n[00:20.00]B');
    expect(r.render(15).lyrics?.lineProgress).toBeCloseTo(0.5);
  });

  it('never produces NaN progress for duplicate timestamps', () => {
    const r = load('[00:05.00]A\n[00:05.00]B');
    const progress = r.render(5).lyrics?.lineProgress;
    expect(Number.isFinite(progress)).toBe(true);
  });

  it('returns hasContent: false for an empty file', () => {
    const r = load('');
    expect(r.render(1).hasContent).toBe(false);
  });
});
