"use client";

import PageHeader from "@/components/PageHeader";
import UserTable from "@/components/UserTable";
import { initialUsers } from "@/lib/admin-data";

export default function AdminInstructorsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="User Management"
        title={<>Manage <span className="gold-text">Instructors</span></>}
        description="Approve specialists, assign specialties, revoke access."
      />
      <UserTable title="Instructors" role="instructor" initial={initialUsers} />
    </div>
  );
}
