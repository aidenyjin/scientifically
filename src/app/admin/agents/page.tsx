import { headers } from "next/headers";
import Link from "next/link";
import { CreateAgentKey } from "@/components/admin/CreateAgentKey";
import { RevokeAgentKey } from "@/components/admin/RevokeAgentKey";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/server/admin/auth";
import { listApiKeys } from "@/server/agent/api-keys";
import { mcpUrl } from "@/server/agent/guide";
import { OPERATIONS } from "@/server/agent/operations";
import { isLocalHost, publicOrigin } from "@/server/agent/origin";
import { parseAgentProvenance } from "@/server/agent/provenance";
import { db } from "@/server/db";

const when = (d: Date | null) =>
  d ? d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default async function AgentsPage() {
  await requireAdmin("/admin/agents");
  const origin = publicOrigin(await headers());
  const keys = await listApiKeys();
  const packs = await db.contentPack.findMany({ select: { generatedBy: true } });
  const courses = new Map<string, number>();
  for (const p of packs) {
    const keyId = parseAgentProvenance(p.generatedBy)?.keyId;
    if (keyId) courses.set(keyId, (courses.get(keyId) ?? 0) + 1);
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">AI agents</h1>
        <p className="text-ink-soft mt-1">
          Let an AI agent such as Claude, ChatGPT, Cursor or your own script write courses straight
          into Scientifically. Create a key, paste it into the agent and ask for a course.
          Everything it sends is checked like an import: invalid courses are rejected, and nothing
          with problems can be published.
        </p>
      </header>

      {isLocalHost(origin) && (
        <p className="border-xp bg-xp/20 text-ink rounded-2xl border-2 px-4 py-3 text-sm font-semibold">
          This app is running at <code className="font-bold">{origin}</code>, which only agents on
          this computer can reach (e.g. Claude Code or Cursor). For cloud apps like Claude.ai or
          ChatGPT, deploy Scientifically first (see the README) and create the key there.
        </p>
      )}

      <CreateAgentKey />

      <Card className="overflow-hidden p-0">
        {keys.length === 0 ? (
          <p className="text-muted px-5 py-8 text-center font-semibold">No keys yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-line text-muted border-b-2 text-xs font-bold tracking-wider uppercase">
              <tr>
                <th className="px-5 py-3">Key</th>
                <th className="px-5 py-3">Access</th>
                <th className="px-5 py-3">Courses</th>
                <th className="px-5 py-3">Last used</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr
                  key={k.id}
                  className={
                    "border-line border-b-2 last:border-b-0" + (k.revokedAt ? " opacity-55" : "")
                  }
                >
                  <td className="px-5 py-4">
                    <p className="text-ink font-bold">{k.name}</p>
                    <p className="text-muted text-sm font-semibold">
                      <code>{k.prefix}…</code> · created {when(k.createdAt)}
                    </p>
                  </td>
                  <td className="text-ink-soft px-5 py-4 text-sm font-bold">
                    {k.canPublish ? "Can publish" : "Drafts only"}
                  </td>
                  <td className="text-ink-soft px-5 py-4 text-sm font-bold">
                    {courses.get(k.id) ?? 0}
                  </td>
                  <td className="text-muted px-5 py-4 text-sm font-semibold">
                    {when(k.lastUsedAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {k.revokedAt ? (
                      <span className="text-muted text-sm font-bold">
                        Revoked {when(k.revokedAt)}
                      </span>
                    ) : (
                      <RevokeAgentKey id={k.id} name={k.name} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="grid gap-3">
        <h2 className="font-display text-lg font-semibold">How agents use it</h2>
        <p className="text-ink-soft text-sm">
          The agent first reads a guide (<code>GET {origin}/api/agent</code>) that explains the
          course format and every question type, using the same rules the built-in generator
          follows. It then creates the course as a draft, adds one unit at a time, fixes every
          problem the checks report and publishes it. Agent-made courses appear under{" "}
          <Link href="/admin" className="text-brand font-bold">
            Packs
          </Link>
          . Agents can read every course but only change their own.
        </p>
        <ul className="text-ink-soft grid gap-1 font-mono text-xs">
          {OPERATIONS.map((o) => (
            <li key={o.tool}>
              <span className="text-ink font-bold">{o.method}</span> {o.path}{" "}
              <span className="text-muted font-sans font-semibold">— {o.summary}</span>
            </li>
          ))}
          <li>
            <span className="text-ink font-bold">MCP</span> {mcpUrl(origin)}{" "}
            <span className="text-muted font-sans font-semibold">
              — the same operations as connector tools
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
