// Shape a `users` row the way the frontend's lib/auth.tsx User type expects,
// and strip anything sensitive (password_hash) or backend-only (status).

const { fileUrl } = require("./files");

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    phone: row.phone ?? undefined,
    gender: row.gender ?? undefined,
    targetMonth: row.target_month ?? undefined,
    targetYear: row.target_year ?? undefined,
    targetScore: row.target_score != null ? Number(row.target_score) : undefined,
    targetCountry: row.target_country ?? undefined,
    onboarded: !!row.onboarded,
    avatar: row.avatar_file_id ? fileUrl(row.avatar_file_id) : undefined,
  };
}

module.exports = { toPublicUser };
