"use client";

import PageHeader from "@/components/PageHeader";
import UserTable from "@/components/UserTable";
import { initialUsers } from "@/lib/admin-data";

export default function AllUsersPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="User Management"
        title={<>All <span className="gold-text">platform users</span></>}
        description="Search, onboard, suspend or offboard any user."
      />
      <UserTable title="Everyone" initial={initialUsers} />
    </div>
  );
}
