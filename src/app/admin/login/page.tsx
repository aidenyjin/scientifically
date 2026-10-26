import { redirect } from "next/navigation";
import { getAdminGate } from "@/server/admin/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const gate = await getAdminGate();
  if (gate.kind === "authed" || gate.kind === "open-dev") redirect("/admin");
  const { next } = await searchParams;
  if (gate.kind === "disabled") {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">Admin is disabled</h1>
        <p className="text-ink-soft mt-2">
          Set <code className="bg-surface-2 rounded px-1">ADMIN_PASSWORD</code> in the server
          environment to enable the admin area.
        </p>
      </div>
    );
  }
  return <AdminLoginForm next={next ?? "/admin"} />;
}
