"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CourseIcon } from "@/components/CourseCard";
import {
  Course,
  examLabel,
  getCourses,
  setOverride,
  getOverrides,
  formatBDT,
  CURRENCY_SYMBOL,
  discountPercent,
} from "@/lib/courses";
import { Save, EyeOff, Eye, Users, Wallet, BookOpen } from "lucide-react";

type Row = Course & { published: boolean; enrolled: number };

export default function AdminCoursesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const all = getCourses({ includeUnpublished: true });
    setRows(
      all.map((c) => ({ ...c, enrolled: countEnrollmentsAcrossUsers(c.slug) })),
    );
  }, [tick]);

  const togglePublished = (slug: string) => {
    const overrides = getOverrides();
    const current = overrides[slug]?.published ?? true;
    setOverride(slug, { published: !current });
    setTick((t) => t + 1);
  };

  const updatePrice = (slug: string, price: number) => {
    setOverride(slug, { price });
    setTick((t) => t + 1);
  };

  const totalEnrolled = rows.reduce((n, r) => n + r.enrolled, 0);
  const publishedCount = rows.filter((r) => r.published).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Catalog"
        title={<>Manage <span className="gold-text">courses</span></>}
        description="Publish or hide courses, tweak pricing, and see enrolment numbers at a glance."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat icon={BookOpen} label="Courses" value={`${rows.length}`} sub={`${publishedCount} published`} />
        <Stat icon={Users} label="Total enrollments" value={`${totalEnrolled}`} sub="across all courses" />
        <Stat
          icon={Wallet}
          label="Avg. price"
          value={
            rows.length
              ? formatBDT(
                  Math.round(rows.reduce((n, r) => n + r.price, 0) / rows.length),
                )
              : "—"
          }
          sub="published, after discount"
        />
      </div>

      <div className="panel overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Format</th>
              <th className="px-4 py-3">Instructors</th>
              <th className="px-4 py-3 text-right">Enrolled</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <CourseRow
                key={r.slug}
                row={r}
                onTogglePublished={() => togglePublished(r.slug)}
                onPrice={(v) => updatePrice(r.slug, v)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourseRow({
  row,
  onTogglePublished,
  onPrice,
}: {
  row: Row;
  onTogglePublished: () => void;
  onPrice: (v: number) => void;
}) {
  const [price, setPrice] = useState(row.price.toString());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPrice(row.price.toString());
    setDirty(false);
  }, [row.price]);

  const save = () => {
    const v = Number(price);
    if (Number.isFinite(v) && v >= 0) {
      onPrice(Math.round(v));
    }
  };

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-gradient text-ink-950">
            <CourseIcon slug={row.slug} className="h-4 w-4" />
          </span>
          <span className="font-medium">{row.title}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-white/70">{examLabel(row.exam)}</td>
      <td className="px-4 py-3 text-white/70 capitalize">{row.format}</td>
      <td className="px-4 py-3 text-white/70">{row.instructors.join(", ")}</td>
      <td className="px-4 py-3 text-right font-semibold">{row.enrolled}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-white/50">{CURRENCY_SYMBOL}</span>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setDirty(true);
              }}
              className="w-24 rounded-md border border-white/15 bg-ink-800/80 px-2 py-1 text-white"
            />
          </div>
          <span className="text-xs text-white/40 line-through whitespace-nowrap">
            {formatBDT(row.originalPrice)}
          </span>
          {discountPercent(row) > 0 && (
            <span className="text-[11px] font-semibold text-gold-300 whitespace-nowrap">
              −{discountPercent(row)}%
            </span>
          )}
          {dirty && (
            <button
              type="button"
              onClick={save}
              className="rounded-md border border-gold-500/40 bg-gold-500/15 p-1 text-gold-100 hover:bg-gold-500/25"
              aria-label="Save price"
            >
              <Save className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {row.published ? (
          <span className="badge">Published</span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/70">
            Hidden
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onTogglePublished}
          className="btn-ghost"
          title={row.published ? "Hide from catalog" : "Publish to catalog"}
        >
          {row.published ? (
            <>
              <EyeOff className="h-4 w-4" /> Hide
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" /> Publish
            </>
          )}
        </button>
      </td>
    </tr>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="panel">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-2xl font-black gold-text">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/50">{sub}</p>}
    </div>
  );
}

function countEnrollmentsAcrossUsers(slug: string): number {
  if (typeof window === "undefined") return 0;
  let count = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith("wise-mans-doctrine:enrollments:")) continue;
    try {
      const list = JSON.parse(window.localStorage.getItem(key) || "[]") as string[];
      if (list.includes(slug)) count++;
    } catch {
      /* ignore */
    }
  }
  return count;
}
