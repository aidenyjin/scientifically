import { notFound } from "next/navigation";
import { JobLive } from "@/components/admin/JobLive";
import { requireAdmin } from "@/server/admin/auth";
import { getJobAction } from "../../actions";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/jobs/${id}`);
  const job = await getJobAction(id);
  if (!job) notFound();
  return <JobLive initial={job} />;
}
