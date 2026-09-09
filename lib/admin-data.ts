export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor";
  status: "active" | "pending" | "suspended";
  joined: string;
  cohort?: string;
  specialty?: string;
};

export const initialUsers: ManagedUser[] = [
  { id: "m-1", name: "Aisha Rahman", email: "aisha@example.com", role: "student", status: "active", joined: "2026-03-10", cohort: "Evening Batch B" },
  { id: "m-2", name: "Rohan Kapoor", email: "rohan@example.com", role: "student", status: "active", joined: "2026-03-14", cohort: "Weekend Batch A" },
  { id: "m-3", name: "Mei Lin", email: "mei@example.com", role: "student", status: "pending", joined: "2026-05-20", cohort: "—" },
  { id: "m-4", name: "Jorge Alvarez", email: "jorge@example.com", role: "student", status: "active", joined: "2026-02-01", cohort: "Evening Batch B" },
  { id: "m-5", name: "Mr. Daniel Cole", email: "daniel@example.com", role: "instructor", status: "active", joined: "2025-08-12", specialty: "Writing & Reading" },
  { id: "m-6", name: "Ms. Lina Park", email: "lina@example.com", role: "instructor", status: "active", joined: "2025-09-01", specialty: "Speaking" },
  { id: "m-7", name: "Dr. Hassan Iqbal", email: "hassan@example.com", role: "instructor", status: "suspended", joined: "2024-11-22", specialty: "Diagnostic" },
];
