// Writing exam content model + a sample two-task paper.
//
// The IELTS Writing test is 60 minutes: Task 1 (~20 min, ≥150 words) and
// Task 2 (~40 min, ≥250 words). Both tasks share the timer.

export type ChartSeries = { label: string; color: string; values: number[] };

export type BarChart = {
  title: string;
  yLabel: string;
  xLabel?: string;
  categories: string[];
  series: ChartSeries[];
  yMax: number;
  yStep: number;
};

export type WritingTask = {
  taskNumber: 1 | 2;
  instruction: string; // e.g. "You should spend about 20 minutes on this task. Write at least 150 words."
  minWords: number;
  promptHeader?: string; // e.g. "Write about the following topic:"
  promptParas: string[]; // bold prompt paragraphs
  closing?: string; // e.g. "Give reasons for your answer…"
  chart?: BarChart;
  /** Teacher-uploaded picture (Task 1 chart/diagram photo). */
  imageUrl?: string;
};

export type WritingExam = {
  id: string;
  title: string;
  durationMin: number;
  task1: WritingTask;
  task2: WritingTask;
};

export const SAMPLE_WRITING_EXAM: WritingExam = {
  id: "writing-sample",
  title: "Writing — Sample Test",
  durationMin: 60,
  task1: {
    taskNumber: 1,
    instruction: "You should spend about 20 minutes on this task. Write at least 150 words.",
    minWords: 150,
    promptParas: [
      "The chart below shows the number of adults participating in different major sports in one area, in 1997 and 2017.",
      "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    ],
    chart: {
      title: "Number of adults participating in major sports, 1997 and 2017",
      yLabel: "Number of adults in thousands",
      xLabel: "Major sport",
      categories: ["Tennis", "Basketball", "Cricket", "Golf", "Swimming", "Football", "Rugby"],
      yMax: 60,
      yStep: 10,
      series: [
        { label: "1997", color: "#2b2b2b", values: [50, 9, 26, 32, 35, 32, 33] },
        { label: "2017", color: "#9a9a9a", values: [55, 23, 7, 33, 35, 48, 49] },
      ],
    },
  },
  task2: {
    taskNumber: 2,
    instruction: "You should spend about 40 minutes on this task. Write at least 250 words.",
    minWords: 250,
    promptHeader: "Write about the following topic:",
    promptParas: [
      "The world of work is changing rapidly and employees cannot depend on having the same job or the same working conditions for life.",
      "Discuss the possible causes for this rapid change, and suggest ways of preparing people for the world of work in the future.",
    ],
    closing:
      "Give reasons for your answer and include any relevant examples from your own knowledge or experience.",
  },
};

export function getWritingExam(_id: string): WritingExam {
  return SAMPLE_WRITING_EXAM;
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}
