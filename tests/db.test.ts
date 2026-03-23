import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";

// Use an in-memory DB for tests — don't touch the real data
let db: Database;

beforeAll(() => {
  db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  // Create tables (mirroring connection.ts)
  db.exec(`
    CREATE TABLE conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New conversation',
      session_id TEXT,
      cwd TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      summary TEXT,
      tags TEXT,
      permission_mode TEXT NOT NULL DEFAULT 'acceptEdits',
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      content_blocks TEXT,
      cost_usd REAL,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE memory (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
      kind TEXT NOT NULL CHECK(kind IN ('summary', 'fact', 'decision', 'todo')),
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
});

describe("conversations", () => {
  test("insert and retrieve", () => {
    db.prepare("INSERT INTO conversations (id, title, cwd) VALUES (?, ?, ?)").run(
      "conv-1",
      "Test conversation",
      "/home/test"
    );
    const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get("conv-1") as any;
    expect(row.id).toBe("conv-1");
    expect(row.title).toBe("Test conversation");
    expect(row.cwd).toBe("/home/test");
    expect(row.status).toBe("active");
    expect(row.permission_mode).toBe("acceptEdits");
  });

  test("status check constraint rejects invalid values", () => {
    expect(() =>
      db.prepare("INSERT INTO conversations (id, title, cwd, status) VALUES (?, ?, ?, ?)").run(
        "conv-bad",
        "Bad",
        "/tmp",
        "invalid"
      )
    ).toThrow();
  });

  test("update title", () => {
    db.prepare("UPDATE conversations SET title = ? WHERE id = ?").run("Renamed", "conv-1");
    const row = db.prepare("SELECT title FROM conversations WHERE id = ?").get("conv-1") as any;
    expect(row.title).toBe("Renamed");
  });

  test("archive sets status and archived_at", () => {
    db.prepare(
      "UPDATE conversations SET status = 'archived', archived_at = datetime('now') WHERE id = ?"
    ).run("conv-1");
    const row = db.prepare("SELECT status, archived_at FROM conversations WHERE id = ?").get("conv-1") as any;
    expect(row.status).toBe("archived");
    expect(row.archived_at).not.toBeNull();
  });

  test("update permission_mode", () => {
    db.prepare("UPDATE conversations SET permission_mode = ? WHERE id = ?").run(
      "bypassPermissions",
      "conv-1"
    );
    const row = db.prepare("SELECT permission_mode FROM conversations WHERE id = ?").get("conv-1") as any;
    expect(row.permission_mode).toBe("bypassPermissions");
  });
});

describe("messages", () => {
  test("insert and list in order", () => {
    db.prepare("INSERT INTO conversations (id, title, cwd) VALUES (?, ?, ?)").run(
      "conv-msg",
      "Messages test",
      "/tmp"
    );
    db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
    ).run("msg-1", "conv-msg", "user", "Hello");
    db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
    ).run("msg-2", "conv-msg", "assistant", "Hi there");
    db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
    ).run("msg-3", "conv-msg", "user", "How are you?");

    const msgs = db
      .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
      .all("conv-msg") as any[];
    expect(msgs.length).toBe(3);
    expect(msgs[0].role).toBe("user");
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[2].content).toBe("How are you?");
  });

  test("role check constraint rejects invalid values", () => {
    expect(() =>
      db.prepare(
        "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
      ).run("msg-bad", "conv-msg", "system", "invalid role")
    ).toThrow();
  });

  test("cascade delete removes messages", () => {
    db.prepare("DELETE FROM conversations WHERE id = ?").run("conv-msg");
    const msgs = db
      .prepare("SELECT * FROM messages WHERE conversation_id = ?")
      .all("conv-msg") as any[];
    expect(msgs.length).toBe(0);
  });
});

describe("memory", () => {
  test("insert and search by content", () => {
    db.prepare("INSERT INTO conversations (id, title, cwd) VALUES (?, ?, ?)").run(
      "conv-mem",
      "Memory test",
      "/tmp"
    );
    db.prepare(
      "INSERT INTO memory (id, conversation_id, kind, content, tags) VALUES (?, ?, ?, ?, ?)"
    ).run("mem-1", "conv-mem", "fact", "Bun uses SQLite natively", "bun,sqlite");
    db.prepare(
      "INSERT INTO memory (id, conversation_id, kind, content, tags) VALUES (?, ?, ?, ?, ?)"
    ).run("mem-2", "conv-mem", "decision", "Use acceptEdits permission mode", "permissions");
    db.prepare(
      "INSERT INTO memory (id, conversation_id, kind, content, tags) VALUES (?, ?, ?, ?, ?)"
    ).run("mem-3", null, "todo", "Add tests for API endpoints", null);

    // Search by content keyword
    const results = db
      .prepare(
        "SELECT * FROM memory WHERE content LIKE '%' || ? || '%' OR tags LIKE '%' || ? || '%'"
      )
      .all("sqlite", "sqlite") as any[];
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("mem-1");
  });

  test("kind check constraint rejects invalid values", () => {
    expect(() =>
      db.prepare(
        "INSERT INTO memory (id, kind, content) VALUES (?, ?, ?)"
      ).run("mem-bad", "invalid", "bad kind")
    ).toThrow();
  });

  test("filter by kind", () => {
    const facts = db
      .prepare("SELECT * FROM memory WHERE kind = ?")
      .all("fact") as any[];
    expect(facts.length).toBe(1);

    const todos = db
      .prepare("SELECT * FROM memory WHERE kind = ?")
      .all("todo") as any[];
    expect(todos.length).toBe(1);
    expect(todos[0].conversation_id).toBeNull();
  });

  test("conversation SET NULL on delete", () => {
    db.prepare("DELETE FROM conversations WHERE id = ?").run("conv-mem");
    const mem = db.prepare("SELECT conversation_id FROM memory WHERE id = ?").get("mem-1") as any;
    expect(mem.conversation_id).toBeNull();
  });

  test("delete individual memory", () => {
    db.prepare("DELETE FROM memory WHERE id = ?").run("mem-1");
    const row = db.prepare("SELECT * FROM memory WHERE id = ?").get("mem-1");
    expect(row).toBeNull();
  });
});

describe("turn-based pagination", () => {
  test("groups messages into turns correctly", () => {
    db.prepare("INSERT INTO conversations (id, title, cwd) VALUES (?, ?, ?)").run(
      "conv-turns",
      "Turns test",
      "/tmp"
    );
    // 3 turns: user+assistant, user+assistant+assistant, user+assistant
    const msgs = [
      ["t1", "user", "First question"],
      ["t2", "assistant", "First answer"],
      ["t3", "user", "Second question"],
      ["t4", "assistant", "Second answer part 1"],
      ["t5", "assistant", "Second answer part 2"],
      ["t6", "user", "Third question"],
      ["t7", "assistant", "Third answer"],
    ];
    for (const [id, role, content] of msgs) {
      db.prepare(
        "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)"
      ).run(id, "conv-turns", role, content);
    }

    const all = db
      .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
      .all("conv-turns") as any[];

    // Group into turns
    const turns: any[][] = [];
    let current: any[] = [];
    for (const msg of all) {
      if (msg.role === "user" && current.length > 0) {
        turns.push(current);
        current = [];
      }
      current.push(msg);
    }
    if (current.length > 0) turns.push(current);

    expect(turns.length).toBe(3);
    expect(turns[0].length).toBe(2); // user + assistant
    expect(turns[1].length).toBe(3); // user + assistant + assistant
    expect(turns[2].length).toBe(2); // user + assistant

    // Last 2 turns
    const last2 = turns.slice(-2).flat();
    expect(last2.length).toBe(5);
    expect(last2[0].content).toBe("Second question");
  });
});
