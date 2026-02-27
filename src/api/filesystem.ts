import { homedir } from "node:os";
import { resolve, dirname } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { authenticateRequest } from "./auth.ts";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function handleFilesystemList(req: Request): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const home = homedir();
  const requestedPath = url.searchParams.get("path") || home;
  const resolvedPath = resolve(requestedPath);

  // Restrict to home directory tree
  if (!resolvedPath.startsWith(home)) {
    return json({ error: "Access denied: path must be within home directory" }, 403);
  }

  try {
    const stat = statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return json({ error: "Not a directory" }, 400);
    }
  } catch {
    return json({ error: "Path not found" }, 404);
  }

  const entries: { name: string; path: string }[] = [];
  try {
    const items = readdirSync(resolvedPath, { withFileTypes: true });
    for (const item of items) {
      // Skip dotfiles
      if (item.name.startsWith(".")) continue;
      if (item.isDirectory()) {
        entries.push({
          name: item.name,
          path: resolve(resolvedPath, item.name),
        });
      }
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return json({ error: "Cannot read directory" }, 500);
  }

  const parent = resolvedPath === home ? null : dirname(resolvedPath);

  return json({
    path: resolvedPath,
    parent,
    entries,
  });
}
