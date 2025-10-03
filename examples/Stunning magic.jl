### A Pluto.jl notebook ###
# v0.20.19

using Markdown
using InteractiveUtils

# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).
macro bind(def, element)
    #! format: off
    return quote
        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end
        local el = $(esc(element))
        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)
        el
    end
    #! format: on
end

# ╔═╡ b8c9d0e1-9e3a-11ee-8901-0fb8c1c8e8e8
begin
	import Pkg
	Pkg.add("PlutoUI")
end

# ╔═╡ f8a9b0c1-9e3a-11ee-8901-0fb8c1c8e8e8
begin
	Pkg.add("Plots")
end

# ╔═╡ c9d0e1f2-9e3a-11ee-9012-0fb8c1c8e8e8
using PlutoUI

# ╔═╡ a9b0c1d2-9e3a-11ee-9012-0fb8c1c8e8e8
using Plots

# ╔═╡ 8e6f3a40-9e3a-11ee-3f5e-0fb8c1c8e8e8
md"""
# Pluto Notebook Demo
This is an example Pluto notebook demonstrating various features.
"""

# ╔═╡ a1b2c3d4-9e3a-11ee-1234-0fb8c1c8e8e8
# Basic Julia computation
x = 5

# ╔═╡ b2c3d4e5-9e3a-11ee-2345-0fb8c1c8e8e8
y = x^2 + 2x - 1

# ╔═╡ c3d4e5f6-9e3a-11ee-3456-0fb8c1c8e8e8
md"""
The value of y is **$(y)**
"""

# ╔═╡ d4e5f6a7-9e3a-11ee-4567-0fb8c1c8e8e8
# Array operations
data = [1, 2, 3, 4, 5]

# ╔═╡ e5f6a7b8-9e3a-11ee-5678-0fb8c1c8e8e8
squared_data = data .^ 2

# ╔═╡ f6a7b8c9-9e3a-11ee-6789-0fb8c1c8e8e8
sum_squared = sum(squared_data)

# ╔═╡ a7b8c9d0-9e3a-11ee-7890-0fb8c1c8e8e8
md"""
## Interactive Widgets
Pluto supports interactive widgets using `@bind`
"""

# ╔═╡ d0e1f2a3-9e3a-11ee-0123-0fb8c1c8e8e8
@bind n Slider(1:100, default=10, show_value=true)

# ╔═╡ e1f2a3b4-9e3a-11ee-1234-0fb8c1c8e8e8
md"""
You selected: **$(n)**
"""

# ╔═╡ f2a3b4c5-9e3a-11ee-2345-0fb8c1c8e8e8
# Reactive computation based on slider
fibonacci_n = let
	a, b = 0, 1
	for i in 1:n
		a, b = b, a + b
	end
	a
end

# ╔═╡ a3b4c5d6-9e3a-11ee-3456-0fb8c1c8e8e8
md"""
The $(n)th Fibonacci number is: **$(fibonacci_n)**
"""

# ╔═╡ b4c5d6e7-9e3a-11ee-4567-0fb8c1c8e8e8
md"""
## Text Input Widget
"""

# ╔═╡ c5d6e7f8-9e3a-11ee-5678-0fb8c1c8e8e8
@bind name TextField(default="World")

# ╔═╡ d6e7f8a9-9e3a-11ee-6789-0fb8c1c8e8e8
md"""
Hello, **$(name)**! 👋
"""

# ╔═╡ e7f8a9b0-9e3a-11ee-7890-0fb8c1c8e8e8
md"""
## Plotting
Let's create some visualizations using Plots.jl
"""

# ╔═╡ b0c1d2e3-9e3a-11ee-0123-0fb8c1c8e8e8
# Simple line plot
plot(1:10, (1:10).^2,
	label="y = x²",
	xlabel="x",
	ylabel="y",
	title="Quadratic Function",
	linewidth=2,
	color=:blue,
	legend=:topleft)

# ╔═╡ c1d2e3f4-9e3a-11ee-1234-0fb8c1c8e8e8
# Multiple functions on same plot
let
	x_range = -2π:0.1:2π
	plot(x_range, sin.(x_range), label="sin(x)", linewidth=2)
	plot!(x_range, cos.(x_range), label="cos(x)", linewidth=2)
	plot!(x_range, sin.(x_range) .* cos.(x_range), label="sin(x)·cos(x)", linewidth=2)
	xlabel!("x")
	ylabel!("y")
	title!("Trigonometric Functions")
end

# ╔═╡ d2e3f4a5-9e3a-11ee-2345-0fb8c1c8e8e8
# Scatter plot
scatter(randn(100), randn(100),
	alpha=0.5,
	markersize=8,
	color=:purple,
	xlabel="X",
	ylabel="Y",
	title="Random Scatter Plot",
	legend=false)

# ╔═╡ e3f4a5b6-9e3a-11ee-3456-0fb8c1c8e8e8
md"""
## Interactive Plot
Control the plot parameters with widgets!
"""

# ╔═╡ f4a5b6c7-9e3a-11ee-4567-0fb8c1c8e8e8
@bind amplitude Slider(0.5:0.1:3.0, default=1.0, show_value=true)

# ╔═╡ a5b6c7d8-9e3a-11ee-5678-0fb8c1c8e8e8
@bind frequency Slider(1:10, default=2, show_value=true)

# ╔═╡ b6c7d8e9-9e3a-11ee-6789-0fb8c1c8e8e8
md"""
- Amplitude: $(amplitude)
- Frequency: $(frequency)
"""

# ╔═╡ c7d8e9f0-9e3a-11ee-7890-0fb8c1c8e8e8
# Interactive sine wave
let
	x = 0:0.01:4π
	y = amplitude .* sin.(frequency .* x)
	plot(x, y,
		linewidth=3,
		color=:red,
		xlabel="x",
		ylabel="y",
		title="Interactive Sine Wave: y = $(amplitude) · sin($(frequency)x)",
		legend=false,
		ylim=(-3.5, 3.5))
end

# ╔═╡ d8e9f0a1-9e3a-11ee-8901-0fb8c1c8e8e8
md"""
## Heatmap Example
"""

# ╔═╡ e9f0a1b2-9e3a-11ee-9012-0fb8c1c8e8e8
# Generate data for heatmap
heatmap_data = [sin(x) * cos(y) for x in range(0, 2π, length=50), y in range(0, 2π, length=50)]

# ╔═╡ f0a1b2c3-9e3a-11ee-0123-0fb8c1c8e8e8
heatmap(heatmap_data,
	color=:viridis,
	xlabel="X",
	ylabel="Y",
	title="sin(x) · cos(y) Heatmap",
	aspect_ratio=:equal)

# ╔═╡ a1b2c3d4-9e3a-11ee-1234-0fb8c1c8e8e9
md"""
## Mathematical Expressions
Pluto supports LaTeX math rendering:

$e^{i\pi} + 1 = 0$

The quadratic formula:
$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
"""

# ╔═╡ b2c3d4e5-9e3a-11ee-2345-0fb8c1c8e8e9
md"""
## Data Structures
"""

# ╔═╡ c3d4e5f6-9e3a-11ee-3456-0fb8c1c8e8e9
# Dictionary
person = Dict(
	"name" => "Alice",
	"age" => 30,
	"city" => "New York"
)

# ╔═╡ d4e5f6a7-9e3a-11ee-4567-0fb8c1c8e8e9
# Named tuple
point = (x=10, y=20, z=30)

# ╔═╡ e5f6a7b8-9e3a-11ee-5678-0fb8c1c8e8e9
md"""
Person: $(person["name"]), Age: $(person["age"])

Point coordinates: ($(point.x), $(point.y), $(point.z))
"""

# ╔═╡ f6a7b8c9-9e3a-11ee-6789-0fb8c1c8e8e9
md"""
## Functions
"""

# ╔═╡ a7b8c9d0-9e3a-11ee-7890-0fb8c1c8e8e9
function greet(name, greeting="Hello")
	return "$greeting, $name!"
end

# ╔═╡ b8c9d0e1-9e3a-11ee-8901-0fb8c1c8e8e9
greet("Julia")

# ╔═╡ c9d0e1f2-9e3a-11ee-9012-0fb8c1c8e8e9
greet("Pluto", "Welcome")

# ╔═╡ Cell order:
# ╠═8e6f3a40-9e3a-11ee-3f5e-0fb8c1c8e8e8
# ╠═a1b2c3d4-9e3a-11ee-1234-0fb8c1c8e8e8
# ╠═b2c3d4e5-9e3a-11ee-2345-0fb8c1c8e8e8
# ╠═c3d4e5f6-9e3a-11ee-3456-0fb8c1c8e8e8
# ╠═d4e5f6a7-9e3a-11ee-4567-0fb8c1c8e8e8
# ╠═e5f6a7b8-9e3a-11ee-5678-0fb8c1c8e8e8
# ╠═f6a7b8c9-9e3a-11ee-6789-0fb8c1c8e8e8
# ╠═a7b8c9d0-9e3a-11ee-7890-0fb8c1c8e8e8
# ╠═b8c9d0e1-9e3a-11ee-8901-0fb8c1c8e8e8
# ╠═c9d0e1f2-9e3a-11ee-9012-0fb8c1c8e8e8
# ╠═d0e1f2a3-9e3a-11ee-0123-0fb8c1c8e8e8
# ╠═e1f2a3b4-9e3a-11ee-1234-0fb8c1c8e8e8
# ╠═f2a3b4c5-9e3a-11ee-2345-0fb8c1c8e8e8
# ╠═a3b4c5d6-9e3a-11ee-3456-0fb8c1c8e8e8
# ╠═b4c5d6e7-9e3a-11ee-4567-0fb8c1c8e8e8
# ╠═c5d6e7f8-9e3a-11ee-5678-0fb8c1c8e8e8
# ╠═d6e7f8a9-9e3a-11ee-6789-0fb8c1c8e8e8
# ╠═e7f8a9b0-9e3a-11ee-7890-0fb8c1c8e8e8
# ╠═f8a9b0c1-9e3a-11ee-8901-0fb8c1c8e8e8
# ╠═a9b0c1d2-9e3a-11ee-9012-0fb8c1c8e8e8
# ╠═b0c1d2e3-9e3a-11ee-0123-0fb8c1c8e8e8
# ╠═c1d2e3f4-9e3a-11ee-1234-0fb8c1c8e8e8
# ╠═d2e3f4a5-9e3a-11ee-2345-0fb8c1c8e8e8
# ╠═e3f4a5b6-9e3a-11ee-3456-0fb8c1c8e8e8
# ╠═f4a5b6c7-9e3a-11ee-4567-0fb8c1c8e8e8
# ╠═a5b6c7d8-9e3a-11ee-5678-0fb8c1c8e8e8
# ╠═b6c7d8e9-9e3a-11ee-6789-0fb8c1c8e8e8
# ╠═c7d8e9f0-9e3a-11ee-7890-0fb8c1c8e8e8
# ╠═d8e9f0a1-9e3a-11ee-8901-0fb8c1c8e8e8
# ╠═e9f0a1b2-9e3a-11ee-9012-0fb8c1c8e8e8
# ╠═f0a1b2c3-9e3a-11ee-0123-0fb8c1c8e8e8
# ╠═a1b2c3d4-9e3a-11ee-1234-0fb8c1c8e8e9
# ╠═b2c3d4e5-9e3a-11ee-2345-0fb8c1c8e8e9
# ╠═c3d4e5f6-9e3a-11ee-3456-0fb8c1c8e8e9
# ╠═d4e5f6a7-9e3a-11ee-4567-0fb8c1c8e8e9
# ╠═e5f6a7b8-9e3a-11ee-5678-0fb8c1c8e8e9
# ╠═f6a7b8c9-9e3a-11ee-6789-0fb8c1c8e8e9
# ╠═a7b8c9d0-9e3a-11ee-7890-0fb8c1c8e8e9
# ╠═b8c9d0e1-9e3a-11ee-8901-0fb8c1c8e8e9
# ╠═c9d0e1f2-9e3a-11ee-9012-0fb8c1c8e8e9
