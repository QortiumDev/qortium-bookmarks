import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function selectorBlock(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return '';
  const openBrace = css.indexOf('{', start);
  const closeBrace = css.indexOf('}', openBrace);
  return css.slice(openBrace + 1, closeBrace);
}

describe('primary button contrast', () => {
  it.each(['blue', 'pink'])('%s accent gradient passes WCAG AA with white text', (accent) => {
    const block = selectorBlock(`:root[data-accent='${accent}']`);
    const gradient = block.match(/--qb-gradient-primary:[^;]+/)?.[0] ?? '';
    const colors = gradient.match(/#[a-f\d]{6}/gi) ?? [];
    expect(colors.length).toBeGreaterThanOrEqual(3);
    for (const color of colors) expect(contrast(color, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['blue', '#061733'],
    ['pink', '#2a0d23'],
  ])('dark %s accent gradient passes WCAG AA with its dark text', (accent, textColor) => {
    const block = selectorBlock(`:root[data-theme='dark'][data-accent='${accent}']`);
    const colors = (block.match(/--qb-gradient-primary:[^;]+/)?.[0] ?? '').match(/#[a-f\d]{6}/gi) ?? [];
    expect(colors.length).toBeGreaterThanOrEqual(3);
    for (const color of colors) expect(contrast(color, textColor)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the contrast-safe gradient for primary buttons', () => {
    expect(selectorBlock('.button--primary')).toContain('background: var(--qb-gradient-primary)');
  });
});
