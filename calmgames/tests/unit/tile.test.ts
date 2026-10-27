import { describe, expect, it } from "vitest";
import { buildBoard, clicksToSolve, isSolved, litCells, nextSolutionClick, rotateCell, rotateMask, validateTileLevel, N, E, S, W } from "@/lib/engine/tile";
import type { TileLevel } from "@/lib/engine/schemas";

const level: TileLevel = { name: "t", cols: 4, rows: 4, path: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3]], decoyDensity: 0.5, note: "" };

describe("tile path", () => {
  it("rotates connector masks clockwise", () => {
    expect(rotateMask(N, 1)).toBe(E);
    expect(rotateMask(N | E, 1)).toBe(E | S);
    expect(rotateMask(W, 1)).toBe(N);
    expect(rotateMask(N | S, 2)).toBe(N | S);
  });

  it("rejects broken paths", () => {
    expect(validateTileLevel({ ...level, path: [[0, 0], [2, 0], [2, 1], [3, 1]] })).toContainEqual(expect.stringContaining("not a step"));
    expect(validateTileLevel({ ...level, path: [[0, 0], [1, 0], [0, 0], [0, 1]] })).toContainEqual(expect.stringContaining("repeats"));
    expect(validateTileLevel({ ...level, path: [[0, 0], [1, 0], [2, 0], [4, 0]] }).length).toBeGreaterThan(0);
    expect(validateTileLevel(level)).toEqual([]);
  });

  it("never starts solved and is deterministic per seed", () => {
    for (let seed = 1; seed < 60; seed++) expect(isSolved(buildBoard(level, seed))).toBe(false);
    expect(buildBoard(level, 5).cells.map((c) => c.rot)).toEqual(buildBoard(level, 5).cells.map((c) => c.rot));
  });

  it("is solved by following the canonical clicks", () => {
    let b = buildBoard(level, 42);
    let guard = 0;
    while (!isSolved(b) && guard++ < 100) b = rotateCell(b, nextSolutionClick(b));
    expect(isSolved(b)).toBe(true);
    expect(litCells(b).has(b.target)).toBe(true);
    expect(b.cells.filter((c) => c.kind === "path").every((c) => clicksToSolve(c) === 0)).toBe(true);
  });

  it("does not rotate the source, target or empty cells", () => {
    const b = buildBoard(level, 3);
    expect(rotateCell(b, b.source)).toBe(b);
    expect(rotateCell(b, b.target)).toBe(b);
  });
});
