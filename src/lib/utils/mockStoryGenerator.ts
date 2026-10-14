import type { StoryConfigPayload } from '../types/storyConfig';
import type { StoryData, GeneratedStoryOutput, GeneratedSentence, ReadingLevelNumber } from '../types/reading';
import { cleanPunctuation } from './tokenizer';
import { splitSyllables } from './syllableSplitter';

/**
 * Builds structured sentences matching the WP08 JSON mandate with pre-split syllables.
 */
export function buildStructuredStoryOutput(sentenceStrings: string[]): GeneratedStoryOutput {
  const sentences: GeneratedSentence[] = sentenceStrings.map((sentenceText) => {
    const rawWords = sentenceText.split(/\s+/).filter((w) => w.length > 0);
    const words = rawWords.map((word) => {
      const clean = cleanPunctuation(word);
      const effectiveWord = clean.length > 0 ? clean : word;
      const syllables = splitSyllables(effectiveWord);

      return {
        clean,
        syllables: syllables.length > 0 ? syllables : [clean],
      };
    });

    return {
      text: sentenceText,
      words,
    };
  });

  return { sentences };
}

/**
 * Serializes the generated story into a strictly conforming JSON string according to WP08 mandate.
 */
export function generateStoryJson(payload: StoryConfigPayload): string {
  const story = generateStoryFromConfig(payload);
  const structured = story.structuredOutput || buildStructuredStoryOutput(story.text.split('\n'));
  return JSON.stringify(structured, null, 2);
}

// Level 1 sentences: Exactly 4 sentences, 4-5 words per sentence, S-P-O main clauses,
// 1-2 syllables, no composites, no ß/ck/tz/pf, no consonant clusters (sch, sp, st).
const LEVEL_1_TEMPLATES: Record<string, (child: string, comp?: string) => string[]> = {
  theme_forest: (child, comp) => [
    `${child} geht in den Wald.`,
    comp ? `${comp} rennt um den Baum.` : `Ein Hund rennt umher.`,
    `${child} sieht einen Baum.`,
    `Ein Vogel ruft laut.`,
  ],
  theme_wizard: (child, comp) => [
    `${child} hat einen Hut.`,
    comp ? `${comp} mag den Hut.` : `Der Hut liegt da.`,
    `${child} malt ein Bild.`,
    `Das Bild hat Gold.`,
  ],
  theme_horse: (child, comp) => [
    `${child} geht zum Pony.`,
    comp ? `${comp} rennt im Kreis.` : `Das Pony mag Heu.`,
    `${child} holt ein Bund Heu.`,
    `Das Pony wiehert laut.`,
  ],
  theme_unicorn: (child, comp) => [
    `${child} sieht ein Tier.`,
    `Das Tier hat ein Horn.`,
    comp ? `${comp} folgt dem Tier.` : `Das Tier rennt fort.`,
    `${child} liebt das Tier.`,
  ],
  theme_superhero: (child, comp) => [
    `${child} hat einen Umhang.`,
    `Der Umhang weht im Wind.`,
    comp ? `${comp} eilt nun herbei.` : `Ein Hund eilt herbei.`,
    `${child} rettet ein Kind.`,
  ],
  theme_ocean: (child, comp) => [
    `${child} geht zum Meer.`,
    comp ? `${comp} rennt im Sand.` : `Der Sand liegt da.`,
    `${child} holt einen Ball.`,
    `Der Ball rollt weit.`,
  ],
  theme_treasure: (child, comp) => [
    `${child} sucht den Weg.`,
    `Der Weg geht weit.`,
    comp ? `${comp} gräbt im Boden.` : `Ein Hund gräbt da.`,
    `${child} hebt Gold hoch.`,
  ],
  theme_pirate: (child, comp) => [
    `${child} rudert ein Boot.`,
    `Das Boot fährt weit.`,
    comp ? `${comp} bellt am Boot.` : `Ein Vogel ruft laut.`,
    `${child} lenkt das Boot.`,
  ],
  theme_dino: (child, comp) => [
    `${child} geht durch den Wald.`,
    `Ein Dino ruft laut.`,
    comp ? `${comp} hört den Ruf.` : `Der Ruf hallt weit.`,
    `${child} füttert den Dino.`,
  ],
  theme_space: (child, comp) => [
    `${child} sieht ein Ufo.`,
    `Das Ufo hat Gas.`,
    comp ? `${comp} geht zum Ufo.` : `Ein Mann geht zum Ufo.`,
    `${child} malt das Ufo.`,
  ],
};

// Level 2 sentences: 4-5 sentences, including simple noun phrases (Article/Adjective + Noun),
// max 3 syllables per word, combined phrase syllables <= 4.
const LEVEL_2_TEMPLATES: Record<string, (child: string, comp?: string) => string[]> = {
  theme_forest: (child, comp) => [
    `${child} sieht den hohen Baum.`,
    comp ? `Der kleine ${comp} schnuppert neugierig am Moos.` : `Ein bunter Vogel singt hoch im Baum.`,
    `${child} pflückt eine rote Beere.`,
    `Der grüne Wald duftet herrlich frisch.`,
  ],
  theme_wizard: (child, comp) => [
    `${child} hält den langen Stab.`,
    comp ? `Der treue ${comp} staunt über das Licht.` : `Ein kleiner Frosch hüpft aus dem Hut.`,
    `${child} rührt den warmen Trank.`,
    `Der blaue Nebel steigt leise auf.`,
  ],
  theme_horse: (child, comp) => [
    `${child} striegelt das weiße Pferd.`,
    comp ? `Der liebe ${comp} rennt um die Koppel.` : `Das braune Fohlen kaut frisches Gras.`,
    `${child} gibt dem Tier einen roten Apfel.`,
    `Die weite Wiese glänzt in der Sonne.`,
  ],
  theme_unicorn: (child, comp) => [
    `${child} entdeckt das weiße Einhorn.`,
    comp ? `Der mutige ${comp} winkt dem Wesen zu.` : `Das scheue Wesen steht am Bach.`,
    `Das goldene Horn leuchtet am Himmel.`,
    `${child} streichelt die samtige Mähne.`,
  ],
  theme_superhero: (child, comp) => [
    `${child} bindet den roten Umhang um.`,
    comp ? `Gemeinsam mit ${comp} eilt die Rettung herbei.` : `Schnell wie der Blitz läuft die Hilfe los.`,
    `${child} rettet die kleine Katze.`,
    `Die dankbare Stadt jubelt laut im Park.`,
  ],
  theme_ocean: (child, comp) => [
    `${child} baut eine feine Burg.`,
    comp ? `Der fröhliche ${comp} jagt die schäumende Welle.` : `Eine bunte Muschel glänzt im Sand.`,
    `Ein schneller Delfin springt aus dem Meer.`,
    `${child} spürt den kühlen Wind am Strand.`,
  ],
  theme_treasure: (child, comp) => [
    `${child} liest die alte Karte.`,
    comp ? `Der schlaue ${comp} schnüffelt am Felsen.` : `Ein geheimer Weg führt in die Höhle.`,
    `${child} öffnet die schwere Kiste.`,
    `Der helle Schatz glänzt wunderbar.`,
  ],
  theme_pirate: (child, comp) => [
    `${child} hisst das weiße Segel.`,
    comp ? `Der treue ${comp} steht am hohen Bug.` : `Ein bunter Vogel ruft vom Mast.`,
    `Das stolze Schiff gleitet über die Welle.`,
    `${child} blickt auf die ferne Insel.`,
  ],
  theme_dino: (child, comp) => [
    `${child} findet eine riesige Spur.`,
    comp ? `Der kleine ${comp} schnuppert am feuchten Boden.` : `Ein großer Saurier frisst saftige Blätter.`,
    `${child} sieht das runde Ei im Nest.`,
    `Der junge Dino begrüßt das Kind.`,
  ],
  theme_space: (child, comp) => [
    `${child} steuert das weiße Raumschiff.`,
    comp ? `Der neugierige ${comp} blickt aus dem Fenster.` : `Ein fremder Planet leuchtet in der Nacht.`,
    `${child} sieht die runde Erde im All.`,
    `Die hellen Sterne funkeln ohne Pause.`,
  ],
};

// Level 3 sentences: 4-6 sentences, mini-phrases, simple actions
const LEVEL_3_TEMPLATES: Record<string, (child: string, comp?: string) => string[]> = {
  theme_forest: (child, comp) => [
    `${child} geht tief in den Wald hinein.`,
    comp ? `${comp} rennt flink über das weiche Moos.` : `Viele Vögel zwitschern hoch in den Kronen.`,
    `Unter den Blättern wachsen kleine Pilze.`,
    `${child} findet eine geheime Höhle im Felsen.`,
    `Gemeinsam lauschen sie dem leisen Wind.`,
  ],
  theme_wizard: (child, comp) => [
    `${child} öffnet das große Zauberbuch.`,
    comp ? `${comp} beobachtet gespannt die bunten Funken.` : `Aus dem Buch steigen goldene Sterne auf.`,
    `Ein geheimer Spruch lässt den Tisch schweben.`,
    `${child} lacht fröhlich über den Zaubertrick.`,
  ],
  theme_horse: (child, comp) => [
    `${child} führt das Pony auf die Koppel.`,
    comp ? `${comp} springt lustig über kleine Hürden.` : `Das Pony trabt gemächlich im weichen Sand.`,
    `In der Sonne glänzt das seidige Fell.`,
    `${child} schenkt dem Pony eine süße Mohrrübe.`,
  ],
  theme_unicorn: (child, comp) => [
    `${child} folgt dem glitzernden Pfad im Wald.`,
    comp ? `${comp} läuft staunend neben dem Wunderwesen.` : `Ein leuchtender Regenbogen berührt den Boden.`,
    `Das Einhorn neigt sanft seinen schönen Kopf.`,
    `${child} fühlt sich geborgen und glücklich.`,
  ],
  theme_superhero: (child, comp) => [
    `${child} zieht die magischen Heldenstiefel an.`,
    comp ? `${comp} bellt mutig als treuer Begleiter.` : `Ein Notruf ertönt mitten auf dem Marktplatz.`,
    `Mit einem weiten Sprung landet ${child} sicher.`,
    `Alle freuen sich über die schnelle Hilfe.`,
  ],
  theme_ocean: (child, comp) => [
    `${child} wandert barfuß am Ufer entlang.`,
    comp ? `${comp} planscht vergnügt im seichten Wasser.` : `Sanfte Schaumkronen tanzen auf den Wellen.`,
    `Eine große Schildkröte schwimmt am Riff vorbei.`,
    `${child} sammelt zehn glatte Kieselsteine auf.`,
  ],
  theme_treasure: (child, comp) => [
    `${child} folgt den roten Schritten im Sand.`,
    comp ? `${comp} buddelt eifrig ein tiefes Loch.` : `Zwischen zwei Palmen liegt ein alter Schlüssel.`,
    `Der Schlüssel passt genau in das Schloss.`,
    `${child} staunt über glänzende Goldmünzen.`,
  ],
  theme_pirate: (child, comp) => [
    `${child} dreht das Steuerrad nach Westen.`,
    comp ? `${comp} hält treu auf der Brücke Wache.` : `Der Wind bläst kräftig in das große Tuch.`,
    `Am Horizont taucht ein grünes Ufer auf.`,
    `${child} ruft laut: Land in Sicht!`,
  ],
  theme_dino: (child, comp) => [
    `${child} wandert durch dichte Riesenfarne.`,
    comp ? `${comp} versteckt sich hinter einem dicken Stamm.` : `Ein gutmütiger Langhals kaut an Palmwedeln.`,
    `Der Waldboden vibriert bei jedem Schritt.`,
    `${child} winkt dem friedlichen Riesen zu.`,
  ],
  theme_space: (child, comp) => [
    `${child} schaut durch das runde Teleskop.`,
    comp ? `${comp} schwebt lustig in der Kabine.` : `Draußen kreist eine silbrige Raumstation.`,
    `Der Schwebezustand fühlt sich federleicht an.`,
    `${child} genießt die Aussicht auf die Galaxie.`,
  ],
};

// Level 4 & 5 templates: Tandem-Reading with alternating App and Child sentences
const LEVEL_4_5_TEMPLATES: Record<string, (child: string, comp?: string) => string[]> = {
  theme_forest: (child, comp) => [
    `${child} wandert am frühen Morgen froh in den großen Zauberwald.`,
    comp ? `${comp} schnuppert neugierig am Moos.` : `Ein bunter Vogel singt hoch im Baum.`,
    `Zwischen den hohen Eichen rascheln die trockenen Blätter im leisen Herbstwind.`,
    `${child} sammelt rote Beeren auf.`,
    `Auf einer sonnigen Waldlichtung machen sie eine gemütliche Rast im weichen Moos.`,
    `Der schöne Waldspaziergang macht riesigen Spaß.`,
  ],
  theme_wizard: (child, comp) => [
    `${child} betritt heute zum ersten Mal die geheimnisvolle Zauberakademie.`,
    comp ? `${comp} schaut auf die Funken.` : `Aus dem Kessel steigt Rauch auf.`,
    `In den Regalen stapeln sich uralte Zauberbücher mit goldenen Buchdeckeln.`,
    `${child} spricht den geheimen Spruch.`,
    `Plötzlich tanzen unzählige bunte Seifenblasen durch das gesamte Zimmer.`,
    `Alle Zauberschüler klatschen begeistert in die Hände.`,
  ],
  theme_horse: (child, comp) => [
    `Die warme Morgensonne scheint hell auf die weite Pferdekoppel am Waldrand.`,
    comp ? `${comp} läuft fröhlich umher.` : `Das weiße Pferd wiehert laut.`,
    `${child} striegelt das weiche Fell des treuen Reitpferdes mit einer Bürste.`,
    `${child} gibt dem Pferd Heu.`,
    `Gemeinsam reiten sie über die blühenden Wiesen bis hinunter zum kleinen Bach.`,
    `Der Ausritt war ein tolles Erlebnis für alle.`,
  ],
  theme_unicorn: (child, comp) => [
    `Ein wunderschöner Regenbogen spannt sich über das verwunschene Fabeltal.`,
    comp ? `${comp} begrüßt das weiße Wunderwesen.` : `Ein goldenes Horn glänzt hell im Licht.`,
    `Aus den bunten Blumen am Wegesrand steigt ein feiner Glitzerstaub auf.`,
    `${child} streichelt das liebe Tier.`,
    `Das Einhorn neigt sanft seinen Kopf und berührt die Schulter des Kindes.`,
    `Ein Gefühl von reinem Zauber erfüllt die Luft.`,
  ],
  theme_superhero: (child, comp) => [
    `Über den Dächern der großen Stadt geht die leuchtende Morgensonne auf.`,
    comp ? `${comp} eilt mutig zur Hilfe herbei.` : `Ein Notruf ertönt aus dem Stadtpark.`,
    `${child} zieht den feuerroten Superhelden-Umhang fest um die beiden Schultern.`,
    `${child} rettet die kleine Katze.`,
    `Alle Parkbesucher applaudieren laut und danken dem mutigen Retter für die Hilfe.`,
    `Mit schnellen Schritten eilt das Team zum nächsten Einsatz.`,
  ],
  theme_ocean: (child, comp) => [
    `Die warmen Sonnenstrahlen glitzern auf den sanften Wellen des weiten Meeres.`,
    comp ? `${comp} jagt den kleinen Wellen hinterher.` : `Eine bunte Muschel liegt im weichen Sand.`,
    `${child} baut mit Schaufel und Eimer eine riesige Burg am Strand.`,
    `Ein fröhlicher Delfin springt hoch.`,
    `Aus dem blauen Wasser tauchen neugierige Fische auf und schwimmen um die Steine.`,
    `Die frische Meeresluft fühlt sich herrlich an.`,
  ],
  theme_treasure: (child, comp) => [
    `Tief im Inneren der alten Höhle brennt eine flackernde Fackel an der Steinwand.`,
    comp ? `${comp} schnüffelt an der Holzkiste.` : `Ein uraltes Schloss hält den Deckel fest.`,
    `${child} dreht den kunstvollen Messingschlüssel vorsichtig im rostigen Schloss herum.`,
    `${child} hebt die Truhe hoch.`,
    `Im Inneren funkeln unzählige goldene Münzen und funkelnde Edelsteine um die Wette.`,
    `Der fantastische Fund sorgt für lauten Jubel.`,
  ],
  theme_pirate: (child, comp) => [
    `Die stolze Dreimast-Galeone gleitet majestätisch durch die schäumende Gischt.`,
    comp ? `${comp} hält treu am Bug Ausschau.` : `Ein bunter Papagei krächzt oben im Mast.`,
    `${child} hält das hölzerne Steuerrad fest in Richtung der einsamen Schatzinsel.`,
    `${child} hisst das weiße Segel.`,
    `Am fernen Horizont tauchen die ersten grünen Palmenwipfel aus dem Nebel auf.`,
    `Das Abenteuer auf hoher See hat gerade erst begonnen.`,
  ],
  theme_dino: (child, comp) => [
    `Im uralten prähistorischen Dschungel wachsen riesige Schachtelhalme und Palmfarne.`,
    comp ? `${comp} staunt über die riesige Fußspur.` : `Ein gutmütiger Pflanzenfresser kaut an den Zweigen.`,
    `Der Boden erzittert bei jedem schweren Schritt des gewaltigen Urzeitriesen.`,
    `${child} füttert den friedlichen Dino.`,
    `Aus dem großen Nest im Moos schlüpft ein winziger Baby-Saurier aus der Schale.`,
    `Der kleine Dino piepst vergnügt und sucht Schutz.`,
  ],
  theme_space: (child, comp) => [
    `Der Countdown für den Raketenflug zählt die letzten Sekunden bis zum Start.`,
    comp ? `${comp} sitzt brav im Astronautensitz.` : `Die Triebwerke zünden mit lautem Dröhnen.`,
    `Mit gewaltiger Kraft schießt die silberne Raumkapsel in den schwarzen Kosmos empor.`,
    `${child} schaut auf die blaue Erde.`,
    `Draußen leuchtet die Milchstraße mit Milliarden funkelnder Sternensysteme und Kometen.`,
    `Das Raumschiff gleitet friedlich durch die Weiten des Alls.`,
  ],
};

// Level 6 templates: 5-6 sentences, full child reading with repeated reading
const LEVEL_6_TEMPLATES = LEVEL_4_5_TEMPLATES;

// Phase C (Level 7-9) templates: Longer passages
const LEVEL_7_TEMPLATES: Record<string, (child: string, comp?: string) => string[]> = {
  theme_forest: (child, comp) => [
    `${child} wandert früh am Morgen in den tiefen Wald hinein.`,
    comp ? `Der treue Begleiter ${comp} läuft vergnügt durch das Moos.` : `Überall raschelt es leise im dichten Farn.`,
    `Hoch oben in den Wipfeln singen die Drosseln ein schönes Lied.`,
    `An einer Lichtung entdeckt ${child} einen geheimen Pfad voller bunter Pilze.`,
    `Gemeinsam lauschen sie dem sanften Rauschen des nahen Baches.`,
  ],
  theme_wizard: (child, comp) => [
    `${child} schlägt das alte Zauberbuch auf dem Holztisch auf.`,
    comp ? `${comp} beobachtet aufmerksam den glimmenden Zauberstab.` : `Aus dem Kessel dampft ein duftender Tee.`,
    `Ein leiser Zauberspruch lässt bunte Lichter im Zimmer kreisen.`,
    `Goldener Sternenstaub legt sich sanft auf die dicken Bücherregale.`,
    `${child} freut sich riesig über den ersten gelungenen Zaubertrick.`,
  ],
  theme_horse: (child, comp) => [
    `${child} putzt das sanfte Pferd mit einer weichen Bürste.`,
    comp ? `${comp} läuft neugierig um die Zäune der Koppel herum.` : `Das Pferd schnaubt leise und frisst saftige Äpfel.`,
    `Auf dem Rücken des Pferdes geht es über die weite Wiese.`,
    `Der frische Wind weht kühl durch die lange weiße Mähne.`,
    `Zufrieden kehren sie am Abend in den warmen Stall zurück.`,
  ],
  theme_unicorn: (child, comp) => [
    `${child} wandert durch das verwunschene Tal der Einhörner.`,
    comp ? `An der Seite läuft ${comp} voller Neugier mit.` : `Ein feiner Glanz liegt über der gesamten Natur.`,
    `Am Ufer des Sees steht ein schneeweißes Fabelwesen mit goldenem Horn.`,
    `Das Einhorn blickt freundlich und lässt sich sanft am Hals kraulen.`,
    `Ein zauberhafter Moment voller Ruhe und Glück entsteht.`,
  ],
  theme_superhero: (child, comp) => [
    `Als die Sirene ertönt, schnallt ${child} die Rettungsausrüstung fest.`,
    comp ? `Gemeinsam mit ${comp} eilt das Team zur Hilfe herbei.` : `Im Park braucht eine kleine Katze dringend Schutz.`,
    `Mit mutigen Schritten klettert ${child} auf den hohen Ast hinauf.`,
    `Das Kätzchen schnurrt dankbar und kriecht vorsichtig in den Rucksack.`,
    `Alle Menschen im Park klatschen begeistert Beifall.`,
  ],
  theme_ocean: (child, comp) => [
    `Die warmen Wellen rollen sanft an den feinen Sandstrand.`,
    comp ? `${comp} springt fröhlich über die kleinen Schaumkronen.` : `Kleine Krebse huschen seitlich in ihre Höhlen im Sand.`,
    `${child} findet eine wunderbar schimmernde Muschel im nassen Ufer.`,
    `In der Ferne springt ein Delfin hoch aus dem blauen Wasser.`,
    `Die Sonne versinkt langsam am Horizont im Meer.`,
  ],
  theme_treasure: (child, comp) => [
    `${child} entrollt die vergilbte Pergamentkarte auf einem Felsblock.`,
    comp ? `${comp} schnüffelt eifrig an den roten Wegmarkierungen.` : `Zwischen zwei Palmen führt ein Pfad zum Versteck.`,
    `Nach einigem Suchen stößt die Schaufel auf harten Holzboden.`,
    `Unter dem Deckel glitzern funkelnde Münzen und silberne Ketten.`,
    `${child} jubelt laut über das erfolgreiche Forscherabenteuer.`,
  ],
  theme_pirate: (child, comp) => [
    `Das Piratenschiff setzt seine großen Segel im Morgenwind.`,
    comp ? `${comp} hält als Ausguck auf der Reling treu Ausschau.` : `Ein bunter Papagei flattert krächzend um den Mast.`,
    `${child} steuert das Schiff sicher an den gefährlichen Riffen vorbei.`,
    `Schon bald taucht die geheimnisvolle Schatzinsel aus dem Nebel auf.`,
    `Die Mannschaft bereitet das Landungsboot für die Fahrt vor.`,
  ],
  theme_dino: (child, comp) => [
    `${child} schleicht vorsichtig durch den uralten Riesenfarndschungel.`,
    comp ? `${comp} schnuppert neugierig an riesigen versteinerten Knochen.` : `Mächtige Baumriesen spenden kühlen Schatten vor der Sonne.`,
    `Ein friedlicher Langhalssaurier zupft saftige Triebe von den Ästen.`,
    `${child} beobachtet das friedliche Tier aus sicherer Entfernung.`,
    `Die Urzeitwelt hält überall faszinierende Geheimnisse bereit.`,
  ],
  theme_space: (child, comp) => [
    `Die moderne Raumkapsel kreist lautlos um die leuchtende Erde.`,
    comp ? `${comp} schwebt vergnügt im Zustand der Schwerelosigkeit.` : `Durch das dicke Fenster blicken sie auf die Ozeane.`,
    `${child} steuert den Flugcomputer mit präzisen Handbewegungen.`,
    `In der Ferne zieht ein glänzender Kometenschweif vorbei.`,
    `Das Universum beeindruckt mit seiner unendlichen Weite und Schönheit.`,
  ],
};

const LEVEL_8_TEMPLATES: Record<string, (child: string, comp?: string) => string[]> = {
  theme_forest: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_forest(child, comp),
    `Im weichen Moos entdecken sie frische Spuren eines scheuen Rehs.`,
    `Das Reh schaut mit großen dunklen Augen neugierig zwischen den Zweigen hervor.`,
    `${child} bleibt ganz still stehen, um das edle Waldtier nicht zu erschrecken.`,
    `Erst als die Dämmerung hereinbricht, wandern alle glücklich nach Hause zurück.`,
  ],
  theme_wizard: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_wizard(child, comp),
    `Im Kamin knistert ein behagliches Feuer, das den Raum wärmt.`,
    `Auf dem Schreibtisch tanzt eine kleine Feder von ganz allein im Takt.`,
    `${child} notiert fleißig die neuen Zauberformeln in ein kleines Heft.`,
    `Morgen wartet schon die nächste spannende Lektion in der Zauberschule.`,
  ],
  theme_horse: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_horse(child, comp),
    `Am Rand der Koppel blühen viele bunte Wiesenblumen im Sonnenschein.`,
    `${child} flechtet eine hübsche Schleife in die blonde Mähne des Pferdes.`,
    `Das treue Tier stupst das Kind sanft mit der weichen Nase an.`,
    `Ein perfekter Tag auf dem Reiterhof geht harmonisch zu Ende.`,
  ],
  theme_unicorn: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_unicorn(child, comp),
    `Das Horn des Einhorns berührt sanft die Knospe einer Blume.`,
    `Sofort entfaltet die Blüte prächtige Farben in allen Regenbogenfarben.`,
    `${child} atmet den süßen Duft der magischen Traumblume ein.`,
    `Dieses magische Wunder wird ${child} ganz bestimmt niemals vergessen.`,
  ],
  theme_superhero: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_superhero(child, comp),
    `Der Bürgermeister der Stadt überreicht eine glänzende Ehrenmedaille aus Gold.`,
    `${child} bedankt sich bescheiden bei allen Bürgern für das Vertrauen.`,
    `Zusammenhalt und Mut sind eben die stärksten Superkräfte von allen.`,
    `Die Stadt kann heute Nacht ganz beruhigt und friedlich schlafen.`,
  ],
  theme_ocean: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_ocean(child, comp),
    `Das Wasser funkelt im Abendlicht wie tausend kleine Diamanten.`,
    `${child} schreibt eine kurze Botschaft auf einen kleinen Zettel.`,
    `Vorsichtig wird die geheimnisvolle Flaschenpost den Wellen übergeben.`,
    `Wer weiß, an welchem fernen Strand sie eines Tages angespült wird.`,
  ],
  theme_treasure: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_treasure(child, comp),
    `Unter den Goldmünzen liegt ein alter Kompass mit feiner Gravur.`,
    `Die Nadel zeigt treu nach Norden und weist den Rückweg.`,
    `${child} verstaut die wertvollen Fundstücke sicher im Rucksack.`,
    `Ein neues großes Forscherabenteuer ist schon in Gedanken geplant.`,
  ],
  theme_pirate: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_pirate(child, comp),
    `Die Ankerkette rasselt laut ins klare Wasser der geschützten Bucht.`,
    `Gemeinsam rudern die Abenteurer mit kräftigen Schlägen an den Strand.`,
    `${child} setzt den Dreispitzhut gerade und betritt das fremde Ufer.`,
    `Ein neues Kapitel der großen Seefahrergeschichte hat begonnen.`,
  ],
  theme_dino: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_dino(child, comp),
    `Ein kleiner Flugsaurier kreist lautlos oben an den Felswänden.`,
    `${child} skizziert die Silhouette des Fliegers in das Notizbuch.`,
    `Jede neue Entdeckung in diesem Tal ist eine echte Sensation.`,
    `Mit unvergesslichen Erinnerungen treten sie den Heimweg durch den Dschungel an.`,
  ],
  theme_space: (child, comp) => [
    ...LEVEL_7_TEMPLATES.theme_space(child, comp),
    `Die Steuerdüsen zünden mit kurzen Stößen für das Wendemanöver.`,
    `Auf dem Radar zeichnet sich die geplante Umlaufbahn deutlich ab.`,
    `${child} funkt eine Nachricht an die Bodenstation auf der Erde.`,
    `Die erfolgreiche Mission wird als Meilenstein in die Geschichte eingehen.`,
  ],
};

const LEVEL_9_TEMPLATES: Record<string, (child: string, comp?: string) => string[]> = {
  theme_forest: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_forest(child, comp),
    `Auf dem Heimweg begegnen sie dem alten Förster mit seiner treuen Dackelhündin.`,
    `Er erzählt ${child} spannende Geschichten über die Geheimnisse der alten Eichen und Buchen.`,
    `Die Sterne funkeln nun hell durch das Blätterdach des nächtlichen Waldes.`,
    `Müde aber überglücklich schläft ${child} am Abend ein und träumt von neuen Abenteuern.`,
  ],
  theme_wizard: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_wizard(child, comp),
    `Der ehrwürdige Schulleiter der Zauberschule überreicht einen kleinen silbernen Stern.`,
    `Dieser Stern zeichnet besondere Klugheit und großen Fleiß beim Zaubern aus.`,
    `${child} steckt den Stern stolz an das Revers des feinen Zaubermantels.`,
    `Ein magisches Festmahl mit köstlichen Leckereien krönt diesen wunderbaren Festtag.`,
  ],
  theme_horse: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_horse(child, comp),
    `Im Stall verteilt ${child} noch frisches Stroh für die gemütliche Nachtruhe.`,
    `Das Pferd kaut zufrieden an seinem Futter und schnaubt leise zur Begrüßung.`,
    `Der Reiterhof ist ein wahrer Lieblingsort für Mensch und Tier geworden.`,
    `Voller Vorfreude plant ${child} bereits den nächsten Ausritt durch Wald und Flur.`,
  ],
  theme_unicorn: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_unicorn(child, comp),
    `Als Dankeschön schenkt das Einhorn dem Kind eine winzige glitzernde Sternschnuppe.`,
    `Sie leuchtet angenehm warm in der Handfläche und spendet Mut für jeden Tag.`,
    `${child} verabschiedet sich mit einer herzlichen Umarmung von dem lieben Freund.`,
    `Die Magie des Einhorns wird das Kind sein ganzes Leben lang im Herzen begleiten.`,
  ],
  theme_superhero: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_superhero(child, comp),
    `Im Hauptquartier blinken die Monitore wieder in beruhigendem grünen Licht.`,
    `${child} legt den roten Umhang ordentlich auf den Stuhl und trinkt heißen Kakao.`,
    `Wahre Helden zeichnen sich durch Hilfsbereitschaft, Geduld und großes Herz aus.`,
    `Morgen wird ein neuer Tag voller Möglichkeiten sein, die Welt ein Stück besser zu machen.`,
  ],
  theme_ocean: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_ocean(child, comp),
    `Der Leuchtturm am Ende der Landzunge wirft seinen langen Lichtkegel weit über die See.`,
    `Schiffe finden so sicher den Weg in den schützenden Hafen der Stadt.`,
    `${child} lauscht dem regelmäßigen Rauschen der Brandung und atmet die Salzluft ein.`,
    `Das Meer birgt unendlich viele Geschichten, die nur darauf warten, erzählt zu werden.`,
  ],
  theme_treasure: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_treasure(child, comp),
    `Ein Teil der wertvollen Münzen wird dem Heimatmuseum des Dorfes gestiftet.`,
    `Dort können nun alle Kinder die historischen Schätze aus vergangenen Zeiten bewundern.`,
    `${child} erhält eine Ehrenurkunde als jüngster und mutigster Entdecker der Region.`,
    `Mit funkelnden Augen denkt ${child} an die geheimnisvolle Höhle und das große Abenteuer zurück.`,
  ],
  theme_pirate: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_pirate(child, comp),
    `Am Lagerfeuer am Strand stimmen die Matrosen fröhliche Seemannslieder an.`,
    `${child} lacht vergnügt mit und genießt das Knistern der wärmenden Flammen.`,
    `Der treue Papagei wiederholt lustige Seemannssprüche und bringt alle zum Schmunzeln.`,
    `Unter dem funkelnden Sternenzelt träumen alle Seefahrer von neuen unbekannten Ufern.`,
  ],
  theme_dino: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_dino(child, comp),
    `Im Basislager werden die Notizen und Fundstücke sorgfältig in Kisten katalogisiert.`,
    `Wissenschaftler aus aller Welt sind begeistert von den bahnbrechenden Entdeckungen.`,
    `${child} darf dem neugeborenen Baby-Dinosaurier sogar einen eigenen Namen geben.`,
    `Das Abenteuer im Land der Urzeitriesen wird für immer unvergessen bleiben.`,
  ],
  theme_space: (child, comp) => [
    ...LEVEL_8_TEMPLATES.theme_space(child, comp),
    `Die Bremsraketen leiten den sicheren Wiedereintritt in die Erdatmosphäre ein.`,
    `Mit sanften Fallschirmen landet die Kapsel präzise im warmen Pazifischen Ozean.`,
    `Bergungsschiffe eilen herbei und heißen die tapferen Astronauten herzlich willkommen.`,
    `${child} blickt lächelnd zum Himmel empor und weiß, dass Träume Wirklichkeit werden können.`,
  ],
};

const THEME_TITLES: Record<string, (child: string) => string> = {
  theme_forest: (child) => `Im Zauberwald mit ${child}`,
  theme_wizard: (child) => `Die Zauberschule von ${child}`,
  theme_horse: (child) => `${child} auf dem Pferdehof`,
  theme_unicorn: (child) => `${child} und das Wunder-Einhorn`,
  theme_superhero: (child) => `Superheld ${child} im Einsatz`,
  theme_ocean: (child) => `${child} am blauen Meer`,
  theme_treasure: (child) => `${child} findet den Goldschatz`,
  theme_pirate: (child) => `Kapitän ${child} auf hoher See`,
  theme_dino: (child) => `${child} im Land der Dinosaurier`,
  theme_space: (child) => `${child} fliegt zu den Sternen`,
};

/**
 * Generates a tailored StoryData object from a given StoryConfigPayload with pre-split syllables.
 */
export function generateStoryFromConfig(payload: StoryConfigPayload): StoryData {
  const themeKey = payload.theme?.id || 'theme_forest';
  const child = payload.childName || 'Lese-Held';
  const companion = payload.companion?.name;
  const level: ReadingLevelNumber = payload.level || 1;

  let sentenceList: string[];

  if (level === 1) {
    const generator = LEVEL_1_TEMPLATES[themeKey] || LEVEL_1_TEMPLATES.theme_forest;
    sentenceList = generator(child, companion);
  } else if (level === 2) {
    const generator = LEVEL_2_TEMPLATES[themeKey] || LEVEL_2_TEMPLATES.theme_forest;
    sentenceList = generator(child, companion);
  } else if (level === 3) {
    const generator = LEVEL_3_TEMPLATES[themeKey] || LEVEL_3_TEMPLATES.theme_forest;
    sentenceList = generator(child, companion);
  } else if (level === 4 || level === 5) {
    const generator = LEVEL_4_5_TEMPLATES[themeKey] || LEVEL_4_5_TEMPLATES.theme_forest;
    sentenceList = generator(child, companion);
  } else if (level === 6) {
    const generator = LEVEL_6_TEMPLATES[themeKey] || LEVEL_6_TEMPLATES.theme_forest;
    sentenceList = generator(child, companion);
  } else if (level === 7) {
    const generator = LEVEL_7_TEMPLATES[themeKey] || LEVEL_7_TEMPLATES.theme_forest;
    sentenceList = generator(child, companion);
  } else if (level === 8) {
    const generator = LEVEL_8_TEMPLATES[themeKey] || LEVEL_8_TEMPLATES.theme_forest;
    sentenceList = generator(child, companion);
  } else {
    // Level 9
    const generator = LEVEL_9_TEMPLATES[themeKey] || LEVEL_9_TEMPLATES.theme_forest;
    sentenceList = generator(child, companion);
  }

  const titleGenerator = THEME_TITLES[themeKey] || THEME_TITLES.theme_forest;
  const title = titleGenerator(child);
  const fullText = sentenceList.join('\n');
  const structuredOutput = buildStructuredStoryOutput(sentenceList);

  return {
    id: `story_${themeKey}_lvl${level}_${Date.now()}`,
    title,
    coverEmoji: payload.theme?.icon || '📖',
    levelSuitability: [level],
    text: fullText,
    structuredOutput,
  };
}
