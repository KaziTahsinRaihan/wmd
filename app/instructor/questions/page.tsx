"use client";

import { Suspense } from "react";
import QuestionBuilder from "@/components/instructor/QuestionBuilder";

export default function AddMockQuestionsPage() {
  return (
    <Suspense fallback={null}>
      <QuestionBuilder />
    </Suspense>
  );
}
