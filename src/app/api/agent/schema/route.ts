import { contentPackSchema } from "@/content/schema/course";
import { json, withAgent } from "@/server/agent/http";
import { jsonSchemaFor } from "@/server/ai/json-schema";

/** JSON Schema of a whole pack (cross-reference rules like unique ids are checked on save). */
export async function GET(request: Request) {
  return withAgent(request, async () => json(jsonSchemaFor(contentPackSchema)));
}
