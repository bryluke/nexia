import { authenticateRequest } from "./auth.ts";
import {
  listRecentMemory,
  listMemoryByKind,
  searchMemory,
  deleteMemory,
} from "../db/queries/memory.ts";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function handleListMemory(req: Request): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const q = url.searchParams.get("q");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  if (q) {
    return json(searchMemory.all(q, q));
  }
  if (kind) {
    return json(listMemoryByKind.all(kind));
  }
  return json(listRecentMemory.all(limit));
}

export async function handleDeleteMemory(
  req: Request,
  id: string
): Promise<Response> {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  deleteMemory.run(id);
  return json({ ok: true });
}
