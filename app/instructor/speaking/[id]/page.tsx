// Server wrapper: static export needs the submission ids enumerated.
import { speakingSubmissions } from "@/lib/mock-data";
import SpeakingEvaluatorPage from "./view";

export function generateStaticParams() {
  return speakingSubmissions.map((s) => ({ id: s.id }));
}

export default function Page() {
  return <SpeakingEvaluatorPage />;
}
