// Speaking test model + demo content for the Mock Practice section.
//
// A speaking test has three parts, mirroring the real exam:
//   Part 1 (Introduction)        — 1–2 topics, several short questions each,
//                                  asked one at a time; the student records an
//                                  answer per question.
//   Part 2 (Individual long turn) — one cue card; 1 minute preparation, then
//                                  2 minutes of speaking recorded automatically.
//   Part 3 (Thematic discussion) — follow-up questions, one at a time.

export type SpeakingTopic = {
  title?: string;
  questions: string[];
};

export type SpeakingTest = {
  id: string;
  title: string;
  /** 1–2 introduction topics. */
  part1: SpeakingTopic[];
  part2: {
    /** Rich cue card (sanitized HTML) — preferred when present. */
    cueCardHtml?: string;
    /** Plain-text cue card fallback (blank line = new paragraph). */
    cueCardText?: string;
    prepSeconds: number;
    speakSeconds: number;
  };
  /** Discussion questions, one per entry. */
  part3: string[];
};

/** One recordable task in the flattened test flow. */
export type SpeakingTask =
  | { part: 1 | 3; number: number; topicTitle?: string; question: string }
  | { part: 2; number: number };

/** Flatten a test into the ordered list of recordable tasks. */
export function buildSpeakingTasks(test: SpeakingTest): SpeakingTask[] {
  const tasks: SpeakingTask[] = [];
  let n = 1;
  for (const topic of test.part1) {
    for (const q of topic.questions) {
      tasks.push({ part: 1, number: n++, topicTitle: topic.title, question: q });
    }
  }
  tasks.push({ part: 2, number: n++ });
  for (const q of test.part3) {
    tasks.push({ part: 3, number: n++, question: q });
  }
  return tasks;
}

export function speakingQuestionCount(test: SpeakingTest): number {
  return test.part1.reduce((s, t) => s + t.questions.length, 0) + 1 + test.part3.length;
}

export const DEMO_SPEAKING_TEST: SpeakingTest = {
  id: "speaking-demo-1",
  title: "Speaking — Demo Test",
  part1: [
    {
      title: "Your home town",
      questions: [
        "Where is your home town, and what is it like?",
        "What do you like most about living there?",
        "Has your home town changed much since you were a child?",
        "Would you like to live there in the future? Why or why not?",
      ],
    },
    {
      title: "Free time",
      questions: [
        "What do you usually do in your free time?",
        "Do you prefer spending free time alone or with friends?",
        "Is there a new hobby you would like to try? Why?",
      ],
    },
  ],
  part2: {
    cueCardText: [
      "Describe a place you enjoy visiting.",
      "You should say:\nwhere the place is\nhow often you go there\nwhat you do there\nand explain why you enjoy visiting this place.",
    ].join("\n\n"),
    prepSeconds: 60,
    speakSeconds: 120,
  },
  part3: [
    "Why do you think some places become popular with visitors?",
    "How does tourism change a place over time?",
    "Do people today travel more than people did in the past? Why?",
    "Is it better to visit famous places or less well-known ones?",
    "How might the way people travel change in the future?",
  ],
};
