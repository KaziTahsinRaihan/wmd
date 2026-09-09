import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { MongoSyncProvider } from "@/lib/mongo-sync";

export const metadata: Metadata = {
  title: "Wise Man's Doctrine — Prepare. Practice. Achieve.",
  description:
    "Role-based IELTS preparation platform with practice tests, mock exams, AI tutoring and live instructor classes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-ink-950 text-white antialiased">
        <MongoSyncProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </MongoSyncProvider>
      </body>
    </html>
  );
}
