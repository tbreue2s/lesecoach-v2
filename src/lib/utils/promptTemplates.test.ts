import { describe, it, expect } from 'vitest';
import {
  buildStoryPrompt,
  generateStoryPrompt,
  parseGeneratedStoryJson,
} from './promptTemplates';
import { STORY_THEMES } from '../data/storyThemes';

describe('Prompt Templates & JSON Output Mandate (WP08)', () => {
  const sampleTheme = STORY_THEMES[0]; // theme_forest

  describe('Prompt Construction across Didactic Levels (1-9)', () => {
    it('generates Level 1 prompt with strict vocabulary and syntax bans', () => {
      const prompt = generateStoryPrompt(1, sampleTheme, 'Emil', 'Bello');

      expect(prompt).toContain('Lese-Stufe 1');
      expect(prompt).toContain('Exakt 4 Sätze');
      expect(prompt).toContain('Maximal 4-5 Wörter pro Satz');
      expect(prompt).toContain('Ausschließlich einfache Hauptsätze');
      expect(prompt).toContain('Keine Nebensätze, kein Komma');
      expect(prompt).toContain('AUSSCHLIESSLICH 1- bis 2-silbige Wörter');
      expect(prompt).toContain('KEINE Komposita');
      expect(prompt).toContain("KEINE Wörter mit 'ß', 'ck', 'tz' oder 'pf'");
      expect(prompt).toContain("KEINE Konsonanten-Cluster ('sch', 'sp', 'st')");
      expect(prompt).toContain('Hund, Hut, Ball');
      expect(prompt).toContain('Emil');
      expect(prompt).toContain('Bello');
      expect(prompt).toContain('GLOBALES JSON-SCHEMA MANDAT');
      expect(prompt).toContain('"syllables"');
    });

    it('generates Level 2 prompt with noun phrase and syllable limit rules', () => {
      const prompt = buildStoryPrompt({
        level: 2,
        theme: sampleTheme,
        childName: 'Mia',
        companionName: 'Flora',
      });

      expect(prompt).toContain('Lese-Stufe 2');
      expect(prompt).toContain('4-5 Sätze');
      expect(prompt).toContain('Nomen-Phrasen mit Adjektiven oder Artikeln');
      expect(prompt).toContain('Maximal 3 Silben pro Wort');
      expect(prompt).toContain('maximal 4 Silben für die 2 zusammengehörigen Wörter');
      expect(prompt).toContain('Mia');
      expect(prompt).toContain('Flora');
    });

    it('generates Level 3 prompt with mini-phrase rules', () => {
      const prompt = generateStoryPrompt(3, sampleTheme, 'Jonas');

      expect(prompt).toContain('Lese-Stufe 3');
      expect(prompt).toContain('4-6 Sätze');
      expect(prompt).toContain('2- bis 3-Wort-Phrasen');
      expect(prompt).toContain('Kein Begleiter ausgewählt');
    });

    it('generates Level 4 & 5 prompts with tandem alternating rules', () => {
      const promptLvl4 = generateStoryPrompt(4, sampleTheme, 'Lukas', 'Rexi');
      expect(promptLvl4).toContain('Lese-Stufe 4 (Tandem-Starter)');
      expect(promptLvl4).toContain('Das Kind liest jeden 3. Satz');
      expect(promptLvl4).toContain('Kind-Sätze: Kurz (3-5 Wörter)');
      expect(promptLvl4).toContain('App-Sätze: Länger (6-8 Wörter)');

      const promptLvl5 = generateStoryPrompt(5, sampleTheme, 'Lukas', 'Rexi');
      expect(promptLvl5).toContain('Lese-Stufe 5 (Tandem-Profi)');
      expect(promptLvl5).toContain('Streng abwechselndes Tandem-Lesen');
    });

    it('generates Level 6 prompt with repeated reading rules', () => {
      const prompt = generateStoryPrompt(6, sampleTheme, 'Sophia');
      expect(prompt).toContain('Lese-Stufe 6 (Satz-Held)');
      expect(prompt).toContain('5-6 Sätze');
      expect(prompt).toContain('5-7 Wörter pro Satz');
    });

    it('generates Phase C (Level 7, 8, 9) prompts with word count scaling', () => {
      const promptLvl7 = generateStoryPrompt(7, sampleTheme, 'Noah');
      expect(promptLvl7).toContain('Lese-Stufe 7');
      expect(promptLvl7).toContain('ca. 30 Wörtern');

      const promptLvl8 = generateStoryPrompt(8, sampleTheme, 'Noah');
      expect(promptLvl8).toContain('Lese-Stufe 8');
      expect(promptLvl8).toContain('ca. 60 Wörtern');

      const promptLvl9 = generateStoryPrompt(9, sampleTheme, 'Noah');
      expect(promptLvl9).toContain('Lese-Stufe 9');
      expect(promptLvl9).toContain('100+ Wörtern');
    });

    it('interpolates theme string correctly when theme is just a string', () => {
      const prompt = generateStoryPrompt(1, 'Zauberwald', 'Tim');
      expect(prompt).toContain('Thema: Zauberwald');
      expect(prompt).toContain('Hauptperson (Kind): "Tim"');
    });
  });

  describe('parseGeneratedStoryJson', () => {
    it('parses valid JSON complying with the WP08 schema', () => {
      const validJson = JSON.stringify({
        sentences: [
          {
            text: 'Emil sieht einen Hund.',
            words: [
              { clean: 'Emil', syllables: ['E', 'mil'] },
              { clean: 'sieht', syllables: ['sieht'] },
              { clean: 'einen', syllables: ['ei', 'nen'] },
              { clean: 'Hund', syllables: ['Hund'] },
            ],
          },
        ],
      });

      const parsed = parseGeneratedStoryJson(validJson);
      expect(parsed.sentences).toHaveLength(1);
      expect(parsed.sentences[0].text).toBe('Emil sieht einen Hund.');
      expect(parsed.sentences[0].words).toHaveLength(4);
      expect(parsed.sentences[0].words[0]).toEqual({ clean: 'Emil', syllables: ['E', 'mil'] });
      expect(parsed.sentences[0].words[3]).toEqual({ clean: 'Hund', syllables: ['Hund'] });
    });

    it('successfully extracts JSON wrapped inside markdown code fences', () => {
      const fencedJson = `
\`\`\`json
{
  "sentences": [
    {
      "text": "Bello rennt schnell.",
      "words": [
        { "clean": "Bello", "syllables": ["Bel", "lo"] },
        { "clean": "rennt", "syllables": ["rennt"] },
        { "clean": "schnell", "syllables": ["schnell"] }
      ]
    }
  ]
}
\`\`\`
      `;

      const parsed = parseGeneratedStoryJson(fencedJson);
      expect(parsed.sentences).toHaveLength(1);
      expect(parsed.sentences[0].words[0].clean).toBe('Bello');
    });

    it('throws error for invalid JSON or missing sentences', () => {
      expect(() => parseGeneratedStoryJson('')).toThrow('Invalid JSON input');
      expect(() => parseGeneratedStoryJson('{ "bad": 123 }')).toThrow('Missing root "sentences" property');
      expect(() => parseGeneratedStoryJson('{ "sentences": [] }')).toThrow('must be a non-empty array');
      expect(() => parseGeneratedStoryJson('NOT_JSON')).toThrow('Failed to parse LLM JSON');
    });
  });
});
