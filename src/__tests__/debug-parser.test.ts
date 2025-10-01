// Use dynamic import
let parse: any;

describe("Debug Parser Output", () => {
  beforeAll(async () => {
    const rainbow = await import("@plutojl/rainbow");
    parse = rainbow.parse;
  });
  it("should test real format", () => {
    const notebook = `### A Pluto.jl notebook ###
# v0.14.0

using Markdown
using InteractiveUtils

# ╔═╡ b2d786ec-7f73-11ea-1a0c-f38d7b6bbc1e
md"""
# Hello World
"""

# ╔═╡ b2d79330-7f73-11ea-0d1c-a9aad1efaae1
n = 1:100

# ╔═╡ Cell order:
# ╟─b2d786ec-7f73-11ea-1a0c-f38d7b6bbc1e
# ╠═b2d79330-7f73-11ea-0d1c-a9aad1efaae1
`;

    const result = parse(notebook);

    console.log("Cell order:", result.cell_order);
    console.log("Cell inputs keys:", Object.keys(result.cell_inputs));
    expect(result.cell_order.length).toBeGreaterThan(0);
  });
});
