import {
  json,
  parseInput,
  readJsonBody,
  revalidateAfterWrite,
  withAgent,
} from "@/server/agent/http";
import { putUnitInput } from "@/server/agent/operations";
import { AgentApiError, putUnit } from "@/server/agent/service";

type Context = { params: Promise<{ id: string; unitId: string }> };

/** Add a unit, or replace the unit with this id. The body's unit.id may be left out. */
export async function PUT(request: Request, { params }: Context) {
  const { id, unitId } = await params;
  return withAgent(request, async (caller, origin) => {
    const body = await readJsonBody(request);
    const input = parseInput(putUnitInput, {
      ...(typeof body === "object" && body !== null ? body : {}),
      packId: id,
    });
    const bodyId = input.unit.id;
    if (bodyId !== undefined && bodyId !== unitId) {
      throw new AgentApiError(
        400,
        `unit.id ("${String(bodyId)}") doesn't match the URL ("${unitId}").`,
      );
    }
    const result = await putUnit(caller, { ...input, unit: { ...input.unit, id: unitId } }, origin);
    revalidateAfterWrite();
    return json(result);
  });
}
