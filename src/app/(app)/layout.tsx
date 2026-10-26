import { ClientSettings } from "@/components/shell/ClientSettings";
import { RightRail } from "@/components/shell/RightRail";
import { Sidebar } from "@/components/shell/Sidebar";
import { StatBar } from "@/components/shell/StatBar";
import { parseSettings } from "@/server/repo/users";
import { getShellData } from "@/server/services/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getShellData();
  const settings = parseSettings(data.user.settings);
  return (
    <div className="flex min-h-dvh">
      <ClientSettings sound={settings.sound} reduceMotion={settings.reduceMotion} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 justify-center gap-10 px-8">
        <main className="w-full max-w-[640px] min-w-0 py-6">
          {/* Below 1200px the right rail hides; keep the stats visible. */}
          <div className="mb-6 min-[1200px]:hidden">
            <StatBar data={data} />
          </div>
          {children}
        </main>
        <RightRail data={data} />
      </div>
    </div>
  );
}
