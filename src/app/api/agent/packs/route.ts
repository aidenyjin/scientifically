import {
  json,
  parseInput,
  readJsonBody,
  revalidateAfterWrite,
  withAgent,
} from "@/server/agent/http";
import { createInput } from "@/server/agent/operations";
import { createPack, listPacks } from "@/server/agent/service";

export async function GET(request: Request) {
  return withAgent(request, async (caller) => json({ packs: await listPacks(caller) }));
}

/** Create a pack. Accepts {"pack": {...}, "status"?} or a bare pack. */
export async function POST(request: Request) {
  return withAgent(request, async (caller, origin) => {
    const body = await readJsonBody(request);
    const bare = typeof body === "object" && body !== null && "schemaVersion" in body;
    const input = parseInput(createInput, bare ? { pack: body } : body);
    const result = await createPack(caller, input, origin);
    revalidateAfterWrite();
    return json(result, 201);
  });
}
