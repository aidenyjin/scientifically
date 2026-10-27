import { json, parseInput, readJsonBody, withAgent } from "@/server/agent/http";
import { validateInput } from "@/server/agent/operations";
import { validatePack } from "@/server/agent/service";

/** Check a pack without saving it. */
export async function POST(request: Request) {
  return withAgent(request, async () => {
    const { pack } = parseInput(validateInput, await readJsonBody(request));
    return json(validatePack(pack));
  });
}
