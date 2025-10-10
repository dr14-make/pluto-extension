import { parse, serialize } from "@plutojl/rainbow";

describe("Pluto Notebook Parser", () => {
  describe("parse()", () => {
    it("should parse a minimal Pluto notebook", async () => {
      const minimalNotebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

using Markdown
using InteractiveUtils

# ╔═╡ a1b2c3d4-1234-5678-9abc-def012345678
x = 1

# ╔═╡ Cell order:
# ╠═a1b2c3d4-1234-5678-9abc-def012345678
`;

      const result = parse(minimalNotebook);

      expect(result).toBeDefined();
      expect(result.cell_order).toBeDefined();
      expect(result.cell_inputs).toBeDefined();
      expect(result.cell_order.length).toBeGreaterThan(0);
    });

    it("should parse cells with proper UUIDs", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ aaa11111-2222-3333-4444-555566667777
x = 5

# ╔═╡ bbb22222-3333-4444-5555-666677778888
y = x^2

# ╔═╡ Cell order:
# ╠═aaa11111-2222-3333-4444-555566667777
# ╠═bbb22222-3333-4444-5555-666677778888
`;

      const result = parse(notebook);

      expect(result.cell_order).toContain(
        "aaa11111-2222-3333-4444-555566667777"
      );
      expect(result.cell_order).toContain(
        "bbb22222-3333-4444-5555-666677778888"
      );
      expect(
        result.cell_inputs["aaa11111-2222-3333-4444-555566667777"]
      ).toBeDefined();
      expect(
        result.cell_inputs["bbb22222-3333-4444-5555-666677778888"]
      ).toBeDefined();
    });

    it("should parse markdown cells", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ md111111-2222-3333-4444-555566667777
md"""
# Hello World
This is markdown
"""

# ╔═╡ Cell order:
# ╟─md111111-2222-3333-4444-555566667777
`;

      const result = parse(notebook);

      expect(result.cell_order).toContain(
        "md111111-2222-3333-4444-555566667777"
      );
      const cell = result.cell_inputs["md111111-2222-3333-4444-555566667777"];
      expect(cell).toBeDefined();
      expect(cell.code).toContain('md"""');
    });

    it("should parse multiple cells in correct order", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ aaa11111-1111-1111-1111-111111111111
x = 1

# ╔═╡ bbb22222-2222-2222-2222-222222222222
y = 2

# ╔═╡ ccc33333-3333-3333-3333-333333333333
z = 3

# ╔═╡ Cell order:
# ╠═aaa11111-1111-1111-1111-111111111111
# ╠═bbb22222-2222-2222-2222-222222222222
# ╠═ccc33333-3333-3333-3333-333333333333
`;

      const result = parse(notebook);

      expect(result.cell_order).toEqual([
        "aaa11111-1111-1111-1111-111111111111",
        "bbb22222-2222-2222-2222-222222222222",
        "ccc33333-3333-3333-3333-333333333333",
      ]);
    });

    it("should handle cells with begin-end blocks", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ ddd44444-4444-4444-4444-444444444444
begin
    import Pkg
    Pkg.add("Plots")
end

# ╔═╡ Cell order:
# ╠═ddd44444-4444-4444-4444-444444444444
`;

      const result = parse(notebook);

      expect(
        result.cell_inputs["ddd44444-4444-4444-4444-444444444444"]
      ).toBeDefined();
      expect(
        result.cell_inputs["ddd44444-4444-4444-4444-444444444444"].code
      ).toContain("begin");
      expect(
        result.cell_inputs["ddd44444-4444-4444-4444-444444444444"].code
      ).toContain("end");
    });

    it("should parse notebooks with package dependencies", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ abc12345-1234-5678-9abc-def012345678
using Plots

# ╔═╡ def67890-5678-9abc-def0-123456789abc
plot(1:10, 1:10)

# ╔═╡ 00000000-0000-0000-0000-000000000001
PLUTO_PROJECT_TOML_CONTENTS = """
[deps]
Plots = "91a5bcdd-55d7-5caf-9e0b-520d859cae80"
"""

# ╔═╡ Cell order:
# ╠═abc12345-1234-5678-9abc-def012345678
# ╠═def67890-5678-9abc-def0-123456789abc
# ╟─00000000-0000-0000-0000-000000000001
`;

      const result = parse(notebook);

      // Regular cells should be parsed
      expect(
        result.cell_inputs["abc12345-1234-5678-9abc-def012345678"]
      ).toBeDefined();
      expect(
        result.cell_inputs["def67890-5678-9abc-def0-123456789abc"]
      ).toBeDefined();

      // Parser should handle the notebook without errors
      expect(result).toBeDefined();
      expect(result.cell_order.length).toBeGreaterThan(0);
    });

    it("should handle empty cells gracefully", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ eee55555-5555-5555-5555-555555555555


# ╔═╡ Cell order:
# ╠═eee55555-5555-5555-5555-555555555555
`;

      const result = parse(notebook);

      expect(result.cell_order).toContain(
        "eee55555-5555-5555-5555-555555555555"
      );
    });
  });

  describe("serialize()", () => {
    it("should serialize a simple notebook", async () => {
      const notebookData: any = {
        notebook_id: "test-notebook-id",
        pluto_version: "v0.19.40",
        path: "",
        shortpath: "",
        in_temp_dir: false,
        process_status: "ready",
        last_save_time: Date.now() / 1000,
        last_hot_reload_time: 0,
        cell_inputs: {
          "cell-1": {
            cell_id: "cell-1",
            code: "x = 1",
            metadata: {},
          },
        },
        cell_results: {},
        cell_dependencies: {},
        cell_order: ["cell-1"],
        cell_execution_order: [],
        published_objects: {},
        bonds: {},
        nbpkg: null,
        metadata: {},
        status_tree: null,
      };

      const result = serialize(notebookData);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toContain("### A Pluto.jl notebook ###");
      expect(result).toContain("╔═╡");
      expect(result).toContain("Cell order:");
    });

    it("should preserve cell content during serialization", async () => {
      const cellCode = "y = x^2 + 2x - 1";
      const notebookData: any = {
        notebook_id: "test-notebook",
        pluto_version: "v0.19.40",
        path: "",
        shortpath: "",
        in_temp_dir: false,
        process_status: "ready",
        last_save_time: Date.now() / 1000,
        last_hot_reload_time: 0,
        cell_inputs: {
          "cell-id": {
            cell_id: "cell-id",
            code: cellCode,
            metadata: {},
          },
        },
        cell_results: {},
        cell_dependencies: {},
        cell_order: ["cell-id"],
        cell_execution_order: [],
        published_objects: {},
        bonds: {},
        nbpkg: null,
        metadata: {},
        status_tree: null,
      };

      const result = serialize(notebookData);

      expect(result).toContain(cellCode);
    });
  });

  describe("Round-trip serialization", () => {
    it("should parse and serialize without data loss", async () => {
      const originalNotebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ fff66666-6666-6666-6666-666666666666
x = 42

# ╔═╡ ggg77777-7777-7777-7777-777777777777
y = x * 2

# ╔═╡ Cell order:
# ╠═fff66666-6666-6666-6666-666666666666
# ╠═ggg77777-7777-7777-7777-777777777777
`;

      // Parse
      const parsed = parse(originalNotebook);

      expect(parsed.cell_order).toHaveLength(2);
      expect(
        parsed.cell_inputs["fff66666-6666-6666-6666-666666666666"]
      ).toBeDefined();
      expect(
        parsed.cell_inputs["ggg77777-7777-7777-7777-777777777777"]
      ).toBeDefined();

      // Serialize
      const serialized = serialize(parsed);

      expect(serialized).toContain("x = 42");
      expect(serialized).toContain("y = x * 2");

      // Parse again
      const reParsed = parse(serialized);

      expect(reParsed.cell_order).toEqual(parsed.cell_order);
      expect(Object.keys(reParsed.cell_inputs)).toEqual(
        Object.keys(parsed.cell_inputs)
      );
    });

    it("should preserve cell order during round-trip", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ ccc88888-8888-8888-8888-888888888888
z = 3

# ╔═╡ aaa99999-9999-9999-9999-999999999999
x = 1

# ╔═╡ bbbaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
y = 2

# ╔═╡ Cell order:
# ╠═ccc88888-8888-8888-8888-888888888888
# ╠═aaa99999-9999-9999-9999-999999999999
# ╠═bbbaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
`;

      const parsed = parse(notebook);
      expect(parsed.cell_order).toEqual([
        "ccc88888-8888-8888-8888-888888888888",
        "aaa99999-9999-9999-9999-999999999999",
        "bbbaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      ]);

      const serialized = serialize(parsed);
      const reParsed = parse(serialized);

      expect(reParsed.cell_order).toEqual([
        "ccc88888-8888-8888-8888-888888888888",
        "aaa99999-9999-9999-9999-999999999999",
        "bbbaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      ]);
    });
  });

  describe("Error handling", () => {
    it("should handle invalid notebook gracefully", async () => {
      const invalidNotebook = "This is not a valid Pluto notebook";

      expect(() => {
        parse(invalidNotebook);
      }).toThrow();
    });

    it("should handle notebook without cell order section", async () => {
      const notebook = `### A Pluto.jl notebook ###
# v0.19.40

using Markdown
using InteractiveUtils

# ╔═╡ hhhbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
x = 1
`;

      const result = parse(notebook);

      expect(result).toBeDefined();
      expect(result.cell_inputs).toBeDefined();
    });
  });
});
