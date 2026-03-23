import { homedir } from "node:os";
import { existsSync, statSync } from "node:fs";
import { authenticateRequest } from "./auth.ts";
import {
  listConversations,
  getConversation,
  insertConversation,
  deleteConversation,
  updateConversationTitle,
  updatePermissionMode,
} from "../db/queries/conversations.ts";
import { listMessages, deleteMessages } from "../db/queries/messages.ts";
import { cleanupSession } from "../agent/session-store.ts";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function handleListConversations(req: Request): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  return json(listConversations.all());
}

export async function handleCreateConversation(
  req: Request
): Promise<Response> {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);

  let cwd = homedir();
  try {
    const body = await req.json();
    if (body?.cwd && typeof body.cwd === "string") {
      const requested = body.cwd;
      if (existsSync(requested) && statSync(requested).isDirectory()) {
        cwd = requested;
      }
    }
  } catch {
    // No body or invalid JSON — use default
  }

  const id = crypto.randomUUID();
  insertConversation.run(id, "New conversation", cwd);
  const conversation = getConversation.get(id);
  return json(conversation, 201);
}

const VALID_PERMISSION_MODES = ["default", "acceptEdits", "bypassPermissions"];

export async function handleUpdateConversation(
  req: Request,
  id: string
): Promise<Response> {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  const conversation = getConversation.get(id);
  if (!conversation) return json({ error: "Not found" }, 404);
  try {
    const body = await req.json();
    const updates: Record<string, string> = {};

    if (body?.title && typeof body.title === "string" && body.title.trim()) {
      updateConversationTitle.run(body.title.trim(), id);
      updates.title = body.title.trim();
    }

    if (body?.permission_mode && VALID_PERMISSION_MODES.includes(body.permission_mode)) {
      updatePermissionMode.run(body.permission_mode, id);
      updates.permission_mode = body.permission_mode;
    }

    if (Object.keys(updates).length === 0) {
      return json({ error: "No valid fields to update" }, 400);
    }

    return json({ ...conversation, ...updates });
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
}

export function handleDeleteConversation(
  req: Request,
  id: string
): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  const conversation = getConversation.get(id);
  if (!conversation) return json({ error: "Not found" }, 404);
  cleanupSession(conversation.session_id, conversation.cwd);
  deleteMessages.run(id);
  deleteConversation.run(id);
  return json({ ok: true });
}

export function handleListMessages(
  req: Request,
  conversationId: string
): Response {
  if (!authenticateRequest(req)) return json({ error: "Unauthorized" }, 401);
  const conversation = getConversation.get(conversationId);
  if (!conversation) return json({ error: "Not found" }, 404);
  return json(listMessages.all(conversationId));
}
