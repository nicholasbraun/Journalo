import { describe, expect, it } from "vitest";

import { CORE_READY } from "./index.js";

// Trivial smoke test so the suite runs green on an empty core.
describe("@journal/core", () => {
  it("is wired up", () => {
    expect(CORE_READY).toBe(true);
  });
});
