import { homedir } from "node:os";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { authenticateRequest } from "./auth.ts";

/**
 * List directories under ~/projects/ for the directory picker.
 *
 * Future improvements:
 * - Accept a `path` query param to browse arbitrary directories
 * - Return git info (branch, dirty status) per directory
 * - Support bookmarked/pinned directories from user config
 * - Cache results with short TTL to avoid repeated fs reads
 */
export function handleListDirectories(req: Request): Response {
  if (!authenticateRequest(req))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const projectsDir = join(homedir(), "projects");
  const directories: Array<{ name: string; path: string }> = [];

  try {
    const entries = readdirSync(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        directories.push({
          name: entry.name,
          path: join(projectsDir, entry.name),
        });
      }
    }
  } catch {
    // ~/projects/ doesn't exist — return empty
  }

  // Sort alphabetically
  directories.sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({
    home: homedir(),
    directories,
  });
}
