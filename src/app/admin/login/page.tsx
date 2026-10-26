import { redirect } from "next/navigation";
import { getAdminGate } from "@/server/admin/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const gate = await getAdminGate();
  if (gate.kind === "authed" || gate.kind === "open-dev") redirect("/admin");
  const { next } = await searchParams;
  if (gate.kind === "disabled") {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">Admin is disabled</h1>
        <p className="mt-2 text-ink-soft">
          Set <code className="rounded bg-surface-2 px-1">ADMIN_PASSWORD</code> in the server environment to enable the admin area.
        </p>
      </div>
    );
  }
  return <AdminLoginForm next={next ?? "/admin"} />;
}
