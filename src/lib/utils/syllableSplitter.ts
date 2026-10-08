/**
 * German Syllable Splitter for Early Reading Education (Grundschule 1./2. Klasse).
 * Accurately divides German words into syllables based on phonotactic rules and vowel nuclei.
 */

// German diphthongs that form a single vowel nucleus
const DIPHTHONGS = ['äu', 'ei', 'eu', 'au', 'ie', 'ai', 'ui'];
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y'];

interface VowelGroup {
  start: number;
  end: number;
  text: string;
}

/**
 * Finds all vowel nuclei (monophthongs and diphthongs) in a word.
 */
function findVowelNuclei(word: string): VowelGroup[] {
  const lower = word.toLowerCase();
  const nuclei: VowelGroup[] = [];
  let i = 0;

  while (i < lower.length) {
    // Check 2-letter diphthongs first
    if (i + 1 < lower.length) {
      const pair = lower.slice(i, i + 2);
      if (DIPHTHONGS.includes(pair)) {
        nuclei.push({ start: i, end: i + 2, text: word.slice(i, i + 2) });
        i += 2;
        continue;
      }
    }

    // Check single vowels
    if (VOWELS.includes(lower[i])) {
      nuclei.push({ start: i, end: i + 1, text: word.slice(i, i + 1) });
      i += 1;
      continue;
    }

    i++;
  }

  return nuclei;
}

/**
 * Splits a German word into its constituent syllables.
 * Examples:
 * - "Wiese" -> ["Wie", "se"]
 * - "Blumen" -> ["Blu", "men"]
 * - "Schmetterling" -> ["Schmet", "ter", "ling"]
 * - "Hund" -> ["Hund"]
 * - "Sonne" -> ["Son", "ne"]
 */
export function splitSyllables(rawWord: string): string[] {
  if (!rawWord || rawWord.trim().length === 0) return [];

  const word = rawWord.trim();
  const nuclei = findVowelNuclei(word);

  // If 0 or 1 syllable nucleus, the word is monosyllabic
  if (nuclei.length <= 1) {
    return [word];
  }

  const splitIndices: number[] = [];

  for (let k = 0; k < nuclei.length - 1; k++) {
    const currentNucleus = nuclei[k];
    const nextNucleus = nuclei[k + 1];

    const consonantStart = currentNucleus.end;
    const consonantEnd = nextNucleus.start;
    const consonantCount = consonantEnd - consonantStart;
    const consonants = word.slice(consonantStart, consonantEnd);
    const consonantsLower = consonants.toLowerCase();

    if (consonantCount === 0) {
      // Hiatus (two separate vowel sounds without consonant between them, e.g. "Ru-ine")
      splitIndices.push(consonantStart);
    } else if (consonantCount === 1) {
      // Single consonant goes to the following syllable (e.g. "Wie-se", "Blu-men")
      splitIndices.push(consonantStart);
    } else {
      // 2 or more consonants between vowels
      if (consonantsLower === 'ch' || consonantsLower === 'sch' || consonantsLower === 'ph' || consonantsLower === 'th') {
        // Inseparable consonant digraphs/trigraphs go together to the next syllable
        splitIndices.push(consonantStart);
      } else if (consonantsLower.startsWith('sch') && consonantsLower.length > 3) {
        splitIndices.push(consonantStart + 1);
      } else if (consonantsLower.endsWith('sch')) {
        // e.g. "fröh-lich", "himmlisch" -> split before 'sch'
        splitIndices.push(consonantEnd - 3);
      } else if (consonantsLower.endsWith('ch')) {
        // e.g. "fröh-lich" -> split before 'ch'
        splitIndices.push(consonantEnd - 2);
      } else if (consonantsLower === 'ck') {
        // In modern German orthography, 'ck' goes to the next syllable
        splitIndices.push(consonantStart);
      } else if (consonantsLower === 'tz') {
        // "Kat-ze", "Plätz-chen" -> split after 't'
        splitIndices.push(consonantStart + 1);
      } else {
        // Standard rule: single first consonant stays in preceding syllable, remainder goes to next (e.g. "Son-ne", "Schmet-ter", "Kis-te", "bun-ten")
        splitIndices.push(consonantStart + 1);
      }
    }
  }

  // Construct syllable slices
  const syllables: string[] = [];
  let prevIndex = 0;

  for (const idx of splitIndices) {
    syllables.push(word.slice(prevIndex, idx));
    prevIndex = idx;
  }
  syllables.push(word.slice(prevIndex));

  return syllables.filter((s) => s.length > 0);
}
