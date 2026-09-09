"use client";

import DashboardShell, { NavItem } from "@/components/DashboardShell";
import TargetScoreModal from "@/components/TargetScoreModal";
import {
  LayoutDashboard,
  ClipboardCheck,
  LineChart,
  GraduationCap,
  Library,
  MessagesSquare,
  Bot,
  Trophy,
  FileCheck,
  Mic,
} from "lucide-react";

const nav: NavItem[] = [
  { label: "Overview", href: "/student", icon: LayoutDashboard },
  { label: "Courses", href: "/student/courses", icon: Library },
  {
    label: "Mock Practice",
    href: "/student/mock-practice",
    icon: ClipboardCheck,
    children: [
      { label: "Listening", href: "/student/mock-practice/listening" },
      { label: "Reading", href: "/student/mock-practice/reading" },
      { label: "Writing", href: "/student/mock-practice/writing" },
      { label: "Speaking", href: "/student/mock-practice/speaking" },
    ],
  },
  { label: "Writing Feedback", href: "/student/writing-feedback", icon: FileCheck },
  { label: "Speaking Feedback", href: "/student/speaking-feedback", icon: Mic },
  { label: "Practice with AI", href: "/student/practice-with-ai", icon: Bot },
  { label: "Join Class", href: "/student/classes", icon: GraduationCap },
  { label: "ChatRoom", href: "/student/chatroom", icon: MessagesSquare },
  { label: "Leaderboard", href: "/student/leaderboard", icon: Trophy },
  { label: "Performance Tracker", href: "/student/performance", icon: LineChart },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell role="student" nav={nav}>
      <TargetScoreModal />
      {children}
    </DashboardShell>
  );
}
