import type { Query, PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { rmSync, existsSync } from "node:fs";

// Active SDK queries keyed by conversationId
const activeQueries = new Map<string, Query>();

// Pending permission requests awaiting user approval
const pendingPermissions = new Map<
  string,
  {
    resolve: (result: PermissionResult) => void;
    conversationId: string;
    input: Record<string, unknown>;
  }
>();

// Pending user input requests (AskUserQuestion)
const pendingUserInputs = new Map<
  string,
  {
    resolve: (answers: Record<string, string>) => void;
    conversationId: string;
  }
>();

// --- Query tracking ---

export function setActiveQuery(conversationId: string, q: Query): void {
  activeQueries.set(conversationId, q);
}

export function removeActiveQuery(conversationId: string): void {
  activeQueries.delete(conversationId);
}

export function getActiveQuery(conversationId: string): Query | undefined {
  return activeQueries.get(conversationId);
}

export function isQueryActive(conversationId: string): boolean {
  return activeQueries.has(conversationId);
}

export function getActiveQueryIds(): string[] {
  return [...activeQueries.keys()];
}

export function interruptQuery(conversationId: string): boolean {
  const q = activeQueries.get(conversationId);
  if (!q) return false;
  q.interrupt();
  return true;
}

// --- Permission handling ---

export function addPendingPermission(
  permissionId: string,
  conversationId: string,
  input: Record<string, unknown>,
  resolver: (result: PermissionResult) => void
): void {
  pendingPermissions.set(permissionId, {
    resolve: resolver,
    conversationId,
    input,
  });
}

export function resolvePermission(
  permissionId: string,
  approved: boolean
): boolean {
  const entry = pendingPermissions.get(permissionId);
  if (!entry) return false;
  pendingPermissions.delete(permissionId);
  if (approved) {
    entry.resolve({ behavior: "allow", updatedInput: entry.input });
  } else {
    entry.resolve({ behavior: "deny", message: "User denied permission" });
  }
  return true;
}

// --- User input handling ---

export function addPendingUserInput(
  requestId: string,
  conversationId: string,
  resolver: (answers: Record<string, string>) => void
): void {
  pendingUserInputs.set(requestId, { resolve: resolver, conversationId });
}

export function resolveUserInput(
  requestId: string,
  answers: Record<string, string>
): boolean {
  const entry = pendingUserInputs.get(requestId);
  if (!entry) return false;
  pendingUserInputs.delete(requestId);
  entry.resolve(answers);
  return true;
}

// --- Message Queue ---

const MAX_QUEUE_SIZE = 20;

interface QueuedMessage {
  id: string;
  message: string;
  queuedAt: string;
}

const messageQueues = new Map<string, QueuedMessage[]>();

export function enqueueMessage(conversationId: string, message: string): QueuedMessage | null {
  let queue = messageQueues.get(conversationId);
  if (!queue) {
    queue = [];
    messageQueues.set(conversationId, queue);
  }
  if (queue.length >= MAX_QUEUE_SIZE) return null;
  const item: QueuedMessage = {
    id: crypto.randomUUID(),
    message,
    queuedAt: new Date().toISOString(),
  };
  queue.push(item);
  return item;
}

export function dequeueMessage(conversationId: string): QueuedMessage | undefined {
  const queue = messageQueues.get(conversationId);
  if (!queue || queue.length === 0) return undefined;
  return queue.shift();
}

export function getQueuedMessages(conversationId: string): QueuedMessage[] {
  return messageQueues.get(conversationId) || [];
}

export function removeQueuedMessage(conversationId: string, messageId: string): boolean {
  const queue = messageQueues.get(conversationId);
  if (!queue) return false;
  const idx = queue.findIndex((m) => m.id === messageId);
  if (idx === -1) return false;
  queue.splice(idx, 1);
  return true;
}

export function clearQueue(conversationId: string): void {
  messageQueues.delete(conversationId);
}

// --- Cleanup ---

export function cleanupPendingForConversation(conversationId: string): void {
  for (const [id, entry] of pendingPermissions) {
    if (entry.conversationId === conversationId) {
      entry.resolve({ behavior: "deny", message: "Query ended" });
      pendingPermissions.delete(id);
    }
  }
  for (const [id, entry] of pendingUserInputs) {
    if (entry.conversationId === conversationId) {
      entry.resolve({});
      pendingUserInputs.delete(id);
    }
  }
}

export function cleanupSession(
  sessionId: string | null,
  cwd: string
): void {
  if (!sessionId) return;

  const projectHash = "-" + cwd.slice(1).replace(/\//g, "-");
  const projectDir = join(homedir(), ".claude", "projects", projectHash);
  const jsonlPath = join(projectDir, `${sessionId}.jsonl`);
  const dirPath = join(projectDir, sessionId);

  try {
    if (existsSync(jsonlPath)) {
      rmSync(jsonlPath);
      console.log(`[Cleanup] Removed session file: ${jsonlPath}`);
    }
    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true });
      console.log(`[Cleanup] Removed session dir: ${dirPath}`);
    }
  } catch (err: any) {
    console.error(
      `[Cleanup] Failed to clean session ${sessionId}: ${err.message}`
    );
  }
}
