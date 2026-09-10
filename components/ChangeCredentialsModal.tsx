"use client";

import { useEffect, useState } from "react";
import { ApiError, useAuth } from "@/lib/auth";
import Modal from "./Modal";

export default function ChangeCredentialsModal({
  open,
  onClose,
  currentEmail,
  allowEmail = false,
}: {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
  /** Show the "new email" field too — used only on the admin Settings page. */
  allowEmail?: boolean;
}) {
  const { changeCredentials } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword("");
      setNewEmail(currentEmail);
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(false);
    }
  }, [open, currentEmail]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword) {
      setError("Enter your current password to confirm this change.");
      return;
    }
    const emailChanged = allowEmail && newEmail.trim().toLowerCase() !== currentEmail.toLowerCase();
    const passwordChanged = newPassword.length > 0;
    if (!emailChanged && !passwordChanged) {
      setError(allowEmail ? "Change the email and/or set a new password." : "Enter a new password.");
      return;
    }
    if (passwordChanged) {
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords don't match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await changeCredentials({
        currentPassword,
        ...(emailChanged ? { newEmail: newEmail.trim() } : {}),
        ...(passwordChanged ? { newPassword } : {}),
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={allowEmail ? "Account credentials" : "Change password"}
      subtitle={
        allowEmail
          ? "Update the email and password used to sign in as admin."
          : "Update the password used to sign in."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {allowEmail && (
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Email</label>
            <input
              type="email"
              className="input-field"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">New password</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep your current password"
            autoComplete="new-password"
          />
        </div>

        {newPassword && (
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Confirm new password</label>
            <input
              type="password"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-white/50">Current password</label>
          <input
            type="password"
            className="input-field"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Required to confirm this change"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            ✓ Credentials updated.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Close
          </button>
          <button type="submit" className="btn-gold" disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
