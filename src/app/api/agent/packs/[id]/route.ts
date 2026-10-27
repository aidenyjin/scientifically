import {
  json,
  parseInput,
  readJsonBody,
  revalidateAfterWrite,
  withAgent,
} from "@/server/agent/http";
import { updateInput } from "@/server/agent/operations";
import { getPack, updatePack } from "@/server/agent/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  return withAgent(request, async (caller) => json(await getPack(caller, id)));
}

/** Replace the pack and/or change its status. */
export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  return withAgent(request, async (caller, origin) => {
    const body = await readJsonBody(request);
    const input = parseInput(updateInput, {
      ...(typeof body === "object" && body !== null ? body : {}),
      id,
    });
    const result = await updatePack(caller, input, origin);
    revalidateAfterWrite();
    return json(result);
  });
}
