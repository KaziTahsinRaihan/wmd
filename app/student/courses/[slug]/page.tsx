// Server wrapper: static export needs the slugs enumerated at build time.
import { COURSES } from "@/lib/courses";
import StudentCourseDetailPage from "./view";

export function generateStaticParams() {
  return COURSES.map((c) => ({ slug: c.slug }));
}

export default function Page() {
  return <StudentCourseDetailPage />;
}
