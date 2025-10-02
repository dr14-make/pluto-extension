import {
  parsePlutoNotebook,
  serializePlutoNotebook,
  isMarkdownCell,
  generateCellId,
  isValidPlutoNotebook,
  getCellCount,
  type ParsedCell,
} from "../plutoSerializer.ts";
import { readFileSync } from "fs";
import { join } from "path";

describe("Pluto Serializer Functions", () => {
  let demoNotebookContent: string;

  beforeAll(() => {
    // Load the demo.jl file
    const demoPath = join(__dirname, "../../examples/demo.jl");
    demoNotebookContent = readFileSync(demoPath, "utf8");
  });

  describe("isValidPlutoNotebook", () => {
    it("should validate a proper Pluto notebook", () => {
      expect(isValidPlutoNotebook(demoNotebookContent)).toBe(true);
    });

    it("should reject invalid notebooks", () => {
      expect(isValidPlutoNotebook("just some julia code")).toBe(false);
      expect(isValidPlutoNotebook("")).toBe(false);
    });

    it("should validate minimal notebook structure", () => {
      const minimal = `### A Pluto.jl notebook ###
# ╔═╡ cell-id
x = 1`;
      expect(isValidPlutoNotebook(minimal)).toBe(true);
    });
  });

  describe("getCellCount", () => {
    it("should count cells in demo notebook", () => {
      const count = getCellCount(demoNotebookContent);
      expect(count).toBeGreaterThan(0);
      console.log(`Demo notebook has ${count} cells`);
    });

    it("should return 0 for empty notebook", () => {
      expect(getCellCount("")).toBe(0);
      expect(getCellCount("### A Pluto.jl notebook ###")).toBe(0);
    });

    it("should count multiple cells correctly", () => {
      const notebook = `### A Pluto.jl notebook ###
# ╔═╡ aaa11111-1111-1111-1111-111111111111
x = 1

# ╔═╡ bbb22222-2222-2222-2222-222222222222
y = 2

# ╔═╡ ccc33333-3333-3333-3333-333333333333
z = 3`;
      expect(getCellCount(notebook)).toBe(3);
    });
  });

  describe("isMarkdownCell", () => {
    it("should detect markdown cells", () => {
      expect(isMarkdownCell('md"""# Hello"""')).toBe(true);
      expect(isMarkdownCell('  md"""content"""')).toBe(true);
      expect(isMarkdownCell('\tmd"""content"""')).toBe(true);
    });

    it("should not detect code cells as markdown", () => {
      expect(isMarkdownCell("x = 1")).toBe(false);
      expect(isMarkdownCell('println("hello")')).toBe(false);
      expect(isMarkdownCell("using Plots")).toBe(false);
    });
  });

  describe("generateCellId", () => {
    it("should generate valid UUID format", () => {
      const id = generateCellId();
      const uuidRegex =
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}$/;
      expect(id).toMatch(uuidRegex);
    });

    it("should generate unique IDs", () => {
      const id1 = generateCellId();
      const id2 = generateCellId();
      expect(id1).not.toBe(id2);
    });

    it("should generate 100 unique IDs", () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCellId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("parsePlutoNotebook with demo.jl", () => {
    let parsed: Awaited<ReturnType<typeof parsePlutoNotebook>>;

    beforeAll(async () => {
      parsed = await parsePlutoNotebook(demoNotebookContent);
    });

    it("should parse demo notebook successfully", () => {
      expect(parsed).toBeDefined();
      expect(parsed.cells).toBeDefined();
      expect(Array.isArray(parsed.cells)).toBe(true);
    });

    it("should have cells", () => {
      expect(parsed.cells.length).toBeGreaterThan(0);
      console.log(`Parsed ${parsed.cells.length} cells from demo.jl`);
    });

    it("should have notebook metadata", () => {
      expect(parsed.notebook_id).toBeDefined();
      expect(typeof parsed.notebook_id).toBe("string");
    });

    it("should detect markdown cells", () => {
      const markdownCells = parsed.cells.filter((c) => c.kind === "markdown");
      expect(markdownCells.length).toBeGreaterThan(0);
      console.log(`Found ${markdownCells.length} markdown cells`);
    });

    it("should detect code cells", () => {
      const codeCells = parsed.cells.filter((c) => c.kind === "code");
      expect(codeCells.length).toBeGreaterThan(0);
      console.log(`Found ${codeCells.length} code cells`);
    });

    it("should preserve cell IDs", () => {
      for (const cell of parsed.cells) {
        expect(cell.id).toBeDefined();
        expect(typeof cell.id).toBe("string");
        expect(cell.id.length).toBeGreaterThan(0);
      }
    });

    it("should preserve cell code", () => {
      for (const cell of parsed.cells) {
        expect(cell.code).toBeDefined();
        expect(typeof cell.code).toBe("string");
      }
    });

    it("should have specific demo cells", () => {
      // Check for title cell
      const titleCell = parsed.cells.find((c) =>
        c.code.includes("Pluto Notebook Demo"),
      );
      expect(titleCell).toBeDefined();
      expect(titleCell?.kind).toBe("markdown");
    });

    it("should have variable declarations", () => {
      const xCell = parsed.cells.find((c) => c.code.trim() === "x = 5");
      expect(xCell).toBeDefined();
      expect(xCell?.kind).toBe("code");
    });

    it("should have PlutoUI widgets", () => {
      const sliderCell = parsed.cells.find(
        (c) => c.code.includes("@bind") && c.code.includes("Slider"),
      );
      expect(sliderCell).toBeDefined();
    });

    it("should have plotting code", () => {
      const plotCells = parsed.cells.filter(
        (c) =>
          c.code.includes("plot(") ||
          c.code.includes("scatter(") ||
          c.code.includes("heatmap("),
      );
      expect(plotCells.length).toBeGreaterThan(0);
      console.log(`Found ${plotCells.length} plotting cells`);
    });
  });

  describe("serializePlutoNotebook", () => {
    it("should serialize simple cells", async () => {
      const cells: ParsedCell[] = [
        {
          id: "aaa11111-1111-1111-1111-111111111111",
          code: "x = 1",
          kind: "code",
          metadata: {},
        },
        {
          id: "bbb22222-2222-2222-2222-222222222222",
          code: "y = x + 1",
          kind: "code",
          metadata: {},
        },
      ];

      const serialized = await serializePlutoNotebook(cells);

      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe("string");
      expect(serialized).toContain("### A Pluto.jl notebook ###");
      expect(serialized).toContain("x = 1");
      expect(serialized).toContain("y = x + 1");
      expect(serialized).toContain("╔═╡");
      expect(serialized).toContain("Cell order:");
    });

    it("should serialize markdown cells", async () => {
      const cells: ParsedCell[] = [
        {
          id: "md111111-1111-1111-1111-111111111111",
          code: 'md"""\n# Title\n"""',
          kind: "markdown",
          metadata: {},
        },
      ];

      const serialized = await serializePlutoNotebook(cells);

      expect(serialized).toContain('md"""');
      expect(serialized).toContain("# Title");
    });

    it("should generate IDs for cells without them", async () => {
      const cells: ParsedCell[] = [
        {
          id: "",
          code: "x = 1",
          kind: "code",
          metadata: {},
        },
      ];

      const serialized = await serializePlutoNotebook(cells);

      expect(serialized).toContain("x = 1");
      // Should have generated a UUID
      const uuidRegex =
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
      expect(serialized).toMatch(uuidRegex);
    });
  });

  describe("Round-trip with demo.jl", () => {
    it("should parse and serialize demo notebook without data loss", async () => {
      // Parse
      const parsed = await parsePlutoNotebook(demoNotebookContent);

      expect(parsed.cells.length).toBeGreaterThan(0);
      const originalCellCount = parsed.cells.length;
      const originalFirstCell = parsed.cells[0].code;
      const originalLastCell = parsed.cells[parsed.cells.length - 1].code;

      // Serialize
      const serialized = await serializePlutoNotebook(
        parsed.cells,
        parsed.notebook_id,
        parsed.pluto_version,
      );

      expect(serialized).toBeDefined();
      expect(serialized.length).toBeGreaterThan(0);

      // Parse again
      const reParsed = await parsePlutoNotebook(serialized);

      expect(reParsed.cells.length).toBe(originalCellCount);
      expect(reParsed.cells[0].code).toBe(originalFirstCell);
      expect(reParsed.cells[reParsed.cells.length - 1].code).toBe(
        originalLastCell,
      );
    });

    it("should preserve cell order", async () => {
      const parsed = await parsePlutoNotebook(demoNotebookContent);
      const originalOrder = parsed.cells.map((c) => c.id);

      const serialized = await serializePlutoNotebook(
        parsed.cells,
        parsed.notebook_id,
        parsed.pluto_version,
      );

      const reParsed = await parsePlutoNotebook(serialized);
      const newOrder = reParsed.cells.map((c) => c.id);

      expect(newOrder).toEqual(originalOrder);
    });

    it("should preserve markdown and code cell types", async () => {
      const parsed = await parsePlutoNotebook(demoNotebookContent);
      const originalTypes = parsed.cells.map((c) => c.kind);

      const serialized = await serializePlutoNotebook(
        parsed.cells,
        parsed.notebook_id,
        parsed.pluto_version,
      );

      const reParsed = await parsePlutoNotebook(serialized);
      const newTypes = reParsed.cells.map((c) => c.kind);

      expect(newTypes).toEqual(originalTypes);
    });

    it("should preserve specific cell content", async () => {
      const parsed = await parsePlutoNotebook(demoNotebookContent);

      // Find specific cells
      const xCell = parsed.cells.find((c) => c.code.trim() === "x = 5");
      const titleCell = parsed.cells.find((c) =>
        c.code.includes("Pluto Notebook Demo"),
      );

      expect(xCell).toBeDefined();
      expect(titleCell).toBeDefined();

      // Serialize and re-parse
      const serialized = await serializePlutoNotebook(
        parsed.cells,
        parsed.notebook_id,
        parsed.pluto_version,
      );
      const reParsed = await parsePlutoNotebook(serialized);

      // Verify cells still exist
      const xCellAfter = reParsed.cells.find((c) => c.code.trim() === "x = 5");
      const titleCellAfter = reParsed.cells.find((c) =>
        c.code.includes("Pluto Notebook Demo"),
      );

      expect(xCellAfter).toBeDefined();
      expect(titleCellAfter).toBeDefined();
      expect(xCellAfter?.kind).toBe("code");
      expect(titleCellAfter?.kind).toBe("markdown");
    });
  });

  describe("Error handling", () => {
    it("should handle empty content", async () => {
      await expect(parsePlutoNotebook("")).rejects.toThrow();
    });

    it("should handle invalid notebook", async () => {
      await expect(parsePlutoNotebook("invalid content")).rejects.toThrow();
    });

    it("should handle notebook without cell order", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ aaa11111-1111-1111-1111-111111111111
x = 1`;

      const parsed = await parsePlutoNotebook(notebook);
      expect(parsed).toBeDefined();
      // Cell order might be inferred or empty
    });
  });
});
