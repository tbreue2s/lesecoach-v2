import fs from 'node:fs';
import path from 'node:path';
import { splitSyllables } from '../src/lib/utils/syllableSplitter';
import { cleanPunctuation, tokenizeStory } from '../src/lib/utils/tokenizer';

interface StoryDef {
  themeId: string;
  level: number;
  episode: number;
  disturberWord: string;
  title: string;
  sentences: string[];
}

const STORIES: StoryDef[] = [
  // Thema 1: Wald & Bäume
  {
    themeId: 'theme_forest',
    level: 1,
    episode: 1,
    disturberWord: 'Sofa',
    title: 'Das Sofa im Moos',
    sentences: [
      'Paul wandert leise über das weiche Moos.',
      'Mitten im Wald steht ein rotes Sofa.',
      'Darauf schläft friedlich ein kleiner dicker Igel.',
      'Kichernd rollt der Igel vom weichen Sofa.',
    ],
  },
  {
    themeId: 'theme_forest',
    level: 1,
    episode: 2,
    disturberWord: 'Ufo',
    title: 'Der Hut auf dem Ufo',
    sentences: [
      'Leise landet ein winziges silbernes Ufo.',
      'Neugierig hoppelt ein kleiner brauner Hase heran.',
      'Frech setzt er seinen spitzen Hut darauf.',
      'Blinkend düst das Ufo mit dem Hut davon.',
    ],
  },
  {
    themeId: 'theme_forest',
    level: 1,
    episode: 3,
    disturberWord: 'Biber',
    title: 'Der Biber am See',
    sentences: [
      'Kalle sitzt gemütlich am ruhigen blauen See.',
      'Aus dem Wasser lugt ein fleißiger Biber.',
      'Flink schnappt das Tier ein kleines Boot.',
      'Stolz schiebt der Biber das Boot ans Ufer.',
    ],
  },

  // Thema 2: Zauberer
  {
    themeId: 'theme_wizard',
    level: 1,
    episode: 1,
    disturberWord: 'Zauberhut',
    title: 'Der freche Zauberhut',
    sentences: [
      'Anton setzt seinen spitzen Hut auf.',
      'Plötzlich hüpft der Hut auf den Kater.',
      'Erschrocken flitzt das Tier unter das Sofa.',
      'Nun wedelt der Kater mit dem Hut.',
    ],
  },
  {
    themeId: 'theme_wizard',
    level: 1,
    episode: 2,
    disturberWord: 'Torte',
    title: 'Die tanzende Torte',
    sentences: [
      'Auf dem Tisch steht eine dicke Torte.',
      'Fröhlich tanzt die Torte um den Besen.',
      'Lilly schnappt eilig nach der süßen Torte.',
      'Platsch landet süße Sahne auf ihrer Nase.',
    ],
  },
  {
    themeId: 'theme_wizard',
    level: 1,
    episode: 3,
    disturberWord: 'Limo',
    title: 'Der Zaubertrank im Glas',
    sentences: [
      'Paul rührt den Zaubertrank im bunten Glas.',
      'Daraus perlt plötzlich herrlich frische blaue Limo.',
      'Neugierig schleckt der dicke Kater am Glas.',
      'Glucksend rülpst der Kater nun blaue Limo.',
    ],
  },

  // Thema 3: Pferde
  {
    themeId: 'theme_horse',
    level: 1,
    episode: 1,
    disturberWord: 'Hut',
    title: 'Das Pony frisst den Hut',
    sentences: [
      'Lilly fegt vergnügt über den weiten Hof.',
      'Stolz trägt das Mädchen einen neuen Hut.',
      'Leise schleicht ein kleines Pony über den Hof.',
      'Mampfend kaut das Pony an dem Hut.',
    ],
  },
  {
    themeId: 'theme_horse',
    level: 1,
    episode: 2,
    disturberWord: 'Klee',
    title: 'Das Rennen im Klee',
    sentences: [
      'Das freche Pony trabt durch den Klee.',
      'Am Zaun wartet ein schneller kleiner Hase.',
      'Gemeinsam sausen die Tiere um den Hof.',
      'Plumps rutscht das Pony in den Klee.',
    ],
  },
  {
    themeId: 'theme_horse',
    level: 1,
    episode: 3,
    disturberWord: 'Esel',
    title: 'Der Apfel auf der Nase',
    sentences: [
      'Kalle steht mit einem Apfel am Tor.',
      'Neugierig streckt ein kleiner Esel seine Nase.',
      'Geschickt balanciert das Tier den Apfel am Tor.',
      'Schmatzend schnappt der Esel ihn mit der Nase.',
    ],
  },

  // Thema 4: Einhörner
  {
    themeId: 'theme_unicorn',
    level: 1,
    episode: 1,
    disturberWord: 'Torte',
    title: 'Das Horn in der Torte',
    sentences: [
      'Das kleine Einhorn trabt durch das Tal.',
      'Am Wegesrand duftet eine riesige rosa Torte.',
      'Neugierig piekst das Tier in die Torte.',
      'Puff klebt bunte Creme an seiner Nase.',
    ],
  },
  {
    themeId: 'theme_unicorn',
    level: 1,
    episode: 2,
    disturberWord: 'Sofa',
    title: 'Das Einhorn auf dem Sofa',
    sentences: [
      'Mitten im weichen Moos zaubert eine Fee.',
      'Plötzlich steht dort ein himmelblaues kleines Sofa.',
      'Das müde Einhorn klettert auf das Sofa.',
      'Lachend kitzelt die Fee seine vier Beine.',
    ],
  },
  {
    themeId: 'theme_unicorn',
    level: 1,
    episode: 3,
    disturberWord: 'Blume',
    title: 'Der Frosch am See',
    sentences: [
      'Das weiße Einhorn spaziert an den See.',
      'Durstig senkt es den Kopf am Ufer.',
      'Auf einem Blatt duftet eine bunte Blume.',
      'Ein kleiner Frosch hüpft vom Ufer darauf.',
    ],
  },

  // Thema 5: Superhelden
  {
    themeId: 'theme_superhero',
    level: 1,
    episode: 1,
    disturberWord: 'Kater',
    title: 'Der Kater im Umhang',
    sentences: [
      'Finn saust mit rotem Umhang zum Hafen.',
      'Dort übt ein mutiger kleiner dicker Kater.',
      'Mit großem Mut springt er am Hafen.',
      'Plumps landet der Kater in einem Karton.',
    ],
  },
  {
    themeId: 'theme_superhero',
    level: 1,
    episode: 2,
    disturberWord: 'Bus',
    title: 'Das Eis im Bus',
    sentences: [
      'Laut quietschend stoppt ein großer bunter Bus.',
      'Aus dem Fenster spritzt herrlich kühle Limo.',
      'Lilly hält schmunzelnd ihren breiten Hut unter.',
      'Voll mit Limo schwappt nun der Hut.',
    ],
  },
  {
    themeId: 'theme_superhero',
    level: 1,
    episode: 3,
    disturberWord: 'Hose',
    title: 'Der Flug über das Tor',
    sentences: [
      'Paul springt mutig über das hohe Tor.',
      'Doch der Haken packt seine bunte Hose.',
      'Nun baumelt der kleine Held am Tor.',
      'Unten bellt ein kleiner Hund vor dem Tor.',
    ],
  },

  // Thema 6: Wasser & Meer
  {
    themeId: 'theme_ocean',
    level: 1,
    episode: 1,
    disturberWord: 'Nixe',
    title: 'Die Nixe klaut das Ruder',
    sentences: [
      'Lilly rudert gemütlich über den weiten See.',
      'Plötzlich wackelt ihr kleines hölzernes Boot.',
      'Eine freche Nixe schnappt nach dem Ruder.',
      'Lachend kreist Lilly nun auf dem See.',
    ],
  },
  {
    themeId: 'theme_ocean',
    level: 1,
    episode: 2,
    disturberWord: 'Wal',
    title: 'Die Fontäne vom Wal',
    sentences: [
      'Paul fährt mit dem Boot aufs Meer.',
      'Neben ihm taucht ein riesiger sanfter Wal.',
      'Eine feuchte Fontäne pustet seinen bunten Hut.',
      'Hoch oben im Wind kreist der Hut.',
    ],
  },
  {
    themeId: 'theme_ocean',
    level: 1,
    episode: 3,
    disturberWord: 'Krake',
    title: 'Die Krake mit der Krone',
    sentences: [
      'Anton läuft barfuß an dem sonnigen Ufer.',
      'Im seichten Wasser funkelt eine goldene Krone.',
      'Flink schnappt eine fröhliche Krake die Krone.',
      'Mit acht Armen tanzt die bunte Krake.',
    ],
  },

  // Thema 7: Schatzsuche
  {
    themeId: 'theme_treasure',
    level: 1,
    episode: 1,
    disturberWord: 'Dose',
    title: 'Die Kiste im Moos',
    sentences: [
      'Paul sucht im Wald mit der Lupe.',
      'Tief im weichen Moos liegt eine Dose.',
      'Neugierig öffnet Paul die alte runde Dose.',
      'Daraus hüpft frech ein kleiner grüner Frosch.',
    ],
  },
  {
    themeId: 'theme_treasure',
    level: 1,
    episode: 2,
    disturberWord: 'Krone',
    title: 'Die Krone auf dem Sofa',
    sentences: [
      'Krümel schleicht in die Höhle im Tal.',
      'In der Kiste glänzt eine goldene Krone.',
      'Neugierig tapst der dicke Kater heran.',
      'Die Krone rutscht dem Kater über beide Ohren.',
    ],
  },
  {
    themeId: 'theme_treasure',
    level: 1,
    episode: 3,
    disturberWord: 'Boot',
    title: 'Der Schatz am Ufer',
    sentences: [
      'Lilly lenkt ihr kleines Holz-Boot ans Ufer.',
      'Im nassen Sand funkelt eine weiße Perle.',
      'Freudig hebt das Mädchen die runde Perle.',
      'Kichernd hüpft Lilly zurück in das Boot.',
    ],
  },

  // Thema 8: Piraten
  {
    themeId: 'theme_pirate',
    level: 1,
    episode: 1,
    disturberWord: 'Sofa',
    title: 'Das Sofa auf dem Piraten-Schiff',
    sentences: [
      'Anton fischt ein rotes Sofa aus dem Meer.',
      'Sofort hüpft der dicke Kater aufs Sofa.',
      'Eine schaukelnde Welle rollt über das Meer.',
      'Rutschig saust der Kater mit dem Sofa.',
    ],
  },
  {
    themeId: 'theme_pirate',
    level: 1,
    episode: 2,
    disturberWord: 'Hut',
    title: 'Der Papagei mit dem Hut',
    sentences: [
      'Lilly steht stolz auf ihrem kleinen Boot.',
      'Auf dem Kopf wackelt ein riesiger Hut.',
      'Frech landet ein bunter Vogel auf dem Hut.',
      'Puff rutscht der Hut über beide Augen.',
    ],
  },
  {
    themeId: 'theme_pirate',
    level: 1,
    episode: 3,
    disturberWord: 'Limo',
    title: 'Die Limo auf der Insel',
    sentences: [
      'Finn rudert mit dem Boot zur Insel.',
      'Im Sand vergraben liegt keine goldene Perle.',
      'In der Kiste sprudelt kühle rote Limo.',
      'Fröhlich schlürfen die Piraten nun süße Limo.',
    ],
  },

  // Thema 9: Dinosaurier
  {
    themeId: 'theme_dino',
    level: 1,
    episode: 1,
    disturberWord: 'Ufo',
    title: 'Dino und das Mini-Ufo',
    sentences: [
      'Ein großer Dino stapft durch das Tal.',
      'Vor seinen Füßen landet ein winziges Ufo.',
      'Neugierig stupst der Dino an das Ufo.',
      'Blinkend dreht sich das Ufo im Tal.',
    ],
  },
  {
    themeId: 'theme_dino',
    level: 1,
    episode: 2,
    disturberWord: 'Dino',
    title: 'Der Riesen-Nieser im Gras',
    sentences: [
      'Der hungrige Dino kaut am frischen Gras.',
      'Eine freche kleine Fliege kitzelt seine Nase.',
      'Laut schnaubt der Dino durch die Nase.',
      'Hatschi wirbelt der Dino durch das Gras.',
    ],
  },
  {
    themeId: 'theme_dino',
    level: 1,
    episode: 3,
    disturberWord: 'Sofa',
    title: 'Der Dino auf dem Sofa',
    sentences: [
      'Mitten im weichen Moos steht ein Sofa.',
      'Müde tapst der schwere Dino ans Sofa.',
      'Mit Schwung plumpst der Dino aufs Sofa.',
      'Fest steckt der dicke Dino im Sofa.',
    ],
  },

  // Thema 10: Weltall & Sterne
  {
    themeId: 'theme_space',
    level: 1,
    episode: 1,
    disturberWord: 'Torte',
    title: 'Die schwebende Torte im All',
    sentences: [
      'Anton steuert sein schnelles Ufo als Pilot.',
      'Auf dem Tisch schwebt eine süße Torte.',
      'Schwerelos tanzt die Torte um den Pilot.',
      'Mampf schnappt der Pilot nach der Torte.',
    ],
  },
  {
    themeId: 'theme_space',
    level: 1,
    episode: 2,
    disturberWord: 'Sofa',
    title: 'Das Sofa auf dem Mond',
    sentences: [
      'Lilly landet sanft auf dem fremden Planet.',
      'Im Mondstaub steht ein bequemes rotes Sofa.',
      'Vergnügt hüpft der dicke Kater aufs Sofa.',
      'Boing federt der Kater hoch vom Sofa.',
    ],
  },
  {
    themeId: 'theme_space',
    level: 1,
    episode: 3,
    disturberWord: 'Limo',
    title: 'Die Limo-Panne im Ufo',
    sentences: [
      'Paul fliegt vergnügt mit seinem runden Ufo.',
      'Aus der Flasche perlt sprudelnd süße Limo.',
      'Bunte Blubberblasen tanzen durch das Ufo.',
      'Schlürfend fängt Paul jeden Tropfen Limo.',
    ],
  },
];

console.log(`Applying depth editorial update to ${STORIES.length} Level 1 stories...`);

const baseDir = path.resolve('src/lib/data/stories/level-1');

for (const story of STORIES) {
  const structuredSentences = story.sentences.map((sentText) => {
    const rawWords = sentText.split(/\s+/).filter((w) => w.length > 0);
    const words = rawWords.map((word) => {
      const clean = cleanPunctuation(word);
      const syllables = splitSyllables(clean.length > 0 ? clean : word);
      return {
        clean,
        syllables: syllables.length > 0 ? syllables : [clean],
      };
    });
    return {
      text: sentText,
      words,
    };
  });

  const fullText = story.sentences.join('\n');
  const tokenized = tokenizeStory(fullText, 1, 'Bello', 'Emil', { sentences: structuredSentences });

  // Verification
  if (tokenized.length !== 4) {
    throw new Error(`Story ${story.themeId} ep${story.episode} has ${tokenized.length} sentences instead of 4!`);
  }

  for (let sIdx = 0; sIdx < tokenized.length; sIdx++) {
    const sent = tokenized[sIdx];
    const childWords = sent.words.filter((w) => w.role === 'child');
    if (childWords.length === 0) {
      console.warn(`WARNING: Story ${story.themeId} ep${story.episode} sentence ${sIdx + 1} has role: app! (Text: "${sent.rawText}")`);
    } else {
      // console.log(`  ${story.themeId} ep${story.episode} S${sIdx + 1}: Child reads "${childWords.map(w => w.cleanWord).join(', ')}"`);
    }
  }

  const fileData = {
    themeId: story.themeId,
    level: 1,
    episode: story.episode,
    disturberWord: story.disturberWord,
    title: story.title,
    sentences: structuredSentences,
  };

  const filename = `${story.themeId}_ep0${story.episode}.json`;
  const filePath = path.join(baseDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2) + '\n', 'utf8');
}

console.log('Successfully updated all 30 Level 1 story JSON files!');
