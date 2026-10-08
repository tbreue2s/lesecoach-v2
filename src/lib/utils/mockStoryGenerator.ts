import type { StoryConfigPayload } from '../types/storyConfig';
import type { StoryData } from '../types/reading';

type StoryTemplate = {
  title: (childName: string, companionName?: string) => string;
  coverEmoji: string;
  sentences: (childName: string, companionName?: string) => string[];
};

const THEME_TEMPLATES: Record<string, StoryTemplate> = {
  theme_forest: {
    title: (child) => `Im Zauberwald mit ${child}`,
    coverEmoji: '🌲',
    sentences: (child, companion) => [
      `${child} wandert fröhlich in den großen Wald.`,
      companion ? `Der treue Begleiter ${companion} schnuppert neugierig am Moos.` : `Die Vögel singen hoch in den Bäumen ein schönes Lied.`,
      `Plötzlich raschelt ein kleines Eichhörnchen im dichten Laub.`,
      `Auf einer Lichtung wachsen viele süße rote Beeren.`,
      `${child} lächelt zufrieden über den schönen Waldspaziergang.`,
    ],
  },
  theme_wizard: {
    title: (child) => `Die Zauberschule von ${child}`,
    coverEmoji: '🧙',
    sentences: (child, companion) => [
      `${child} schwingt den glänzenden Zauberstab durch die Luft.`,
      companion ? `${companion} schaut gespannt auf den funkelnden Sternenstaub.` : `Aus dem Zauberhut springt ein lustiger kleiner Frosch.`,
      `Ein leiser Zauberspruch lässt bunte Seifenblasen aufsteigen.`,
      `Im Kessel blubbert ein geheimnisvoller goldener Trank.`,
      `${child} freut sich riesig über den gelungenen Zaubertrick.`,
    ],
  },
  theme_horse: {
    title: (child) => `${child} auf dem Pferdehof`,
    coverEmoji: '🐴',
    sentences: (child, companion) => [
      `${child} striegelt das weiche Fell des weißen Pferdes.`,
      companion ? `${companion} läuft fröhlich neben der Koppel her.` : `Das Pferd schnaubt sanft und kaut an frischem Heu.`,
      `Gemeinsam reiten sie über die sonnige grüne Wiese.`,
      `Der Wind weht sanft durch die lange Mähne.`,
      `${child} gibt dem Pferd einen knackigen roten Apfel.`,
    ],
  },
  theme_unicorn: {
    title: (child) => `${child} und das Wunder-Einhorn`,
    coverEmoji: '🦄',
    sentences: (child, companion) => [
      `${child} sieht einen leuchtenden Regenbogen am Himmel.`,
      `Am Ende des Bogens steht ein wunderschönes Einhorn.`,
      companion ? `${companion} begrüßt das Einhorn mit fröhlichem Blick.` : `Das goldene Horn glitzert hell im warmen Sonnenlicht.`,
      `Das Einhorn zaubert bunte Blumen auf den Pfad.`,
      `${child} streichelt sanft die samtige Mähne.`,
    ],
  },
  theme_superhero: {
    title: (child) => `Superheld ${child} im Einsatz`,
    coverEmoji: '🦸',
    sentences: (child, companion) => [
      `${child} bindet den roten Helden-Umhang fest um die Schultern.`,
      companion ? `Als mutiges Team fliegen ${child} und ${companion} los.` : `Mit schnellen Schritten eilt ${child} zur Hilfe.`,
      `Eine kleine Katze sitzt ängstlich auf dem hohen Baum.`,
      `${child} klettert geschickt hoch und rettet das Kätzchen.`,
      `Alle Menschen im Park jubeln dem tapferen Helden zu.`,
    ],
  },
  theme_ocean: {
    title: (child) => `${child} am blauen Meer`,
    coverEmoji: '🌊',
    sentences: (child, companion) => [
      `${child} baut eine riesige Sandburg am warmen Strand.`,
      companion ? `${companion} jagt vergnügt den kleinen Schaumwellen hinterher.` : `Eine bunte Muschel liegt glänzend im weichen Sand.`,
      `Draußen im Wasser springt ein fröhlicher Delfin hoch.`,
      `Kleine Fische schwimmen neugierig um die Steine.`,
      `${child} genießt die frische Meeresbrise am Ufer.`,
    ],
  },
  theme_treasure: {
    title: (child) => `${child} findet den Goldschatz`,
    coverEmoji: '💎',
    sentences: (child, companion) => [
      `${child} entdeckt eine geheimnisvolle alte Schatzkarte.`,
      companion ? `Gemeinsam mit ${companion} folgt ${child} den roten Kreuzen.` : `Ein geheimer Pfad führt zu einer verborgenen Höhle.`,
      `Unter einem großen Felsen liegt eine schwere Holzkiste.`,
      `Der Deckel springt auf und glänzende Edelsteine funkeln.`,
      `${child} jubelt laut über den fantastischen Fund.`,
    ],
  },
  theme_pirate: {
    title: (child) => `Kapitän ${child} auf hoher See`,
    coverEmoji: '🏴‍☠️',
    sentences: (child, companion) => [
      `${child} hisst die großen Segel auf dem Holzschiff.`,
      companion ? `Der treue Schiffskumpan ${companion} hält am Bug Ausschau.` : `Ein bunter Papagei sitzt oben im Ausguck und krächzt.`,
      `Das Schiff gleitet majestätisch durch die wilden Wellen.`,
      `Am Horizont taucht eine einsame Palmeninsel auf.`,
      `${child} dreht das Steuerrad fest in Richtung Abenteuer.`,
    ],
  },
  theme_dino: {
    title: (child) => `${child} im Land der Dinosaurier`,
    coverEmoji: '🦕',
    sentences: (child, companion) => [
      `${child} wandert durch den uralten riesigen Dschungel.`,
      `Der Boden bebt leise bei jedem schweren Schritt.`,
      companion ? `${companion} staunt über die riesige Fußspur im Schlamm.` : `Ein freundlicher Brachiosaurus frisst Blätter von den Wipfeln.`,
      `Ein kleiner Dino schlüpft neugierig aus einem großen Ei.`,
      `${child} winkt dem kleinen Saurier freundlich zu.`,
    ],
  },
  theme_space: {
    title: (child) => `${child} fliegt zu den Sternen`,
    coverEmoji: '🚀',
    sentences: (child, companion) => [
      `${child} setzt den glänzenden Astronautenhelm auf.`,
      companion ? `Zusammen mit ${companion} startet der Countdown der Rakete.` : `Drei, zwei, eins und die Triebwerke zünden laut.`,
      `Die Rakete schießt hoch in den dunklen Sternenhimmel.`,
      `Draußen leuchtet der rote Planet Mars in weiter Ferne.`,
      `${child} blickt staunend auf die wunderschöne blaue Erde.`,
    ],
  },
};

/**
 * Generates a tailored StoryData object from a given StoryConfigPayload.
 */
export function generateStoryFromConfig(payload: StoryConfigPayload): StoryData {
  const themeKey = payload.theme.id;
  const template = THEME_TEMPLATES[themeKey] || THEME_TEMPLATES.theme_forest;

  const child = payload.childName || 'Lese-Held';
  const companion = payload.companion?.name;

  const title = template.title(child, companion);
  const sentenceList = template.sentences(child, companion);
  const fullText = sentenceList.join('\n');

  return {
    id: `story_${payload.theme.id}_lvl${payload.level}_${Date.now()}`,
    title,
    coverEmoji: template.coverEmoji || payload.theme.icon,
    levelSuitability: [payload.level],
    text: fullText,
  };
}
