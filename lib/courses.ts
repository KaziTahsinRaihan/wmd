export type CourseFormat = "online" | "live" | "hybrid";
export type CourseExam = "ielts" | "pte" | "toefl" | "duolingo" | "general";
export type CourseLevel = "Beginner" | "Intermediate" | "Advanced" | "All Levels";

export type CourseModule = {
  title: string;
  lessons: string[];
};

export type CourseLiveSlot = {
  day: string;
  time: string;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  exam: CourseExam;
  format: CourseFormat;
  tagline: string;
  description: string;
  durationWeeks: number;
  lessonsCount: number;
  level: CourseLevel;
  /** Discounted enrollment price (what the wizard actually pays). BDT. */
  price: number;
  /** Original list price shown struck-through above the discounted price. BDT. */
  originalPrice: number;
  currency: "BDT";
  instructors: string[];
  modules: CourseModule[];
  schedule?: CourseLiveSlot[];
  startDate?: string;
  features: string[];
};

export const ORIGINAL_LIST_PRICE = 10000;

export const COURSES: Course[] = [
  {
    id: "c-basic",
    slug: "basic-english",
    title: "Basic English Course",
    exam: "general",
    format: "online",
    tagline: "Build a fearless foundation in everyday English.",
    description:
      "An eight-week journey from the alphabet to confident conversation — grammar, vocabulary, listening, and speaking practice for absolute beginners.",
    durationWeeks: 8,
    lessonsCount: 32,
    level: "Beginner",
    price: 6000,
    originalPrice: ORIGINAL_LIST_PRICE,
    currency: "BDT",
    instructors: ["Ms. Lina Park"],
    features: [
      "Self-paced bite-sized lessons",
      "200+ vocabulary cards",
      "Weekly speaking prompts with AI feedback",
      "Certificate on completion",
    ],
    modules: [
      {
        title: "Foundations",
        lessons: ["Sounds & alphabet", "Subject pronouns", "Verb 'to be'", "Common greetings"],
      },
      {
        title: "Everyday vocabulary",
        lessons: ["Family & home", "Food & drink", "Numbers & time", "Directions"],
      },
      {
        title: "Grammar essentials",
        lessons: ["Present simple", "Articles & nouns", "Adjectives", "Past simple"],
      },
      {
        title: "Speaking & listening",
        lessons: ["Self-introduction", "Asking questions", "Phone conversations", "Storytelling"],
      },
    ],
  },
  {
    id: "c-ielts-online",
    slug: "ielts-online",
    title: "IELTS Online",
    exam: "ielts",
    format: "online",
    tagline: "The full IELTS Academic prep — at your pace.",
    description:
      "Forty on-demand lessons across all four modules, with full-length practice tests, AI-graded essays, and personalized feedback on speaking responses.",
    durationWeeks: 6,
    lessonsCount: 40,
    level: "All Levels",
    price: 7500,
    originalPrice: ORIGINAL_LIST_PRICE,
    currency: "BDT",
    instructors: ["Mr. Daniel Cole", "Ms. Lina Park"],
    features: [
      "All four modules: Listening, Reading, Writing, Speaking",
      "8 full-length mock tests",
      "AI essay grader with band-by-band feedback",
      "On-demand speaking interview simulator",
    ],
    modules: [
      {
        title: "Listening",
        lessons: ["Section types", "Map labelling", "Multiple choice traps", "Note completion"],
      },
      {
        title: "Reading",
        lessons: ["Skimming & scanning", "True/False/Not Given", "Matching headings", "Sentence completion"],
      },
      {
        title: "Writing",
        lessons: ["Task 1 letters", "Task 1 reports", "Task 2 argument essay", "Task 2 discussion essay"],
      },
      {
        title: "Speaking",
        lessons: ["Part 1 fluency", "Part 2 cue cards", "Part 3 discussion", "Pronunciation polish"],
      },
    ],
  },
  {
    id: "c-ielts-live",
    slug: "ielts-live-batch",
    title: "IELTS Live Batch",
    exam: "ielts",
    format: "live",
    tagline: "Small live cohorts with a band 8+ instructor.",
    description:
      "Eight weeks of two-evenings-a-week live sessions, weekly graded mock tests, and one-on-one speaking checkpoints. Limited seats per batch.",
    durationWeeks: 8,
    lessonsCount: 32,
    level: "Intermediate",
    price: 8000,
    originalPrice: ORIGINAL_LIST_PRICE,
    currency: "BDT",
    instructors: ["Mr. Daniel Cole"],
    startDate: "2026-06-08",
    schedule: [
      { day: "Tuesday", time: "19:00" },
      { day: "Thursday", time: "19:00" },
    ],
    features: [
      "Live classes twice a week",
      "Weekly instructor-graded mocks",
      "Three 1:1 speaking checkpoints",
      "Cohort Slack channel access",
    ],
    modules: [
      {
        title: "Diagnostic & roadmap",
        lessons: ["Diagnostic mock", "Goal setting", "Study plan", "Skill audit"],
      },
      {
        title: "Skill bootcamps",
        lessons: ["Listening drills", "Reading speed gym", "Writing clinic", "Speaking lab"],
      },
      {
        title: "Mock simulations",
        lessons: ["Half-length mock", "Full mock 1", "Full mock 2", "Final mock"],
      },
      {
        title: "Exam-day playbook",
        lessons: ["Time strategy", "Stress management", "Common pitfalls", "Day-of checklist"],
      },
    ],
  },
  {
    id: "c-pte-online",
    slug: "pte-online",
    title: "PTE Online",
    exam: "pte",
    format: "online",
    tagline: "PTE Academic prep that mirrors the real test.",
    description:
      "Five focused weeks on the 20 PTE task types, AI scoring on Read Aloud and Describe Image, and full-length scored mocks with section diagnostics.",
    durationWeeks: 5,
    lessonsCount: 28,
    level: "Intermediate",
    price: 7000,
    originalPrice: ORIGINAL_LIST_PRICE,
    currency: "BDT",
    instructors: ["Ms. Lina Park"],
    features: [
      "All 20 PTE task types covered",
      "AI scoring for Read Aloud / Describe Image",
      "4 scored mock tests",
      "Skill-level diagnostics",
    ],
    modules: [
      {
        title: "Speaking & writing",
        lessons: ["Read aloud", "Describe image", "Re-tell lecture", "Summarize written text"],
      },
      {
        title: "Reading",
        lessons: ["Multiple choice", "Re-order paragraphs", "Reading fill-in-the-blanks", "Reading & writing fill-in-the-blanks"],
      },
      {
        title: "Listening",
        lessons: ["Summarize spoken text", "Highlight correct summary", "Fill in the blanks", "Write from dictation"],
      },
      {
        title: "Mocks & strategy",
        lessons: ["Scored mock 1", "Scored mock 2", "Scored mock 3", "Exam-day strategy"],
      },
    ],
  },
  {
    id: "c-toefl-online",
    slug: "toefl-online",
    title: "TOEFL Online",
    exam: "toefl",
    format: "online",
    tagline: "Integrated-skills mastery for TOEFL iBT.",
    description:
      "Six weeks tackling the unique integrated-task format of TOEFL iBT — with template-driven writing, speaking response coaching, and timed mocks.",
    durationWeeks: 6,
    lessonsCount: 36,
    level: "Intermediate",
    price: 7500,
    originalPrice: ORIGINAL_LIST_PRICE,
    currency: "BDT",
    instructors: ["Mr. Daniel Cole"],
    features: [
      "Integrated speaking & writing tasks",
      "Template-driven independent essay",
      "Pronunciation feedback on responses",
      "6 timed mock tests",
    ],
    modules: [
      {
        title: "Reading",
        lessons: ["Factual info", "Inference", "Vocabulary in context", "Summarize"],
      },
      {
        title: "Listening",
        lessons: ["Lecture notes", "Conversation cues", "Attitude questions", "Detail tracking"],
      },
      {
        title: "Speaking",
        lessons: ["Independent task", "Integrated task 2", "Integrated task 3", "Integrated task 4"],
      },
      {
        title: "Writing",
        lessons: ["Integrated essay", "Independent essay", "Discussion task", "Response polish"],
      },
    ],
  },
  {
    id: "c-duolingo-online",
    slug: "duolingo-online",
    title: "Duolingo Online",
    exam: "duolingo",
    format: "online",
    tagline: "Fast, focused prep for the 60-minute DET.",
    description:
      "Four sprint weeks built around the adaptive Duolingo English Test — every task type drilled, with score-band targeted practice and writing samples.",
    durationWeeks: 4,
    lessonsCount: 20,
    level: "All Levels",
    price: 6500,
    originalPrice: ORIGINAL_LIST_PRICE,
    currency: "BDT",
    instructors: ["Ms. Lina Park"],
    features: [
      "All 11 DET task types",
      "Adaptive practice engine",
      "Writing & speaking sample bank",
      "2 graded mock attempts",
    ],
    modules: [
      {
        title: "Quick-fire tasks",
        lessons: ["Read & complete", "Read & select", "Listen & select", "Listen & type"],
      },
      {
        title: "Productive tasks",
        lessons: ["Read aloud", "Speak about photo", "Write about photo", "Speak/write sample"],
      },
      {
        title: "Interactive section",
        lessons: ["Interactive reading", "Interactive listening", "Writing sample", "Speaking sample"],
      },
      {
        title: "Mocks",
        lessons: ["Mock attempt 1", "Score review", "Mock attempt 2", "Test-day kit"],
      },
    ],
  },
];

export type CourseOverrides = Record<
  string,
  Partial<Pick<Course, "price" | "title" | "tagline"> & { published: boolean }>
>;

const OVERRIDES_KEY = "wise-mans-doctrine:course-overrides";
const enrollmentsKey = (userId: string) => `wise-mans-doctrine:enrollments:${userId}`;
const progressKey = (userId: string, slug: string) =>
  `wise-mans-doctrine:course-progress:${userId}:${slug}`;
const announcementsKey = (slug: string) =>
  `wise-mans-doctrine:course-updates:${slug}`;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getOverrides(): CourseOverrides {
  return readJSON<CourseOverrides>(OVERRIDES_KEY, {});
}

export function setOverride(
  slug: string,
  patch: Partial<Pick<Course, "price" | "title" | "tagline"> & { published: boolean }>,
) {
  const current = getOverrides();
  current[slug] = { ...current[slug], ...patch };
  writeJSON(OVERRIDES_KEY, current);
}

export function applyOverrides(course: Course, overrides: CourseOverrides): Course & { published: boolean } {
  const o = overrides[course.slug] || {};
  return {
    ...course,
    title: o.title ?? course.title,
    tagline: o.tagline ?? course.tagline,
    price: o.price ?? course.price,
    published: o.published ?? true,
  };
}

export function getCourses(opts?: { includeUnpublished?: boolean }): (Course & { published: boolean })[] {
  const overrides = getOverrides();
  const list = COURSES.map((c) => applyOverrides(c, overrides));
  return opts?.includeUnpublished ? list : list.filter((c) => c.published);
}

export function getCourse(slug: string): (Course & { published: boolean }) | undefined {
  return getCourses({ includeUnpublished: true }).find((c) => c.slug === slug);
}

export function getEnrollments(userId: string): string[] {
  return readJSON<string[]>(enrollmentsKey(userId), []);
}

export function setEnrolled(userId: string, slug: string, enrolled: boolean) {
  const list = getEnrollments(userId);
  const next = enrolled ? Array.from(new Set([...list, slug])) : list.filter((s) => s !== slug);
  writeJSON(enrollmentsKey(userId), next);
}

export function isEnrolled(userId: string, slug: string): boolean {
  return getEnrollments(userId).includes(slug);
}

export function getCompletedLessons(userId: string, slug: string): string[] {
  return readJSON<string[]>(progressKey(userId, slug), []);
}

export function setLessonComplete(
  userId: string,
  slug: string,
  lessonId: string,
  complete: boolean,
) {
  const current = getCompletedLessons(userId, slug);
  const next = complete
    ? Array.from(new Set([...current, lessonId]))
    : current.filter((l) => l !== lessonId);
  writeJSON(progressKey(userId, slug), next);
}

export function getProgressPercent(userId: string, course: Course): number {
  const completed = getCompletedLessons(userId, course.slug).length;
  const total = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function lessonId(moduleIdx: number, lessonIdx: number) {
  return `m${moduleIdx}-l${lessonIdx}`;
}

/** Live courses (e.g. IELTS Live Batch) show a live class list and have no
 *  recorded video pages; every other course shows module-wise video classes. */
export function isLiveCourse(course: Pick<Course, "format">): boolean {
  return course.format === "live";
}

/** Inverse of {@link lessonId}: "m0-l2" → { moduleIdx: 0, lessonIdx: 2 }. */
export function parseClassId(
  id: string,
): { moduleIdx: number; lessonIdx: number } | null {
  const m = /^m(\d+)-l(\d+)$/.exec(id);
  if (!m) return null;
  return { moduleIdx: Number(m[1]), lessonIdx: Number(m[2]) };
}

export type CourseClass = {
  id: string;
  moduleIdx: number;
  lessonIdx: number;
  moduleTitle: string;
  title: string;
};

/** Flattens a course's modules into an ordered list of classes, used for
 *  breadcrumbs and prev/next navigation on the video page. */
export function flattenClasses(course: Course): CourseClass[] {
  const out: CourseClass[] = [];
  course.modules.forEach((m, moduleIdx) => {
    m.lessons.forEach((title, lessonIdx) => {
      out.push({
        id: lessonId(moduleIdx, lessonIdx),
        moduleIdx,
        lessonIdx,
        moduleTitle: m.title,
        title,
      });
    });
  });
  return out;
}

/** Resolves a class id within a course to its class entry, or null. */
export function getClass(course: Course, classId: string): CourseClass | null {
  const parsed = parseClassId(classId);
  if (!parsed) return null;
  const mod = course.modules[parsed.moduleIdx];
  const title = mod?.lessons[parsed.lessonIdx];
  if (!mod || title === undefined) return null;
  return {
    id: classId,
    moduleIdx: parsed.moduleIdx,
    lessonIdx: parsed.lessonIdx,
    moduleTitle: mod.title,
    title,
  };
}

// Shared sample media for recorded classes. Real per-class URLs can be swapped
// in here later without touching the player or pages.
export const SAMPLE_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
export const SAMPLE_CAPTIONS_URL = "/sample-captions.vtt";

// ============================================================================
// Per-class comments (localStorage)
// ============================================================================

export type ClassComment = {
  id: string;
  userId: string;
  author: string;
  avatar?: string;
  text: string;
  at: string;
  editedAt?: string;
};

const classCommentsKey = (slug: string, classId: string) =>
  `wise-mans-doctrine:class-comments:${slug}:${classId}`;

export function getClassComments(slug: string, classId: string): ClassComment[] {
  return readJSON<ClassComment[]>(classCommentsKey(slug, classId), []);
}

export function addClassComment(
  slug: string,
  classId: string,
  user: { id: string; name: string; avatar?: string },
  text: string,
): ClassComment[] {
  const trimmed = text.trim();
  if (!trimmed) return getClassComments(slug, classId);
  const comment: ClassComment = {
    id: `cm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: user.id,
    author: user.name,
    avatar: user.avatar,
    text: trimmed,
    at: new Date().toISOString(),
  };
  const next = [...getClassComments(slug, classId), comment];
  writeJSON(classCommentsKey(slug, classId), next);
  return next;
}

export function editClassComment(
  slug: string,
  classId: string,
  commentId: string,
  text: string,
): ClassComment[] {
  const trimmed = text.trim();
  const next = getClassComments(slug, classId).map((c) =>
    c.id === commentId && trimmed
      ? { ...c, text: trimmed, editedAt: new Date().toISOString() }
      : c,
  );
  writeJSON(classCommentsKey(slug, classId), next);
  return next;
}

export function deleteClassComment(
  slug: string,
  classId: string,
  commentId: string,
): ClassComment[] {
  const next = getClassComments(slug, classId).filter((c) => c.id !== commentId);
  writeJSON(classCommentsKey(slug, classId), next);
  return next;
}

export type Announcement = {
  id: string;
  message: string;
  by: string;
  at: string;
};

export function getAnnouncements(slug: string): Announcement[] {
  return readJSON<Announcement[]>(announcementsKey(slug), []);
}

export function addAnnouncement(slug: string, by: string, message: string) {
  const list = getAnnouncements(slug);
  const next: Announcement[] = [
    { id: `a-${Date.now()}`, by, message, at: new Date().toISOString() },
    ...list,
  ].slice(0, 30);
  writeJSON(announcementsKey(slug), next);
  return next;
}

export function deleteAnnouncement(slug: string, id: string) {
  const list = getAnnouncements(slug).filter((a) => a.id !== id);
  writeJSON(announcementsKey(slug), list);
  return list;
}

export const CURRENCY_SYMBOL = "৳";

export function formatBDT(amount: number): string {
  // Bangladeshi locale uses lakh/crore separators but the standard
  // grouping (en-IN) is closest to the local convention.
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatPrice(course: Pick<Course, "price">): string {
  return formatBDT(course.price);
}

export function formatOriginalPrice(
  course: Pick<Course, "originalPrice">,
): string {
  return formatBDT(course.originalPrice);
}

/** Returns the percent discount (0–100, rounded) based on original vs final price. */
export function discountPercent(
  course: Pick<Course, "price" | "originalPrice">,
): number {
  if (!course.originalPrice || course.originalPrice <= course.price) return 0;
  return Math.round(
    ((course.originalPrice - course.price) / course.originalPrice) * 100,
  );
}

export function examLabel(exam: CourseExam): string {
  switch (exam) {
    case "ielts": return "IELTS";
    case "pte": return "PTE Academic";
    case "toefl": return "TOEFL iBT";
    case "duolingo": return "Duolingo English Test";
    case "general": return "Foundation";
  }
}
