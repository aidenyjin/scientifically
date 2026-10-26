import { isAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";

/** Download a pack as pretty-printed JSON. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const row = await db.contentPack.findUnique({ where: { id } });
  if (!row) return new Response("Not found", { status: 404 });
  const body = JSON.stringify(JSON.parse(row.json), null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${id}.json"`,
    },
  });
}
