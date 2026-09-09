// Reading test model + demo content for the Mock Practice section.
//
// The demo test mirrors the official IELTS computer-delivered reading demo:
//   Part 1 (Q1–13)  — "The life and work of Marie Curie": TRUE/FALSE/NOT GIVEN
//                     + note completion (typed answers)
//   Part 2 (Q14–26) — "The Physics of Traffic Behavior": section headings
//                     dragged from the question pane into gaps in the passage,
//                     three two-answer MCQs (each pair shares one joint nav
//                     slot, e.g. "22–23") + single-answer MCQs
//   Part 3 (Q27–40) — "Plain English": YES/NO/NOT GIVEN + summary completion
//                     (typed answers inline in flowing text)

export type Seg = { text: string } | { gap: number };

export type ReadingTfngGroup = {
  kind: "tfng";
  range: [number, number];
  /** "tf" → TRUE/FALSE/NOT GIVEN; "yn" → YES/NO/NOT GIVEN. */
  variant: "tf" | "yn";
  /** One statement per question number, in order. */
  statements: string[];
};

export type ReadingNotesGroup = {
  kind: "notes";
  range: [number, number];
  constraint: string;
  title?: string;
  bullets: Seg[][];
};

export type ReadingSummaryGroup = {
  kind: "summary";
  range: [number, number];
  constraint: string;
  paras: Seg[][];
};

/** Section headings dragged into gaps that live inside the passage pane. */
export type ReadingHeadingsGroup = {
  kind: "headings";
  range: [number, number];
  options: string[];
};

/** A set of two-answer MCQs sharing one "Questions a–b" header. */
export type ReadingMcqMultiSetGroup = {
  kind: "mcq-multi-set";
  range: [number, number];
  items: {
    range: [number, number];
    stem: string;
    options: string[];
  }[];
};

export type ReadingMcqGroup = {
  kind: "mcq";
  range: [number, number];
  questions: { number: number; stem: string; options: string[] }[];
};

/** Teacher-authored pasted content (see PastedGroup in listening-mock). */
export type ReadingPastedGroup = {
  kind: "pasted";
  range: [number, number];
  instructions: string;
  title?: string;
  imageUrl?: string;
  paras: Seg[][];
  options?: string[];
  /** Rich pasted content (sanitized HTML) — rendered instead of `paras`. */
  html?: string;
};

/** Option-selection table: one question per row, one letter column per option. */
export type ReadingTableGroup = {
  kind: "table";
  range: [number, number];
  instructions: string;
  rows: string[];
  cols: string[];
};

/** Flowchart completion with draggable options (teacher-authored). Field
 * names match the listening FlowchartGroup so converters are shared. */
export type ReadingFlowchartGroup = {
  kind: "flowchart";
  range: [number, number];
  instruction: string;
  title: string;
  steps: Seg[][];
  options: string[];
};

export type ReadingGroup =
  | ReadingTfngGroup
  | ReadingNotesGroup
  | ReadingSummaryGroup
  | ReadingHeadingsGroup
  | ReadingMcqMultiSetGroup
  | ReadingMcqGroup
  | ReadingPastedGroup
  | ReadingTableGroup
  | ReadingFlowchartGroup;

export type PassageSection = {
  /** Question number of a droppable heading gap above this section. */
  gap?: number;
  paras: string[];
};

export type ReadingPart = {
  number: number;
  passageTitle: string;
  sections: PassageSection[];
  groups: ReadingGroup[];
};

export type ReadingTest = {
  id: string;
  title: string;
  parts: ReadingPart[];
};

// ----------------------------------------------------------------------------
// Navigation slots — one per answer, except two-answer MCQs (one joint slot).
// ----------------------------------------------------------------------------

export type NavSlot = { partIndex: number; numbers: number[] };

export function buildReadingSlots(test: ReadingTest): NavSlot[] {
  const slots: NavSlot[] = [];
  test.parts.forEach((part, partIndex) => {
    for (const group of part.groups) {
      if (group.kind === "mcq-multi-set") {
        for (const item of group.items) {
          const numbers = [];
          for (let n = item.range[0]; n <= item.range[1]; n++) numbers.push(n);
          slots.push({ partIndex, numbers });
        }
      } else {
        for (let n = group.range[0]; n <= group.range[1]; n++) {
          slots.push({ partIndex, numbers: [n] });
        }
      }
    }
  });
  return slots;
}

export function readingPartQuestionCount(part: ReadingPart): number {
  return part.groups.reduce((sum, g) => sum + (g.range[1] - g.range[0] + 1), 0);
}

// ----------------------------------------------------------------------------
// Answer-key scoring (teacher-authored tests)
// ----------------------------------------------------------------------------

/** Per question number: accepted answers (a line split on "/"). */
export type AnswerKey = Record<number, string[]>;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const letterAt = (i: number) => String.fromCharCode(97 + i);

function optionMatch(value: string, alts: string[], options: string[] | null): boolean {
  const nv = norm(value);
  if (alts.includes(nv)) return true;
  if (options) {
    const idx = options.findIndex((o) => norm(o) === nv);
    if (idx >= 0 && alts.includes(letterAt(idx))) return true;
  }
  return false;
}

export function scoreReading(
  test: ReadingTest,
  answers: Record<number, string>,
  multi: Record<number, string[]>,
  key: AnswerKey,
): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  for (const part of test.parts) {
    for (const g of part.groups) {
      if (g.kind === "mcq-multi-set") {
        for (const item of g.items) {
          const [a, b] = item.range;
          total += b - a + 1;
          const chosen = multi[a] ?? [];
          const used = new Set<number>();
          for (let n = a; n <= b; n++) {
            const alts = (key[n] ?? []).map(norm);
            if (!alts.length) continue;
            const idx = chosen.findIndex((c, i) => !used.has(i) && optionMatch(c, alts, item.options));
            if (idx >= 0) {
              used.add(idx);
              correct++;
            }
          }
        }
        continue;
      }
      const options: string[] | null =
        g.kind === "tfng"
          ? (g.variant === "tf" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"])
          : g.kind === "headings" || g.kind === "flowchart"
            ? g.options
            : g.kind === "table"
              ? g.cols
              : g.kind === "pasted"
                ? (g.options ?? null)
                : null;
      for (let n = g.range[0]; n <= g.range[1]; n++) {
        total++;
        const v = answers[n];
        if (!v?.trim()) continue;
        const alts = (key[n] ?? []).map(norm);
        if (!alts.length) continue;
        const opts = g.kind === "mcq" ? (g.questions.find((q) => q.number === n)?.options ?? null) : options;
        if (optionMatch(v, alts, opts)) correct++;
      }
    }
  }
  return { correct, total };
}

// ----------------------------------------------------------------------------
// Demo test
// ----------------------------------------------------------------------------

const t = (text: string): Seg => ({ text });
const g = (gap: number): Seg => ({ gap });

export const DEMO_READING_TEST: ReadingTest = {
  id: "reading-demo-1",
  title: "Reading — Demo Test",
  parts: [
    {
      number: 1,
      passageTitle: "The life and work of Marie Curie",
      sections: [
        {
          paras: [
            "Marie Curie is probably the most famous woman scientist who has ever lived. Born Maria Sklodowska in Poland in 1867, she is famous for her work on radioactivity, and was twice a winner of the Nobel Prize. With her husband, Pierre Curie, and Henri Becquerel, she was awarded the 1903 Nobel Prize for Physics, and was then sole winner of the 1911 Nobel Prize for Chemistry. She was the first woman to win a Nobel Prize.",
            "From childhood, Marie was remarkable for her prodigious memory, and at the age of 16 won a gold medal on completion of her secondary education. Because her father lost his savings through bad investment, she then had to take work as a teacher. From her earnings she was able to finance her sister Bronia's medical studies in Paris, on the understanding that Bronia would, in turn, later help her to get an education.",
            "In 1891 this promise was fulfilled and Marie went to Paris and began to study at the Sorbonne (the University of Paris). She often worked far into the night and lived on little more than bread and butter and tea. She came first in the examination in the physical sciences in 1893, and in 1894 was placed second in the examination in mathematical sciences. It was not until the spring of that year that she was introduced to Pierre Curie.",
            "Their marriage in 1895 marked the start of a partnership that was soon to achieve results of world significance. Following Henri Becquerel's discovery in 1896 of a new phenomenon, which Marie later called 'radioactivity', Marie Curie decided to find out if the radioactivity discovered in uranium was to be found in other elements. She discovered that this was true for thorium.",
            "Turning her attention to minerals, she found her interest drawn to pitchblende, a mineral whose radioactivity, superior to that of pure uranium, could be explained only by the presence in the ore of small quantities of an unknown substance of very high activity. Pierre Curie joined her in the work that she had undertaken to resolve this problem, and that led to the discovery of the new elements, polonium and radium.",
            "The births of Marie's two daughters, Irène and Ève, in 1897 and 1904 failed to interrupt her scientific work. In 1911 she was awarded the Nobel Prize for Chemistry for the isolation of a pure form of radium. During World War I, Marie Curie, with the help of her daughter Irène, devoted herself to the development of the use of X-radiography for the location of shrapnel in wounded soldiers.",
          ],
        },
      ],
      groups: [
        {
          kind: "tfng",
          range: [1, 6],
          variant: "tf",
          statements: [
            "Marie Curie's husband was a joint winner of both Marie's Nobel Prizes.",
            "Marie became interested in science when she was a child.",
            "Marie was able to attend the Sorbonne because of her sister's financial contribution.",
            "Marie stopped doing research for several years when her children were born.",
            "Marie took over the teaching position her husband had held.",
            "Marie's sister Bronia studied the medical uses of radioactivity.",
          ],
        },
        {
          kind: "notes",
          range: [7, 13],
          constraint: "ONE WORD ONLY",
          title: "Marie Curie's research on radioactivity",
          bullets: [
            [
              t("When uranium was discovered to be radioactive, Marie Curie found that the element called "),
              g(7),
              t(" had the same property."),
            ],
            [
              t("Marie and Pierre Curie's research into the radioactivity of the mineral known as "),
              g(8),
              t(" led to the discovery of two new elements."),
            ],
            [
              t("In 1911, Marie Curie received recognition for her work on the element "),
              g(9),
              t("."),
            ],
            [
              t("Marie and Irène Curie developed X-radiography which was used as a medical technique for "),
              g(10),
              t("."),
            ],
            [
              t("Marie Curie saw the importance of collecting radioactive material both for research and for cases of "),
              g(11),
              t("."),
            ],
            [
              t("The radioactive material stocked in Paris contributed to the discoveries in the 1930s of the "),
              g(12),
              t(" and of what was known as artificial radioactivity."),
            ],
            [
              t("During her research, Marie Curie was exposed to radiation and as a result she suffered from "),
              g(13),
              t("."),
            ],
          ],
        },
      ],
    },
    {
      number: 2,
      passageTitle: "The Physics of Traffic Behavior",
      sections: [
        {
          gap: 14,
          paras: [
            "Some years ago, when several theoretical physicists, principally Dirk Helbing and Boris Kerner of Stuttgart, Germany, began publishing papers on traffic flow in publications normally read by traffic engineers, they were clearly working outside their usual sphere of investigation. They had noticed that if they simulated the movement of vehicles on a highway, using the equations that describe how the molecules of a gas move, some very strange results emerged. Of course, vehicles do not behave exactly like gas molecules: for example, drivers try to avoid collisions by slowing down when they get too near another vehicle, whereas gas molecules have no such concern. However, the physicists modified the equations to take the differences into account and the overall description of traffic as a flowing gas has proved to be a very good one; the moving-gas model of traffic reproduces many phenomena seen in real-world traffic.",
          ],
        },
        {
          gap: 15,
          paras: [
            "The strangest thing that came out of these equations, however, was the implication that congestion can arise completely spontaneously; no external causes are necessary. Vehicles can be flowing freely along, at a density still well below what the road can handle, and then suddenly gel into a slow-moving ooze. Under the right conditions a small, brief and local fluctuation in the speed or spacing of cars is all it takes to trigger a system-wide breakdown that persists for hours.",
          ],
        },
        {
          gap: 16,
          paras: [
            "The physicists have challenged proposals to set a maximum capacity for vehicles on highways. They argue that it may not be enough simply to limit the rate at which vehicles are allowed to enter a highway, rather, it may be necessary to time each vehicle's entry onto a highway precisely to coincide with a temporary drop in the density of vehicles along the road. They further suggest that preventing breakdowns in the flow of traffic could ultimately require implementing the radical idea that has been suggested from time to time: directly regulating the speed and spacing of individual cars along a highway with central computers and sensors that communicate with each car's engine and brake controls.",
          ],
        },
        {
          gap: 17,
          paras: [
            "However, research into traffic control is generally centered in civil engineering departments and here the theories of the physicists have been greeted with some skepticism. Civil engineers favor a practical approach to problems and believe traffic congestion is the result of poor road construction (two lanes becoming one lane or dangerous curves), which constricts the flow of traffic. Engineers questioned how well the physicists' theoretical results relate to traffic in the real world. Indeed, some engineering researchers questioned whether elaborate chaos-theory interpretations are needed at all, since at least some of the traffic phenomena the physicists' theories predict seem to be similar to observations that have been part of the traffic engineering literature for decades.",
          ],
        },
      ],
      groups: [
        {
          kind: "headings",
          range: [14, 17],
          options: [
            "How a maths experiment actually reduced traffic congestion",
            "How a concept from one field of study was applied in another",
            "A lack of investment in driver training",
            "Areas of doubt and disagreement between experts",
            "How different countries have dealt with traffic congestion",
            "The impact of driver behavior on traffic speed",
            "A proposal to take control away from the driver",
          ],
        },
        {
          kind: "mcq-multi-set",
          range: [18, 23],
          items: [
            {
              range: [18, 19],
              stem: "Which TWO options describe what the writer is doing in section two?",
              options: [
                "explaining Helbing and Kerner's attitude to chaos theory",
                "describing how a theoretical model produced surprising results",
                "comparing the behaviour of vehicles with gas molecules",
                "criticising engineers for ignoring the physicists' work",
                "summarising the history of traffic research",
              ],
            },
            {
              range: [20, 21],
              stem: "Which TWO of the following statements are made about the physicists' theories?",
              options: [
                "They may have little to do with everyday traffic behaviour.",
                "They are inconsistent with chaos theory.",
                "They do not really describe anything new.",
                "They can easily be disproved.",
                "They emerged from work in a different field of study.",
              ],
            },
            {
              range: [22, 23],
              stem: "Which TWO of the following options express the purpose of the text?",
              options: [
                "to change the behaviour of vehicle drivers",
                "to discuss contrasting approaches to understanding congestion",
                "to recommend a practical rather than a theoretical approach to traffic control",
                "to inform drivers of future changes to traffic control methods",
                "to give details of some of the behaviours shown by traffic",
              ],
            },
          ],
        },
        {
          kind: "mcq",
          range: [24, 26],
          questions: [
            {
              number: 24,
              stem: "According to the text, the moving-gas model of traffic",
              options: [
                "ignores the differences between vehicles and gas molecules.",
                "reproduces many phenomena seen in real traffic.",
                "was first proposed by civil engineers.",
                "has been abandoned by physicists.",
              ],
            },
            {
              number: 25,
              stem: "The physicists suggest that congestion",
              options: [
                "always has an external cause.",
                "can arise without any external cause.",
                "only happens when a road is at full capacity.",
                "is mainly caused by dangerous curves.",
              ],
            },
            {
              number: 26,
              stem: "Civil engineers believe that traffic congestion is the result of",
              options: [
                "spontaneous fluctuations in speed.",
                "drivers' inability to react in time.",
                "poor road construction.",
                "the moving-gas model being applied wrongly.",
              ],
            },
          ],
        },
      ],
    },
    {
      number: 3,
      passageTitle: "Plain English",
      sections: [
        {
          paras: [
            "There is no theoretical limit to the number of special purposes to which language can be put. As society develops new facets, so language is devised to express them. However, the result is often that language becomes very specialised and complex, and complications arise as ordinary people struggle to make sense of it.",
            "Popular anxiety over special uses of language is most markedly seen in the campaigns to promote 'plain' speaking and writing – notably, the Plain English movements of Britain and the USA. The main aim of these campaigns is to attack the use of unnecessarily complicated language ('gobbledegook') by governments, businesses and other authorities whose role puts them in linguistic contact with the general public. The campaigners argue that such language, whether spoken or written, should be replaced by clearer forms of expression.",
            "The movements took shape only in the 1970s, so it is too soon to ascertain their long-term influence on the characteristics of language varieties. But they have certainly played a major part in promoting public awareness of the existence of communication problems, and have influenced many organisations to do something about it. In Britain, the campaign was launched in 1979, by a ritual shredding of government forms in Parliament Square, London. By 1982, the government had published a report telling departments to improve the design of forms, and to abolish those that were unnecessary. By 1985, around 15,700 forms had disappeared and 21,300 had been revised.",
            "In the USA, President Carter's Executive Order of March 1978 required regulations to be written in plain English, and although the order was revoked in 1981, it made a permanent impact on the copywriting practices of federal and state agencies alike.",
            "The main arguments in favour of plain English are based on studies of the costs of unclear language. When a government form is unclear, thousands of people write or telephone for help, and staff have to be employed to answer them. Businesses lose custom when their instructions cannot be followed, and legal disputes arise when contracts are misunderstood by the people who sign them.",
          ],
        },
      ],
      groups: [
        {
          kind: "tfng",
          range: [27, 33],
          variant: "yn",
          statements: [
            "The Plain English campaigns have already achieved all of their aims.",
            "Complicated official language causes problems only for people with limited education.",
            "The British campaign began with a public event in London.",
            "The British government responded to the campaign within a few years of its launch.",
            "President Carter's Executive Order had no lasting effect in the USA.",
            "Unclear language can have financial consequences for businesses.",
            "Plain English documents take longer to write than traditional ones.",
          ],
        },
        {
          kind: "summary",
          range: [34, 40],
          constraint: "NO MORE THAN TWO WORDS",
          paras: [
            [
              t("For businesses, the use of complex language can have financial implications. The benefits of plain language can be seen in the case of companies who remove "),
              g(34),
              t(" from their forms and achieve "),
              g(35),
              t(" as a result."),
            ],
            [
              t("Consumers often complain that they experience a feeling of "),
              g(36),
              t(" when trying to put together do-it-yourself products which have not been tested by companies on a "),
              g(37),
              t(". In situations where not keeping to the correct procedures could affect safety issues, it is especially important that "),
              g(38),
              t(" information is not left out and no assumptions are made about a stage being self-evident or the consumer having a certain amount of "),
              g(39),
              t("."),
            ],
            [
              t("Lawyers, however, have raised objections to the use of plain English. They feel that it would result in ambiguity in documents and cause people to lose faith in "),
              g(40),
              t(", as it would mean departing from language that has been used in the courts for a very long time."),
            ],
          ],
        },
      ],
    },
  ],
};
