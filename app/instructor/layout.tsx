"use client";

import DashboardShell, { NavItem } from "@/components/DashboardShell";
import {
  LayoutDashboard,
  FileCheck,
  Mic,
  Video,
  CalendarDays,
  FilePlus,
  FolderTree,
  Clock,
  Library,
} from "lucide-react";

const nav: NavItem[] = [
  { label: "Overview", href: "/instructor", icon: LayoutDashboard },
  { label: "My Courses", href: "/instructor/courses", icon: Library },
  { label: "Check Scripts", href: "/instructor/scripts", icon: FileCheck },
  { label: "Evaluate Speaking", href: "/instructor/speaking", icon: Mic },
  { label: "Conduct Class", href: "/instructor/class", icon: Video },
  { label: "Upcoming Schedule", href: "/instructor/schedule", icon: CalendarDays },
  { label: "Add Mock Questions", href: "/instructor/questions", icon: FilePlus },
  { label: "Question Bank", href: "/instructor/question-bank", icon: FolderTree },
  { label: "Speaking Availability", href: "/instructor/availability", icon: Clock },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell role="instructor" nav={nav}>
      {children}
    </DashboardShell>
  );
}
