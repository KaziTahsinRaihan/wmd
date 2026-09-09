"use client";

import DashboardShell, { NavItem } from "@/components/DashboardShell";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCog,
  Settings,
  FileBarChart2,
  Library,
  MessagesSquare,
} from "lucide-react";

const nav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Courses", href: "/admin/courses", icon: Library },
  { label: "All Users", href: "/admin/users", icon: Users },
  { label: "Students", href: "/admin/students", icon: GraduationCap },
  { label: "Instructors", href: "/admin/instructors", icon: UserCog },
  { label: "ChatRoom", href: "/admin/chatroom", icon: MessagesSquare },
  { label: "Reports", href: "/admin/reports", icon: FileBarChart2 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell role="admin" nav={nav}>
      {children}
    </DashboardShell>
  );
}
