"use client";

// "Real Test Mode" vs "Practice Mode" selector shown on every Mock Practice
// start page before entering a test.

export type ExamMode = "real" | "practice";

export default function ModePicker({
  value,
  onChange,
  realNote,
  practiceNote,
}: {
  value: ExamMode;
  onChange: (m: ExamMode) => void;
  realNote: string;
  practiceNote: string;
}) {
  const options: { key: ExamMode; label: string; note: string }[] = [
    { key: "real", label: "Real Test Mode", note: realNote },
    { key: "practice", label: "Practice Mode", note: practiceNote },
  ];
  return (
    <div className="mb-5 grid max-w-2xl gap-3 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={`panel panel-hover text-left transition ${
            value === o.key ? "ring-2 ring-gold-400" : "opacity-75"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold">{o.label}</h4>
            {value === o.key && <span className="badge shrink-0">Selected</span>}
          </div>
          <p className="mt-1 text-sm text-white/60">{o.note}</p>
        </button>
      ))}
    </div>
  );
}
