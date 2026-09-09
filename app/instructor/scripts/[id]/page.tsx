// Server wrapper: static export needs the submission ids enumerated.
import { writingSubmissions } from "@/lib/mock-data";
import WritingEvaluatorPage from "./view";

export function generateStaticParams() {
  return writingSubmissions.map((s) => ({ id: s.id }));
}

export default function Page() {
  return <WritingEvaluatorPage />;
}
