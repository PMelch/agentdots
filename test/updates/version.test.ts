import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareVersions, isNewer } from "../../src/updates/version.js";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    assert.equal(compareVersions("1.2.3", "1.2.3"), 0);
  });

  it("returns positive when a is greater than b", () => {
    assert.ok(compareVersions("1.2.4", "1.2.3") > 0);
    assert.ok(compareVersions("2.0.0", "1.9.9") > 0);
    assert.ok(compareVersions("1.10.0", "1.9.0") > 0);
  });

  it("returns negative when a is less than b", () => {
    assert.ok(compareVersions("1.2.3", "1.2.4") < 0);
    assert.ok(compareVersions("1.9.9", "2.0.0") < 0);
  });

  it("handles 2-part versions", () => {
    assert.equal(compareVersions("1.2", "1.2"), 0);
    assert.ok(compareVersions("1.3", "1.2") > 0);
  });

  it("handles leading zeros in segments", () => {
    assert.equal(compareVersions("1.02.3", "1.2.3"), 0);
  });
});

describe("isNewer", () => {
  it("returns true when latest is newer than current", () => {
    assert.equal(isNewer("1.2.3", "1.2.4"), true);
    assert.equal(isNewer("1.0.0", "2.0.0"), true);
  });

  it("returns false when latest equals current", () => {
    assert.equal(isNewer("1.2.3", "1.2.3"), false);
  });

  it("returns false when latest is older than current", () => {
    assert.equal(isNewer("1.2.4", "1.2.3"), false);
  });

  it("returns false when current is undefined", () => {
    assert.equal(isNewer(undefined, "1.2.3"), false);
  });

  it("returns false when latest is undefined", () => {
    assert.equal(isNewer("1.2.3", undefined), false);
  });
});
