import { describe, expect, it } from "vitest";
import { formatCadBBoxForPrompt } from "../src/input-dossier";

describe("model input dossier CAD dimensions", () => {
  it("withholds raw coordinates unless the source unit is confirmed", () => {
    const rawBbox = [52.9, 15, 51.4];
    expect(formatCadBBoxForPrompt(rawBbox, "UNCONFIRMED")).toBe("[omitted: source units unconfirmed]");
    expect(formatCadBBoxForPrompt(rawBbox, "MISSING")).toBe("[omitted: source units unconfirmed]");
    expect(formatCadBBoxForPrompt(rawBbox, "CONFIRMED")).toBe("[52.9,15,51.4]");
  });
});
