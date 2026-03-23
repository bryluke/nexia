import { db } from "./connection.ts";

interface Migration {
  name: string;
  up: () => void;
}

const migrations: Migration[] = [
  {
    name: "001_add_permission_mode",
    up: () =>
      db.exec(
        "ALTER TABLE conversations ADD COLUMN permission_mode TEXT NOT NULL DEFAULT 'acceptEdits'"
      ),
  },
];

export function runMigrations(): void {
  const applied = new Set(
    db
      .prepare<{ name: string }, []>("SELECT name FROM _migrations")
      .all()
      .map((r) => r.name)
  );

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;
    console.log(`[DB] Running migration: ${migration.name}`);
    db.transaction(() => {
      migration.up();
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(
        migration.name
      );
    })();
  }
}
