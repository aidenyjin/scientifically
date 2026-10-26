import { redirect } from "next/navigation";
import { listPacks } from "@/server/repo/packs";
import { getCurrentUser } from "@/server/repo/users";
import { Onboarding } from "./Onboarding";

export default async function OnboardingPage() {
  if (await getCurrentUser()) redirect("/learn");
  const packs = await listPacks("published");
  return <Onboarding packs={packs.map((p) => ({ id: p.id, title: p.title, subject: p.subject, level: p.level }))} />;
}
