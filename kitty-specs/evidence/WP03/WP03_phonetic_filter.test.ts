import { describe, it, expect } from 'vitest';
import { tokenizeStory, isPhoneticallyValidForLevel, isCompoundNoun } from '../../../src/lib/utils/tokenizer';

describe('WP03 - Graphem-Blacklist, Komposita, Lautgruppen & Eigennamen für Level 1 & Level 2', () => {
  it('sollte didaktisch ungeeignete Wörter in Level 1 nicht mit role: "child" versehen', () => {
    // These words should NOT get role: 'child' in Level 1
    const testStory = 'Die weißen Pferde essen auf der Koppel. Ihre Mähne weht im Wind. Der Pfad ist schön. Alle sind fröhlich.';
    
    // Test for Level 1
    const sentences = tokenizeStory(testStory, 1);
    
    const allChildWords = sentences
      .flatMap(s => s.words)
      .filter(w => w.role === 'child')
      .map(w => w.cleanWord);
      
    // Expected forbidden words for level 1:
    const forbiddenWords = ['weißen', 'Koppel', 'Mähne', 'Pfad', 'fröhlich'];
    
    forbiddenWords.forEach(word => {
      expect(allChildWords).not.toContain(word);
    });
  });

  it('sollte den Fallback (ganzen Satz vorlesen) aktivieren, wenn kein valides Wort in Level 1 gefunden wird', () => {
    const fallbackStory = 'Die weißen Pferde.'; 
    // "Die" -> Article (forbidden)
    // "weißen" -> Adjektiv mit ß (forbidden)
    // "Pferde" -> complex cluster 'pf' (forbidden)
    
    const sentences = tokenizeStory(fallbackStory, 1);
    
    // No word should get role 'child', so the entire sentence is 'app'
    const sentenceRole = sentences[0].role;
    expect(sentenceRole).toBe('app');
    
    const childWords = sentences[0].words.filter(w => w.role === 'child');
    expect(childWords.length).toBe(0);
  });

  it('"Sandburg", "Trank" und "funkeln" dürfen für Level 1 nicht als role: "child" ausgewählt werden', () => {
    // 1. Direct validation check
    expect(isPhoneticallyValidForLevel('Sandburg', 1)).toBe(false);
    expect(isPhoneticallyValidForLevel('Trank', 1)).toBe(false);
    expect(isPhoneticallyValidForLevel('funkeln', 1)).toBe(false);

    // Also verify Komposita detection in Phase A
    expect(isCompoundNoun('Sandburg')).toBe(true);

    // 2. Tokenizer test: in a story with these words, none may receive role: 'child'
    const story = 'Am warmen Strand steht eine große Sandburg. Der alte Zauberer trinkt den roten Trank. Am dunklen Himmel funkeln viele Sterne.';
    const sentences = tokenizeStory(story, 1, 'Bello');

    const allChildWords = sentences
      .flatMap((s) => s.words)
      .filter((w) => w.role === 'child')
      .map((w) => w.cleanWord.toLowerCase());

    expect(allChildWords).not.toContain('sandburg');
    expect(allChildWords).not.toContain('trank');
    expect(allChildWords).not.toContain('funkeln');
  });

  it('Kommt ein Name 3x im Text vor, darf er genau 1x role: "child" und 2x role: "app" sein', () => {
    // Test story where configured child name "Emil" appears 3 times
    const story = 'Emil läuft über die Straße. Emil springt hoch in die Luft. Emil winkt der Oma.';
    const sentences = tokenizeStory(story, 1, 'Flora', 'Emil');

    const emilTokens = sentences
      .flatMap((s) => s.words)
      .filter((w) => w.cleanWord === 'Emil');

    expect(emilTokens.length).toBe(3);

    const childEmilTokens = emilTokens.filter((w) => w.role === 'child');
    const appEmilTokens = emilTokens.filter((w) => w.role === 'app');

    expect(childEmilTokens.length).toBe(1);
    expect(appEmilTokens.length).toBe(2);
  });
});
