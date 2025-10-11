/**
 * Example commands for testing Pluto Terminal functionality
 * This file can be removed in production
 */

export interface ExampleCommand {
  name: string;
  description: string;
  code: string;
}

/**
 * Example commands for testing different output types
 */
export const EXAMPLE_COMMANDS: ExampleCommand[] = [
  {
    name: ".example-html",
    description: "Test HTML output rendering",
    code: `HTML("""
<div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white; font-family: Arial, sans-serif;">
  <h2 style="margin: 0 0 10px 0;">🎨 HTML Output Test</h2>
  <p style="margin: 0;">This is a <strong>rich HTML</strong> output rendered in the webview!</p>
  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
    <li>Supports <em>formatting</em></li>
    <li>Supports <code style="background: rgba(255,255,255,0.2); padding: 2px 5px; border-radius: 3px;">code</code></li>
    <li>Supports <span style="color: #ffd700;">colors</span></li>
  </ul>
</div>
""")`,
  },
  {
    name: ".example-image",
    description: "Test SVG image output",
    code: `HTML("""
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="80" fill="url(#grad1)" />
  <text x="100" y="110" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
    SVG Test
  </text>
  <path d="M 50 150 Q 100 120 150 150" stroke="white" stroke-width="3" fill="none" />
</svg>
""")`,
  },
  {
    name: ".example-table",
    description: "Test HTML table output",
    code: `HTML("""
<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
  <thead>
    <tr style="background-color: #4a90e2; color: white;">
      <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Name</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Value</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 12px; border: 1px solid #ddd;">Test 1</td>
      <td style="padding: 12px; border: 1px solid #ddd;">42</td>
      <td style="padding: 12px; border: 1px solid #ddd;">✅ Pass</td>
    </tr>
    <tr style="background-color: #ffffff;">
      <td style="padding: 12px; border: 1px solid #ddd;">Test 2</td>
      <td style="padding: 12px; border: 1px solid #ddd;">3.14</td>
      <td style="padding: 12px; border: 1px solid #ddd;">✅ Pass</td>
    </tr>
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 12px; border: 1px solid #ddd;">Test 3</td>
      <td style="padding: 12px; border: 1px solid #ddd;">NaN</td>
      <td style="padding: 12px; border: 1px solid #ddd;">❌ Fail</td>
    </tr>
  </tbody>
</table>
""")`,
  },
  {
    name: ".example-plot",
    description: "Test simple plot (requires Plots.jl)",
    code: `begin
  using Plots
  x = 0:0.1:2π
  plot(x, [sin.(x) cos.(x)],
       label=["sin(x)" "cos(x)"],
       title="Trigonometric Functions",
       xlabel="x",
       ylabel="y",
       linewidth=2,
       legend=:topright)
end`,
  },
  {
    name: ".example-markdown",
    description: "Test Markdown output",
    code: `md"""
# Markdown Test

This is a **Markdown** output test with various features:

## Code Block
\`\`\`julia
function hello(name)
    println("Hello, $(name)!")
end
\`\`\`

## Math
The quadratic formula is: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

## List
- Item 1
- Item 2
  - Nested item
- Item 3

## Table
| Feature | Status |
|---------|--------|
| HTML    | ✅     |
| Images  | ✅     |
| Plots   | ✅     |
"""`,
  },
  {
    name: ".example-json",
    description: "Test JSON output",
    code: `Dict(
  "name" => "Pluto Terminal",
  "version" => "1.0.0",
  "features" => ["HTML", "Images", "Plots", "Markdown"],
  "nested" => Dict(
    "level" => 2,
    "value" => 42
  ),
  "array" => [1, 2, 3, 4, 5]
)`,
  },
  {
    name: ".example-dataframe",
    description: "Test DataFrame output (requires DataFrames.jl)",
    code: `begin
  using DataFrames
  DataFrame(
    Name = ["Alice", "Bob", "Charlie", "Diana"],
    Age = [25, 30, 35, 28],
    Score = [85.5, 92.0, 78.5, 88.0],
    Pass = [true, true, true, true]
  )
end`,
  },
  {
    name: ".example-interactive",
    description: "Test interactive HTML with buttons",
    code: `HTML("""
<div style="padding: 20px; border: 2px solid #4a90e2; border-radius: 10px; background: #f0f8ff;">
  <h3 style="margin-top: 0; color: #4a90e2;">Interactive HTML Test</h3>
  <p>Click counter: <span id="counter" style="font-weight: bold; color: #e74c3c;">0</span></p>
  <button onclick="document.getElementById('counter').textContent = parseInt(document.getElementById('counter').textContent) + 1"
          style="background: #4a90e2; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">
    Click Me!
  </button>
  <button onclick="document.getElementById('counter').textContent = '0'"
          style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; margin-left: 10px;">
    Reset
  </button>
</div>
""")`,
  },
];

/**
 * Get example command by name
 */
export function getExampleCommand(name: string): ExampleCommand | undefined {
  return EXAMPLE_COMMANDS.find((cmd) => cmd.name === name);
}

/**
 * Check if a command is an example command
 */
export function isExampleCommand(command: string): boolean {
  return EXAMPLE_COMMANDS.some((cmd) => cmd.name === command);
}

/**
 * Get list of all example command names
 */
export function getExampleCommandNames(): string[] {
  return EXAMPLE_COMMANDS.map((cmd) => cmd.name);
}

/**
 * Get help text for example commands
 */
export function getExampleCommandsHelp(): string {
  let help = "\x1b[1;33mExample Commands:\x1b[0m\r\n";
  for (const cmd of EXAMPLE_COMMANDS) {
    help += `  \x1b[36m${cmd.name}\x1b[0m - ${cmd.description}\r\n`;
  }
  return help;
}
