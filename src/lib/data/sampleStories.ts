import type { StoryData } from '../types/reading';

export const SAMPLE_STORIES: StoryData[] = [
  {
    id: 'story-park-adventure',
    title: 'Ein schöner Tag im Park',
    coverEmoji: '🌳',
    levelSuitability: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    text: `Der kleine Begleiter {companion} läuft fröhlich über die grüne Wiese. 
Die Sonne scheint warm am blauen Himmel. 
Plötzlich sieht {companion} einen bunten Schmetterling im Gras. 
Der Schmetterling fliegt hoch zu den großen Blumen. 
{companion} springt vor Freude in die Luft.`,
  },
  {
    id: 'story-treasure-hunt',
    title: 'Die geheimnisvolle Schatzkiste',
    coverEmoji: '🗝️',
    levelSuitability: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    text: `Im alten Wald raschelt das Laub leise. 
{companion} findet eine kleine Kiste aus dunklem Holz. 
Ein goldener Schlüssel liegt direkt daneben. 
Das Schloss knackt und der Deckel öffnet sich langsam. 
Darin glitzern fünf wunderschöne bunte Sterne.`,
  },
  {
    id: 'story-space-trip',
    title: 'Reise zu den Sternen',
    coverEmoji: '🚀',
    levelSuitability: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    text: `Eine kleine silberne Rakete steht auf der Wiese. 
{companion} steigt mutig in die Rakete ein. 
Drei, zwei, eins und der Motor startet mit lautem Jubel. 
Oben am Nachthimmel leuchten die Sterne hell und freundlich. 
{companion} winkt der fernen Erde fröhlich zu.`,
  },
];
