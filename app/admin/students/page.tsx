"use client";

import PageHeader from "@/components/PageHeader";
import UserTable from "@/components/UserTable";
import { initialUsers } from "@/lib/admin-data";

export default function AdminStudentsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="User Management"
        title={<>Manage <span className="gold-text">Students</span></>}
        description="Onboarding, approvals, suspensions and offboarding."
      />
      <UserTable title="Students" role="student" initial={initialUsers} />
    </div>
  );
}
