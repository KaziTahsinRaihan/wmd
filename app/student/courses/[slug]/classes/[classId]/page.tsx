// Server wrapper: static export needs every course/class pair enumerated.
import { COURSES, flattenClasses } from "@/lib/courses";
import ClassVideoPage from "./view";

export function generateStaticParams() {
  return COURSES.flatMap((course) =>
    flattenClasses(course).map((cls) => ({
      slug: course.slug,
      classId: cls.id,
    })),
  );
}

export default function Page() {
  return <ClassVideoPage />;
}
