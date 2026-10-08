import type { ReadingPhase, ReadingLevelInfo, ReadingLevelNumber } from '../types/reading';

export const READING_PHASES: readonly ReadingPhase[] = Object.freeze([
  {
    id: 'phase_a',
    title: 'Phase A: Wort-Entdecker',
    subtitle: 'Zielwörter im Satz entdecken und laut lesen',
    badgeEmoji: '🔍',
    levels: [1, 2, 3],
  },
  {
    id: 'phase_b',
    title: 'Phase B: Satz-Pionier',
    subtitle: 'Ganze Sätze im Tandem und Repeated Reading erobern',
    badgeEmoji: '🚀',
    levels: [4, 5, 6],
  },
  {
    id: 'phase_c',
    title: 'Phase C: Lese-Kapitän',
    subtitle: 'Flüssiges freies Lesen zusammenhängender Geschichten',
    badgeEmoji: '⛵',
    levels: [7, 8, 9],
  },
]);

export const READING_LEVEL_INFOS: Record<ReadingLevelNumber, ReadingLevelInfo> = {
  1: {
    level: 1,
    phaseId: 'phase_a',
    title: 'Level 1: Einzelwort-Entdecker',
    description: 'Genau 1 Zielwort pro Satz liest das Kind laut vor.',
    targetChildWordsPerSentence: 1,
    isRepeatedReadingEnabled: false,
  },
  2: {
    level: 2,
    phaseId: 'phase_a',
    title: 'Level 2: Doppelwort-Forscher',
    description: 'Genau 2 Wörter pro Satz liest das Kind vor.',
    targetChildWordsPerSentence: 2,
    isRepeatedReadingEnabled: false,
  },
  3: {
    level: 3,
    phaseId: 'phase_a',
    title: 'Level 3: Halbsatz-Meister',
    description: '3 bis 4 Wörter (ein ganzer Halbsatz) werden vom Kind gelesen.',
    targetChildWordsPerSentence: 3,
    isRepeatedReadingEnabled: false,
  },
  4: {
    level: 4,
    phaseId: 'phase_b',
    title: 'Level 4: Satz-Schnupperer',
    description: 'Das Kind liest ab und zu einen kurzen Satz komplett selbst (Repeated Reading aktiv).',
    isRepeatedReadingEnabled: true,
  },
  5: {
    level: 5,
    phaseId: 'phase_b',
    title: 'Level 5: Lese-Tandem',
    description: 'Wechselseitiges Lesen: Ein Satz App, ein Satz Kind im Tandem.',
    isRepeatedReadingEnabled: true,
  },
  6: {
    level: 6,
    phaseId: 'phase_b',
    title: 'Level 6: Solo-Pionier',
    description: 'Das Kind liest alle Sätze der Geschichte laut vor (mit Vorlese-Hilfe).',
    isRepeatedReadingEnabled: true,
  },
  7: {
    level: 7,
    phaseId: 'phase_c',
    title: 'Level 7: Kleiner Kapitän',
    description: 'Freies Lesen von kurzen Geschichten (~30 Wörter).',
    isRepeatedReadingEnabled: false,
  },
  8: {
    level: 8,
    phaseId: 'phase_c',
    title: 'Level 8: Großer Kapitän',
    description: 'Freies Lesen von mittleren Geschichten (~60 Wörter).',
    isRepeatedReadingEnabled: false,
  },
  9: {
    level: 9,
    phaseId: 'phase_c',
    title: 'Level 9: Lese-Admiral',
    description: 'Flüssiges Lesen langer Geschichten (100+ Wörter).',
    isRepeatedReadingEnabled: false,
  },
};
