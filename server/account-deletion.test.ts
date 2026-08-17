// Account deletion — App Store Guideline 5.1.1(v).
//
// "If your app supports account creation, you must also offer account deletion
// within the app." Sunder creates an account on OAuth sign-in, so shipping
// without this is a rejection, and shipping a version that MISSES data is
// worse than a rejection: the app tells the player their data is gone while
// some of it quietly is not.
//
// The interesting test here is not "does the delete statement run" — it needs
// a live MySQL to answer and would tell us little. It is "does deletion still
// cover the whole schema", because the way this breaks in practice is a table
// added months from now with a userId on it that nobody wires up. That check
// runs against the real schema and needs no database.
import { describe, it, expect } from "vitest";
import * as schema from "../drizzle/schema";
import { deleteAccount, USER_LINKED_COLUMNS, DELETED_USER_ID, DELETED_USER_NAME } from "./db";
import { getTableConfig } from "drizzle-orm/mysql-core";

/** Every column in the schema whose name looks like a pointer at a user. */
function userLinkedColumns(): string[] {
  const found: string[] = [];
  for (const value of Object.values(schema)) {
    // exported types and helpers sit alongside the tables; only tables have config
    let cfg: ReturnType<typeof getTableConfig>;
    try { cfg = getTableConfig(value as Parameters<typeof getTableConfig>[0]); } catch { continue; }
    for (const col of cfg.columns) {
      const isUserRef = /userId$/i.test(col.name) || (cfg.name === "users" && col.name === "id");
      if (isUserRef) found.push(`${cfg.name}.${col.name}`);
    }
  }
  return found.sort();
}

describe("account deletion covers the schema", () => {
  it("finds the user-linked columns it is supposed to be checking", () => {
    // guards the guard: a broken reflection helper would make the next test
    // pass vacuously
    const cols = userLinkedColumns();
    expect(cols.length).toBeGreaterThanOrEqual(10);
    expect(cols).toContain("users.id");
    expect(cols).toContain("matches.hostUserId");
  });

  it("has a recorded decision for every column that points at a user", () => {
    const missing = userLinkedColumns().filter((c) => !(c in USER_LINKED_COLUMNS));
    // If this fails you have added a table (or a column) carrying a user id.
    // Decide what deletion does with it — delete the row, or anonymise it
    // because a second player shares it — then wire it into deleteAccount()
    // and record it in USER_LINKED_COLUMNS.
    expect(missing).toEqual([]);
  });

  it("does not claim to handle columns that no longer exist", () => {
    const live = new Set(userLinkedColumns());
    const stale = Object.keys(USER_LINKED_COLUMNS).filter((c) => !live.has(c));
    expect(stale).toEqual([]);
  });

  it("anonymises shared rows rather than deleting them", () => {
    // A match has two players. Deleting the leaver's row would destroy a
    // stranger's game, so every match column is anonymise, never delete.
    for (const [col, action] of Object.entries(USER_LINKED_COLUMNS)) {
      if (col.startsWith("matches.") || col.startsWith("match_turns.")) {
        expect(action, `${col} shares rows with another player`).toBe("anonymise");
      }
    }
    // ...and the things only one person owns really are deleted
    for (const col of ["profiles.userId", "entitlements.userId", "purchases.userId", "leaderboard_entries.userId"]) {
      expect(USER_LINKED_COLUMNS[col], col).toBe("delete");
    }
  });
});

describe("the tombstone user", () => {
  it("cannot itself be deleted", async () => {
    // Anonymised match rows all point at DELETED_USER_ID. If that id were ever
    // deletable it would cascade through every abandoned match on the board.
    await expect(deleteAccount(DELETED_USER_ID)).rejects.toThrow(/tombstone/i);
    await expect(deleteAccount(0)).rejects.toThrow(/tombstone/i);
  });

  it("cannot collide with a real account", () => {
    // ids autoincrement from 1, so 0 is unreachable by a real signup
    expect(DELETED_USER_ID).toBe(0);
    expect(DELETED_USER_NAME).toBeTruthy();
  });

  it("rejects a missing id before it reaches the database", async () => {
    // validation must not depend on whether a connection happens to exist
    await expect(deleteAccount(undefined as unknown as number)).rejects.toThrow(/tombstone/i);
  });
});
