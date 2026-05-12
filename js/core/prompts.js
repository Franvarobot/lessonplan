// ============================================================
// LLM prompts — builders for each generation task.
// Depends on: i18n.js (localizeLabel)
//
// All builders return a string that runLLM() sends as the prompt body.
// Each prompt has a strong language anchor at the very top because the
// model echoes the dominant language of the prompt body; placing a
// trailing "respond in X" line gets out-prioritized.
// ============================================================

window.topicSuggestionsPrompt = function topicSuggestionsPrompt({ stage, grade, subject, language, exclude = [] }) {
  const isGy = stage === "Gymnasiet";
  const isEn = language === "en";

  if (isEn) {
    const curriculum = isGy ? "Gy22 (the Swedish upper-secondary curriculum, 2022)" : "LGR22 (the Swedish compulsory-school curriculum, 2022)";
    const excludeText = exclude.length ? `\n\nDo not repeat these (already shown): ${exclude.join(", ")}` : "";
    const stageLabel = window.localizeLabel(stage, "en");
    const gradeLabel = window.localizeLabel(grade, "en");
    const subjectLabel = window.localizeLabel(subject, "en");
    return `You are a Swedish teacher. Suggest 8 suitable lesson topics/areas aligned with ${curriculum}.

Context:
- Stage: ${stageLabel}
- Grade: ${gradeLabel}
- Subject: ${subjectLabel}

The suggestions should:
- Be concrete topic/area names (not entire syllabuses), 2-5 words each
- Mirror the central content of ${curriculum} for this grade and subject
- Vary in type (e.g. factual area, skill, project idea, current theme)
- Be realistic to teach in one or a few lessons${excludeText}

IMPORTANT: Write all suggestions in English. Respond with only a valid JSON object, no markdown:
{
  "topics": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5", "suggestion 6", "suggestion 7", "suggestion 8"]
}`;
  }

  const curriculum = isGy ? "Gy22 (gymnasieskolans läroplan 2022)" : "LGR22 (Läroplan för grundskolan 2022)";
  const excludeText = exclude.length ? `\n\nUndvik dessa förslag (redan visade): ${exclude.join(", ")}` : "";
  return `Du är en svensk lärare. Föreslå 8 lämpliga teman/områden för en lektion enligt ${curriculum}.

Kontext:
- Stadium: ${stage}
- Årskurs: ${grade}
- Ämne: ${subject}

Förslagen ska:
- Vara konkreta tema-/områdesnamn (inte hela kursplaner), 2-5 ord per förslag
- Spegla centralt innehåll i ${curriculum} för denna årskurs och ämne
- Variera i typ (t.ex. faktaområde, färdighet, projektidé, aktuellt tema)
- Vara realistiska att undervisa på en eller några lektioner${excludeText}

VIKTIGT: Skriv alla förslag på svenska. Svara endast med ett giltigt JSON-objekt, ingen markdown:
{
  "topics": ["förslag 1", "förslag 2", "förslag 3", "förslag 4", "förslag 5", "förslag 6", "förslag 7", "förslag 8"]
}`;
};

window.lessonPrompt = function lessonPrompt({ stage, grade, subject, topic, duration, branchIndex, totalBranches, language, detailLevel = "standard" }) {
  const isGy = stage === "Gymnasiet";
  const curriculum = isGy ? "Gy22 (gymnasieskolans läroplan 2022)" : "LGR22 (Läroplan för grundskolan 2022)";
  const isEn = language === "en";
  const langPrefix = isEn
    ? `**LANGUAGE: English.** Every single string value in the JSON response — titles, descriptions, scripts, examples, board content, all of it — MUST be in natural English. The prompt below uses Swedish field labels for technical reasons, but the OUTPUT IS ENGLISH.\n\n`
    : `**SPRÅK: Svenska.** Allt innehåll i JSON-svaret ska skrivas på svenska.\n\n`;
  const langInstr = isEn
    ? "REMINDER: Write all content inside the JSON object in English."
    : "VIKTIGT: Skriv allt innehåll i JSON-objektet på svenska.";

  const stageLabel = isEn ? window.localizeLabel(stage, "en") : stage;
  const gradeLabel = isEn ? window.localizeLabel(grade, "en") : grade;
  const subjectLabel = isEn ? window.localizeLabel(subject, "en") : subject;

  // Detail-level instructions control which fields are populated and how verbose phases are.
  const detailInstr = {
    quick: `DETALJNIVÅ: SNABB (en sida).
- 3-4 faser, varje phase.teacherDoes har MAX 2 punkter, INGEN teacherScript, INGEN anticipatedResponses.
- INGEN extraTime, INGEN extraActivities, INGEN commonPitfalls, INGEN classroomManagement, INGEN homework.
- successCriteria max 2 punkter. teacherNotes max 2 punkter.
- differentiation.stod och differentiation.utmaning: 1-2 punkter vardera.
- boardLayout: kort men VERBATIM (inte bara "agenda + begrepp").
- Skriv som om läraren själv ska använda planen — koncist, inga upprepningar.`,
    standard: `DETALJNIVÅ: STANDARD (2 sidor).
- 4-5 faser. teacherScript bara för INTRODUKTIONEN och AVSLUTNINGEN (inte varje fas).
- anticipatedResponses bara där det verkligen behövs (kontroversiella eller fel-prone moment).
- extraTime: 2 nivåer (5 och 15 min), inte 4.
- extraActivities: 2 stycken.
- commonPitfalls: 2-3 punkter.
- Hoppa över classroomManagement helt.
- successCriteria 3 punkter, teacherNotes 2-3 punkter.`,
    full: `DETALJNIVÅ: FULL (3-5 sidor — komplett dokumentation).
- 3-6 faser, alla med teacherScript och anticipatedResponses.
- extraTime: alla 4 nivåer (5, 10, 15, 20 min).
- extraActivities: 2-3 stycken.
- commonPitfalls: 3-5 punkter.
- successCriteria: 3-4 punkter. teacherNotes: 3-5 punkter.
- Inkludera classroomManagement (3-5 punkter) och homework.`,
  }[detailLevel] || "";

  const optionalFieldsHint = detailLevel === "quick"
    ? `\nVIKTIGT: Lämna BORT helt (inte med tomma arrayer): extraTime, extraActivities, commonPitfalls, classroomManagement, homework, anticipatedResponses, teacherScript.`
    : detailLevel === "standard"
      ? `\nVIKTIGT: Lämna BORT classroomManagement helt. anticipatedResponses och teacherScript inkluderas bara där detaljnivåinstruktionen anger.`
      : "";

  return `${langPrefix}Du är en svensk förstelärare som planerar en RIKTIG lektion enligt ${curriculum} från Skolverket. Din planering ska följa beprövad pedagogisk forskning (Rosenshine, Hattie, Skolverkets "Strukturerad Undervisning"-modell) och vara så konkret att en lärare kan gå rakt in i klassrummet med planen i handen och hålla en bra lektion.

LEKTIONSPARAMETRAR:
- Stadium: ${stageLabel}
- Årskurs: ${gradeLabel}
- Ämne: ${subjectLabel}
- Tema/område: "${topic}"
- Lektionstid: ${duration} minuter

${detailInstr}${optionalFieldsHint}

Detta är förslag ${branchIndex + 1} av ${totalBranches}. Varje förslag ska ha en TYDLIGT annorlunda pedagogisk vinkel — välj en av dessa modeller och säg vilken i fältet "approach":
1. STRUKTURERAD UNDERVISNING (Direct Instruction) — Skolverkets sex-stegsmodell. Standard för faktakunskap, färdighetsträning, matematik, språkregler. Faserna är: "Inledning", "Genomgång", "Stödd övning", "Sammanfattning och kontroll", "Enskild övning", "Avslutning".
2. PROBLEMBASERAT — eleverna brottas med ett problem först, läraren hjälper fram lösningen. För matematik, naturvetenskap, etiska frågor.
3. UNDERSÖKANDE / LABORATIVT — eleverna utforskar konkret material för att upptäcka samband. För NO, matematik, samhällsfrågor.
4. KOLLABORATIVT / DIALOGISKT — strukturerade gruppdiskussioner (t.ex. think-pair-share, EPA). För litteratur, samhällsämnen, värdefrågor.
5. SKAPANDE / GESTALTANDE — eleverna producerar något (text, bild, modell, framträdande). För svenska, bild, slöjd, musik.
6. PROJEKTBASERAT — längre arbete mot konkret produkt. När det passar lektionstiden, ofta del-fas av större projekt.

GRUNDREGLER FÖR EN VERKLIG LEKTIONSPLAN:
- ALDRIG vaga formuleringar som "diskutera ämnet", "introducera begreppet", "samtala om". Skriv UT vad läraren säger, vilken fråga som ställs, vilket exempel som ges.
- VARJE fas i "phases" ska ha "teacherScript" — exempel-formuleringar i citattecken som läraren faktiskt kan säga. Inte hela monologer men nyckelmeningar.
- VARJE fas ska ha "anticipatedResponses" — vad eleverna kan tänkas svara, inklusive vanliga felsvar och hur läraren kan vända dem.
- "kontrollfrågor" (3-5 st) — exakta frågor läraren ställer för att kolla att eleverna hänger med, INTE handuppräckning utan riktade till specifika elever (Skolverkets råd).
- Eleverna ska få cirka 80% rätt på övningar med stöd (inte för lätt, inte för svårt).
- Tiderna i alla faser MÅSTE summera till ${duration} min.

🚫 ABSOLUT FÖRBJUDET — FANTOMREFERENSER 🚫
Du får ALDRIG referera till något som inte är förberett i planen eller som inte explicit skapas i en tidigare fas. Detta är den vanligaste bristen i AI-genererade lektionsplaner och förstör hela planen.

Exempel på fantomreferenser som FÖRSTÖR planen:
- "Peka på Adjektivbanken på tavlan" — vad är Adjektivbanken? Vad står där? När skrevs den upp?
- "Använd ordlistan från förra veckan" — vilken ordlista? Vilka ord?
- "Eleverna tittar på bilden" — vilken bild? Var kommer den ifrån?
- "Hänvisa till regeln vi gick igenom" — vilken regel? Citera den.

REGEL: Om planen nämner ETT objekt (en lista, en text, en bild, en ordlista, en formel, en regel, ett exempel, en "bank", en "anslagstavla") måste EN av följande gälla:
(a) Innehållet är skrivet ordagrant i planen (i "boardSetup" eller "teacherScript" eller motsvarande fält), ELLER
(b) En tidigare fas innehåller EXPLICITA steg för att skapa det, MED INNEHÅLLET (t.ex. "Skriv följande 8 adjektiv på tavlan under rubriken 'Adjektivbank': stor, liten, glad, ledsen, snabb, långsam, tyst, högljudd.").

INNAN du skriver phases, fundera: "Vilket konkret material/innehåll behöver läraren ha redo på tavlan eller i handen?" — och PRODUCERA det innehållet i fältet "boardSetup" eller i den första fasens teacherDoes/teacherScript.

${langInstr}

Svara endast med ett giltigt JSON-objekt, ingen markdown:
{
  "title": "konkret lektionstitel (5-10 ord)",
  "approach": "namnet på pedagogisk modell (en av de sex listade ovan)",
  "approachReason": "en mening om varför denna modell passar för denna lektion",
  "summary": "2-3 meningar om lektionens upplägg och röda tråd",
  "learningGoal": "konkret mätbart lärandemål formulerat så det syns på en elevs prestation (t.ex. 'Eleven kan med egna ord förklara skillnaden mellan X och Y och ge minst två exempel')",
  "priorKnowledge": "vad eleverna förväntas redan kunna för att lektionen ska fungera (1-2 meningar)",
  "lgr22_connection": "konkret koppling till centralt innehåll OCH en eller flera förmågor i ${curriculum}, citera relevanta nyckelord (2-3 meningar)",
  "successCriteria": ["3-4 konkreta tecken som läraren ser/hör om eleven har nått målet (t.ex. 'Eleven använder begreppet X i ett eget exempel utan att läraren påminner')"],
  "boardLayout": "VERBATIM innehåll som läraren skriver på tavlan i början av lektionen. Skriv ut hela texten — agenda (4-5 punkter), centrala begrepp med definitioner, eventuella exempel som behövs senare. Detta ska kunna kopieras rakt av till tavlan. Använd radbrytningar (\\n) om det behövs. INGA platshållare som '[lärarens egna ord]'.",
  "materialsNeeded": ["5-8 specifika material — var konkret med antal/typ (t.ex. 'tärningar, 2 per elevpar', inte bara 'tärningar')"],
  "phases": [
    {
      "name": "Fasens namn (för Strukturerad Undervisning: använd de officiella namnen)",
      "minutes": 10,
      "purpose": "en mening om vad denna fas ska åstadkomma",
      "teacherDoes": ["3-5 konkreta steg läraren utför i ordning"],
      "teacherScript": ["2-4 EXEMPEL-FORMULERINGAR i citattecken som läraren kan säga ordagrant (t.ex. \\"Tänk dig att du har 12 äpplen och ska dela dem lika mellan 4 personer. Hur många får var och en?\\"). Dessa ska kännas naturliga, inte stelt skriptade."],
      "studentsDo": ["2-4 konkreta beskrivningar av vad eleverna gör (lyssnar, skriver, diskuterar i par, etc.)"],
      "anticipatedResponses": ["2-3 troliga elevsvar (även felaktiga) och kort hur läraren bemöter dem (t.ex. 'Om en elev säger 4 → bekräfta. Om någon säger 3 → fråga \\"Hur räknade du då?\\" och låt eleven förklara, lotsa fram rätt svar.')"]
    }
  ] (3-6 faser; tider summerar till ${duration} min),
  "checkForUnderstanding": ["3-5 EXAKTA kontrollfrågor som läraren ställer under lektionen (riktade, inte handuppräckning). Ange ungefär VAR i lektionen frågan ställs."],
  "exitTicket": {
    "title": "kort avslutande check (3-5 min)",
    "task": "konkret uppgift eleverna gör innan de går ut (t.ex. 'Skriv på en lapp: en sak du lärt dig idag och en fråga du fortfarande har')",
    "purpose": "vad läraren får reda på från det"
  },
  "extraActivities": [
    { "title": "för elever som blir klara tidigt", "description": "konkret aktivitet, kan göras självständigt på 5-15 min, fördjupar lektionsinnehållet", "answer": "om uppgiften har ett rätt svar — ange det här så vikarien kan kolla" }
  ] (2-3 stycken),
  "differentiation": {
    "stod": ["3-4 KONKRETA stöttningsstrategier (t.ex. 'För elever som har svårt med läsning: läs textfrågorna högt; tillhandahåll bildstöd för begreppen X och Y')"],
    "utmaning": ["3-4 KONKRETA utmaningar för särbegåvade/snabba elever (fördjupningsfrågor, abstraktionssteg, transferuppgifter — ge själva uppgiften, inte bara 'svårare uppgift')"]
  },
  "extraTime": [
    { "minutes": 5, "title": "...", "description": "konkret helklassaktivitet med tydliga steg", "linkBack": "en mening om hur detta knyter an till lektionen" },
    { "minutes": 10, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 15, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 20, "title": "...", "description": "...", "linkBack": "..." }
  ],
  "commonPitfalls": ["3-5 saker som typiskt går fel i denna typ av lektion och vad läraren gör då (t.ex. 'Om diskussionen tystnar efter 2 minuter: ge ett provocerande motexempel som \\"...\\"')"],
  "teacherNotes": ["3-5 övriga praktiska anmärkningar — klassrumshantering, övergångar, hur man vet att lektionen går bra"],
  "homework": "konkret hemuppgift om relevant — Skolverkets råd: ska kunna lösas till 90% självständigt; differentiera. Skriv 'Ingen läxa' (eller 'No homework' om språket är engelska) om inte aktuellt.",
  "assessment": "hur denna lektion bidrar till bedömningsunderlaget och vad läraren konkret tittar efter"
}`;
};

window.subPrompt = function subPrompt({ stage, grade, subject, topic, duration, baseLesson, language }) {
  const isGy = stage === "Gymnasiet";
  const curriculum = isGy ? "Gy22" : "LGR22";
  const isEn = language === "en";
  const langPrefix = isEn
    ? `**LANGUAGE: English.** Every single string value in the JSON response — titles, descriptions, scripts, board content, anticipated student responses, all of it — MUST be in natural English. The prompt below uses Swedish field labels for technical reasons, but the OUTPUT IS ENGLISH.\n\n`
    : `**SPRÅK: Svenska.** Allt innehåll i JSON-svaret ska skrivas på svenska.\n\n`;
  const langInstr = isEn
    ? "REMINDER: Write everything in English."
    : "VIKTIGT: Skriv allt på svenska.";
  const stageLabel = isEn ? window.localizeLabel(stage, "en") : stage;
  const gradeLabel = isEn ? window.localizeLabel(grade, "en") : grade;
  const subjectLabel = isEn ? window.localizeLabel(subject, "en") : subject;
  const baseContext = baseLesson ? `

ELEVERNA HAR PRECIS GÅTT IGENOM (du måste bygga på exakt detta):
- Titel: ${baseLesson.title}
- Lärandemål: ${baseLesson.learningGoal || baseLesson.objective || ""}
- Förkunskaper de hade: ${baseLesson.priorKnowledge || ""}
- Vad de gjorde: ${(baseLesson.phases || []).map(p => `${p.name} (${p.minutes}min): ${(p.studentsDo || []).join("; ")}`).join(" | ") || (baseLesson.activities || []).join("; ")}
- Framgångskriterier från ordinarie lektion: ${(baseLesson.successCriteria || []).join("; ")}` : `

OBS: Detta är en FRISTÅENDE vikarielektion — det finns ingen ordinarie lektion att bygga på. Koordinatorn vet inte exakt vad eleverna senast gjort. Anta vanliga förkunskaper för årskursen och ämnet. Lektionen ska kunna fungera oberoende av vad eleverna gjort förra gången. Den ska ändå vara turnkey för vikarien.`;

  const rule1 = baseLesson
    ? `1. INGA NYA begrepp införs. Lektionen befäster det eleverna redan kan.`
    : `1. Anta vanliga förkunskaper för årskursen. Lektionen får introducera grundläggande begrepp men de ska FÖRKLARAS ordagrant i planen — vikarien kan inte fylla i kunskapsgapet. Föredra repetition/tillämpning över helt nytt material.`;

  return `${langPrefix}Du är en svensk förstelärare som planerar en VIKARIELÄKTION enligt ${curriculum}. Detta är en LIVRÄDDNING för en vikarie utan ämneskunskap. Varje detalj måste vara TURNKEY — vikarien öppnar dokumentet, läser och kan undervisa direkt.

KONTEXT:
- Stadium: ${stageLabel}, Årskurs: ${gradeLabel}, Ämne: ${subjectLabel}
- Tema/område: "${topic}"
- Lektionstid: ${duration} minuter${baseContext}

ABSOLUTA KRAV:
${rule1}
2. ALLT INNEHÅLL ÄR FÖRBEREDT I PLANEN. Om aktiviteten är "låt eleverna lösa fem tal" — då ska de fem talen finnas i planen, MED FACIT. Om det är "diskutera tre frågor" — då ska de tre frågorna finnas, med exempel-svar att lyssna efter. Om det är "läs en kort text" — då ska texten finnas (skriv den själv, max 200 ord).
3. SKRIPT FÖR VIKARIEN — varje fas har "teacherScript" med EXAKTA formuleringar i citattecken som vikarien kan säga ordagrant.
4. ANTICIPERADE SVAR — vad eleverna sannolikt säger och hur vikarien bemöter det, inklusive felsvar.
5. INGEN VAGT SPRÅK. Aldrig "diskutera ämnet" — alltid "ställ frågan: '...'. Lyssna efter svar som nämner X, Y eller Z."
6. Roligt och engagerande (lek, station, tävling, kreativt projekt, quiz, samarbete) men pedagogiskt värdefullt.
7. Bara material som rimligen finns i klassrummet (papper, pennor, tavla, ev. surfplattor).
8. EXTRA-AKTIVITETER om tid blir över — minst 2 stycken, fullt utskrivna med tydliga instruktioner och facit. Vikarien ska aldrig stå tom.

🚫 ABSOLUT FÖRBJUDET — FANTOMREFERENSER 🚫
EXTRA viktigt för en vikarie utan ämneskunskap. Du får ALDRIG referera till något som inte finns konkret i planen.

FÖRBJUDNA formuleringar (och vad du ska skriva istället):
- ❌ "Peka på Adjektivbanken på tavlan"
  ✅ Lägg en första fas "Förberedelse" där vikarien skriver: "Innan eleverna kommer in: Skriv följande på tavlan under rubriken 'Adjektivbank': stor, liten, glad, ledsen, snabb, långsam, tyst, högljudd."
- ❌ "Hänvisa till texten ni läste förra gången"
  ✅ "Den text eleverna läste förra lektionen handlade om X. Påminn dem genom att säga: '...'. Texten finns inte här — om eleverna behöver återblicka, säg: '...'."
- ❌ "Eleverna gör övning 3 i boken"
  ✅ Skriv ut hela övningen ordagrant i embeddedContent.problems med facit.
- ❌ "Använd bilden ni jobbat med"
  ✅ Beskriv bilden i ord eller skriv "Vikarien har INGEN bild — använd istället denna beskrivning: '...'."

REGEL: Innan du skriver phases, lista alla föremål/innehåll som vikarien kommer att referera till. För VARJE sådant: antingen lägg in en "Förberedelse"-fas (med innehållet skrivet ordagrant), eller embedda innehållet i embeddedContent. Om vikarien inte kan utföra ett steg utan att förstå ämnet — då har du misslyckats.

${langInstr}

Svara endast med ett giltigt JSON-objekt, ingen markdown:
{
  "title": "rolig titel med en hook som beskriver vad lektionen handlar om",
  "approach": "Vikarielektion (kollaborativ / quiz / station / tävling / etc.)",
  "summary": "2-3 meningar om vad eleverna gör och hur det knyter an till tidigare lektion",
  "learningGoal": "vilket tidigare lärande som befästs (en mening, mätbart)",
  "priorKnowledge": "vad eleverna förväntas redan kunna (1 mening)",
  "lgr22_connection": "kort koppling till ${curriculum} (1-2 meningar)",
  "successCriteria": ["3 konkreta tecken på att lektionen lyckas"],
  "boardLayout": "VERBATIM text som vikarien skriver på tavlan INNAN eleverna kommer in. Skriv ut allt: lektionens titel, agenda, eventuella ord-listor / nyckelbegrepp / exempel som senare faser refererar till. Använd \\n för radbrytningar. Detta är vad vikarien faktiskt kommer att kopiera till tavlan — så det ska inte innehålla några platshållare.",
  "materialsNeeded": ["3-6 enkla material — ange antal (t.ex. 'A4-papper, 1 per elev')"],
  "preparedContent": {
    "description": "Beskriv vilket material som ligger inbäddat i planen för vikarien",
    "items": ["lista med rubriker för det inbäddade innehållet (frågor, problem, texter, etc.) som finns längre ner i planen"]
  },
  "phases": [
    {
      "name": "Fasens namn",
      "minutes": 10,
      "purpose": "vad denna fas ska åstadkomma",
      "teacherDoes": ["3-5 KONKRETA steg vikarien gör — peka på var i planen man hittar materialet"],
      "teacherScript": ["3-5 EXAKTA formuleringar i citattecken vikarien kan säga ordagrant. Inkludera övergångar och frågor."],
      "studentsDo": ["2-4 konkreta beskrivningar av vad eleverna gör"],
      "anticipatedResponses": ["2-3 troliga elevsvar (rätt + fel) och hur vikarien bemöter dem konkret"]
    }
  ] (3-5 faser, summa = ${duration} min),
  "embeddedContent": {
    "questions": [
      { "q": "fullständig fråga", "expectedAnswer": "kort förväntat svar", "ifStuck": "tips till vikarien om eleverna inte svarar" }
    ] (5-10 st om relevant — ALLTID inkludera om lektionen bygger på frågeställningar),
    "problems": [
      { "problem": "fullständig uppgift / fråga / tal", "answer": "fullständigt svar med kort förklaring", "difficulty": "lätt/medel/svår" }
    ] (5-10 st om relevant — ALLTID inkludera för matematik, NO eller färdighetsövningar),
    "texts": [
      { "title": "...", "content": "fullständig text på 50-200 ord som vikarien delar ut eller läser upp", "purpose": "vad eleverna ska göra med texten" }
    ] (om relevant — för läsförståelse, diskussion, analys),
    "exampleAnswers": [
      { "scenario": "om en elev säger X eller frågar Y", "response": "exakt vad vikarien kan svara" }
    ] (3-5 st för svårare situationer)
  } (Inkludera ENDAST de underfält som är relevanta — utelämn de andra. Men minst ett av questions/problems/texts MÅSTE vara med.),
  "exitTicket": {
    "title": "kort avslutande check",
    "task": "konkret avslutande uppgift (t.ex. 'Skriv en mening: en sak du minns från idag')",
    "purpose": "vad vikarien lämnar till ordinarie lärare"
  },
  "extraActivities": [
    { "title": "...", "description": "konkret aktivitet på 5-15 min", "answer": "facit om relevant" }
  ] (2-3 stycken),
  "differentiation": {
    "stod": ["3 konkreta stöttningsstrategier"],
    "utmaning": ["3 konkreta utmaningar för snabba elever — ange exakt uppgift"]
  },
  "extraTime": [
    { "minutes": 5, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 10, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 15, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 20, "title": "...", "description": "...", "linkBack": "..." }
  ],
  "commonPitfalls": ["3-5 vanliga fallgropar SPECIFIKT för en vikarie i denna situation och vad man gör"],
  "classroomManagement": ["3-5 specifika tips: hur man får tyst, hur man hanterar elever som inte vill delta, hur man skapar trygghet"],
  "teacherNotes": ["2-4 övriga praktiska anmärkningar"],
  "subTip": "Det viktigaste enskilda tipset till vikarien för just denna lektion (1 mening)"
}`;
};

// Translates an existing Swedish lesson JSON to the target language. Preserves
// the exact JSON shape; only string VALUES are translated.
window.translateLessonPrompt = function translateLessonPrompt({ lesson, targetLanguage }) {
  const target = targetLanguage === "en" ? "English" : "Swedish";
  return `You are a translator. Translate this lesson plan JSON from Swedish to ${target}.

CRITICAL RULES:
1. Output ONLY the translated JSON. No commentary, no markdown, no backticks.
2. Preserve the EXACT JSON structure — same keys, same nesting, same arrays.
3. Translate every string VALUE. Do NOT translate JSON keys.
4. Keep numbers, durations, and IDs unchanged.
5. For curriculum references (LGR22, Gy22, central content phrases), keep the proper noun "LGR22"/"Gy22" but translate the surrounding description.
6. Subject names: "Matematik" → "Mathematics", "Svenska" → "Swedish", "Engelska" → "English", "NO" → "Science", "SO" → "Social Studies", "Idrott" → "PE", "Bild" → "Visual Arts", "Musik" → "Music".
7. Phase names: "Inledning" → "Introduction", "Genomgång" → "Direct teaching", "Stödd övning" → "Guided practice", "Enskild övning" → "Independent practice", "Avslutning" → "Closing".
8. Keep teacher-script tone natural in ${target}. Don't translate word-for-word; translate meaning.
9. If a value is already in ${target}, leave it unchanged.

LESSON JSON TO TRANSLATE:
${JSON.stringify(lesson, null, 2)}`;
};

// ---- Extras prompts ----
function extrasContextBlock(lesson, language) {
  const isSv = language === "sv";
  const lines = [];
  lines.push(isSv ? "LEKTIONSKONTEXT:" : "LESSON CONTEXT:");
  lines.push(`- ${isSv ? "Titel" : "Title"}: ${lesson.title}`);
  if (lesson.learningGoal) lines.push(`- ${isSv ? "Lärandemål" : "Learning goal"}: ${lesson.learningGoal}`);
  if (lesson.summary) lines.push(`- ${isSv ? "Sammanfattning" : "Summary"}: ${lesson.summary}`);
  if (lesson.phases?.length) {
    lines.push(`- ${isSv ? "Faser" : "Phases"}: ${lesson.phases.map(p => `${p.name} (${p.minutes}min)`).join(" | ")}`);
  }
  return lines.join("\n");
}

window.extrasPrompt = function extrasPrompt({ kind, lesson, stage, grade, subject, topic, duration, language }) {
  const isSv = language === "sv";
  const isEn = !isSv;
  const langPrefix = isEn
    ? `**LANGUAGE: English.** Every string value in the JSON response must be in natural English. The prompt below uses Swedish framing for technical reasons, but the OUTPUT IS ENGLISH.\n\n`
    : `**SPRÅK: Svenska.** Allt innehåll i JSON-svaret ska skrivas på svenska.\n\n`;
  const langInstr = isSv ? "Svara på svenska." : "REMINDER: respond in English.";
  const ctx = extrasContextBlock(lesson, language);
  const stageLabel = isEn ? window.localizeLabel(stage, "en") : stage;
  const gradeLabel = isEn ? window.localizeLabel(grade, "en") : grade;
  const subjectLabel = isEn ? window.localizeLabel(subject, "en") : subject;
  const meta = `${stageLabel} · ${isSv ? "Årskurs" : "Grade"} ${gradeLabel} · ${subjectLabel} · "${topic}" · ${duration} min`;
  const youngerLearner = (typeof grade === "number" && grade <= 6) || /^F-|^åk ?[1-6]/i.test(String(grade));

  const builders = {
    worksheet: () => `${langPrefix}Du genererar ett ARBETSBLAD för eleverna baserat på lektionen nedan.

${meta}
${ctx}

KRAV:
- 5-10 uppgifter som befäster lektionens lärandemål. Anpassade till årskurs ${grade}.
- Varje uppgift har konkret frågetext (inga platshållare).
- Inkludera FACIT separat — kort förklaring där det behövs.
- Variera typer: numrerade frågor, lucktext, kort uppgift att lösa, kort öppen fråga.
- INGA fantomreferenser. Allt innehåll måste vara skrivet ordagrant i uppgiftstexterna.

${langInstr} Svara endast med giltigt JSON, ingen markdown:
{
  "title": "arbetsbladets titel",
  "instructions": "kort instruktion till eleven (1-2 meningar)",
  "exercises": [
    { "n": 1, "type": "open|fill|multiple|short|calc", "question": "fullständig frågetext", "answer": "fullständigt facit", "explanation": "kort förklaring om relevant" }
  ],
  "answerKeyNote": "kort kommentar till läraren om hur facit används (1 mening)"
}`,

    badges: () => `${langPrefix}Du genererar 3-5 belöningsmärken (badges) för denna lektion. ${youngerLearner ? "Eleverna är yngre — använd lekfullt språk, roliga namn, känslor." : "Eleverna är äldre — håll det subtilt, inte barnsligt. Tänk 'expert', 'utforskare', 'analytiker' snarare än 'super-stjärna'."}

${meta}
${ctx}

KRAV:
- Varje märke kopplas till ett konkret beteende eller framsteg under lektionen.
- Märket har en kort titel (1-3 ord), en kort beskrivning av kriteriet, och en emoji som ikon.
- Välj färger som passar märket (hex-koder).

${langInstr} Svara endast med giltigt JSON:
{
  "badges": [
    { "title": "kort titel", "criterion": "vad eleven gjorde för att förtjäna det (en mening)", "emoji": "🌟", "color": "#hexkod", "textColor": "#hexkod" }
  ]
}`,

    flashcards: () => `${langPrefix}Du genererar en uppsättning ord-/begreppskort (flashcards) baserade på lektionen.

${meta}
${ctx}

KRAV:
- 8-12 kort med nyckelbegrepp/ord från lektionen.
- Framsidan: ordet eller begreppet. Baksidan: kort definition på elevernas nivå (årskurs ${grade}).
- Vid relevans: en kort exempelfras som visar användningen.
- INGA begrepp som inte introduceras i lektionen.

${langInstr} Svara endast med giltigt JSON:
{
  "title": "korten-uppsättningens titel",
  "cards": [
    { "front": "ord eller begrepp", "back": "kort definition (max 20 ord)", "example": "exempelfras (valfritt)" }
  ]
}`,

    discussionCards: () => `${langPrefix}Du genererar diskussionsfrågor som klippkort för grupparbete.

${meta}
${ctx}

KRAV:
- 6-10 öppna frågor som driver djupare diskussion kring lektionens innehåll.
- Inga ja/nej-frågor. Använd "Varför...", "Hur skulle ni...", "Vad händer om...", "Jämför...".
- Varje fråga har en kort "lyssna efter"-rad till läraren — vad ett bra svar innehåller.
- Anpassade till årskurs ${grade}.

${langInstr} Svara endast med giltigt JSON:
{
  "title": "korten-uppsättningens titel",
  "instructions": "instruktion till gruppen (1-2 meningar)",
  "cards": [
    { "n": 1, "question": "fullständig öppen fråga", "listenFor": "vad ett bra svar innehåller (en mening till läraren)" }
  ]
}`,

    anchorChart: () => `${langPrefix}Du genererar en TAVELPLAN (anchor chart) — exakt vad läraren ritar/skriver på tavlan som referens under hela lektionen.

${meta}
${ctx}

KRAV:
- Klar layout med en huvudrubrik och 3-5 sektioner.
- Varje sektion har en tydlig underrubrik och 2-5 konkreta punkter eller exempel — INGA platshållare.
- Om relevant: enkla streckfigurer eller diagram beskrivna i ord (t.ex. "Rita en pil från X till Y").
- Innehållet ska kunna kopieras rakt av till en tavla eller skrivas ut som A3.

${langInstr} Svara endast med giltigt JSON:
{
  "title": "tavelplanens huvudrubrik",
  "subtitle": "kort underrubrik (1 mening)",
  "sections": [
    { "heading": "underrubrik", "items": ["punkt 1", "punkt 2", "punkt 3"], "visualHint": "valfri instruktion om en skiss/symbol att rita" }
  ],
  "keyTakeaway": "den ENA meningen läraren vill att eleverna minns när de lämnar lektionen"
}`,

    diagram: () => `${langPrefix}Du genererar ett MERMAID-DIAGRAM som visualiserar en central process eller struktur från lektionen.

${meta}
${ctx}

KRAV:
- Välj rätt diagramtyp: flowchart för processer, timeline för tidsförlopp, mindmap för begreppskartor, sequenceDiagram för dialog/händelser, classDiagram för hierarkier.
- Diagrammet ska vara LÄSBART när det skrivs ut — inga onödiga noder, ren struktur.
- Innehållet är konkret från lektionen, inte abstrakt.
- Endast Mermaid-syntax i fältet "code". INGA \`\`\` -staket.

${langInstr} Svara endast med giltigt JSON:
{
  "type": "flowchart|timeline|mindmap|sequenceDiagram|classDiagram",
  "title": "diagrammets titel",
  "description": "vad diagrammet visar (1-2 meningar)",
  "code": "ren mermaid-syntax utan code-fence",
  "useCase": "när i lektionen läraren visar diagrammet"
}`,

    imageSearch: () => `${langPrefix}Du föreslår BILDSÖKNINGAR för varje fas av lektionen — kuraterade länkar till fria bildkällor.

${meta}
${ctx}

KRAV:
- Per fas: 2-3 specifika sökfrågor (på ${isSv ? "engelska för bättre resultat" : "English"}) som hittar relevanta, fria bilder.
- Föreslå rätt källa per fråga: Pixabay, Unsplash, Wikipedia Commons för fakta, ${isSv ? "SO-rummet eller NRM för svensk kontext" : "national archives or museums for cultural content"}.
- Kort förklaring varför bilden hjälper i just den fasen.
- INGA AI-genererade bilder. Endast riktiga sökstrategier.

${langInstr} Svara endast med giltigt JSON:
{
  "phaseSearches": [
    {
      "phaseName": "fasens namn från lektionen",
      "searches": [
        { "query": "engelska sökord", "source": "pixabay|unsplash|commons|other", "url": "https://... direkt sök-URL", "why": "varför bilden hjälper (1 mening)" }
      ]
    }
  ]
}`,
  };

  const builder = builders[kind];
  if (!builder) throw new Error(`Unknown extras kind: ${kind}`);
  return builder();
};
