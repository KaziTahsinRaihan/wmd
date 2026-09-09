"use client";

import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { initialUsers } from "@/lib/admin-data";
import {
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  UserCog,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

export default function AdminOverview() {
  const { user } = useAuth();
  if (!user) return null;

  const students = initialUsers.filter((u) => u.role === "student");
  const instructors = initialUsers.filter((u) => u.role === "instructor");
  const pending = initialUsers.filter((u) => u.status === "pending");

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Admin workspace"
        title={<>Platform <span className="gold-text">command center</span></>}
        description="Full control over onboarding, offboarding and oversight."
        actions={
          <span className="badge">
            <ShieldCheck className="mr-1 h-3 w-3" /> Super admin
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="panel">
          <GraduationCap className="h-6 w-6 text-gold-400" />
          <p className="mt-3 text-xs uppercase tracking-wide text-white/50">Students</p>
          <p className="mt-1 text-3xl font-bold gold-text">{students.length}</p>
        </div>
        <div className="panel">
          <UserCog className="h-6 w-6 text-gold-400" />
          <p className="mt-3 text-xs uppercase tracking-wide text-white/50">Instructors</p>
          <p className="mt-1 text-3xl font-bold gold-text">{instructors.length}</p>
        </div>
        <div className="panel">
          <UserPlus className="h-6 w-6 text-gold-400" />
          <p className="mt-3 text-xs uppercase tracking-wide text-white/50">Pending approvals</p>
          <p className="mt-1 text-3xl font-bold gold-text">{pending.length}</p>
        </div>
        <div className="panel">
          <ShieldCheck className="h-6 w-6 text-gold-400" />
          <p className="mt-3 text-xs uppercase tracking-wide text-white/50">System health</p>
          <p className="mt-1 text-3xl font-bold gold-text">100%</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Link href="/admin/students" className="panel panel-hover group">
          <h3 className="text-lg font-bold">Manage Students</h3>
          <p className="mt-1 text-sm text-white/60">
            Onboard, approve, suspend or offboard student accounts.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 group-hover:gap-2 transition-all">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
        <Link href="/admin/instructors" className="panel panel-hover group">
          <h3 className="text-lg font-bold">Manage Instructors</h3>
          <p className="mt-1 text-sm text-white/60">
            Approve specialist applications, assign cohorts, revoke access.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 group-hover:gap-2 transition-all">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </div>
  );
}
