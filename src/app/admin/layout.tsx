import Link from "next/link";
import { Logo } from "@/components/shell/Logo";
import { getAdminGate } from "@/server/admin/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Scientifically Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const gate = await getAdminGate();
  const allowed = gate.kind === "authed" || gate.kind === "open-dev";
  return (
    <div className="bg-bg min-h-dvh">
      {gate.kind === "open-dev" && (
        <div className="bg-xp/25 text-ink px-6 py-2 text-center text-sm font-bold">
          ADMIN_PASSWORD isn&apos;t set — admin is open because this is development. Set it in .env
          before deploying.
        </div>
      )}
      <header className="border-line bg-surface/90 sticky top-0 z-30 border-b-2 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo full />
            <span className="bg-ink text-surface rounded-lg px-2 py-0.5 text-xs font-bold tracking-wider uppercase">
              Admin
            </span>
          </Link>
          {allowed && <AdminNav />}
          <div className="ml-auto flex items-center gap-4">
            <Link href="/learn" className="text-ink-soft hover:text-ink text-sm font-bold">
              Open app ↗
            </Link>
            {gate.kind === "authed" && (
              <form action={adminLogoutAction}>
                <button type="submit" className="text-ink-soft hover:text-ink text-sm font-bold">
                  Log out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-6 py-8">{children}</main>
    </div>
  );
}
