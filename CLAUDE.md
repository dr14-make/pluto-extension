# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VSCode extension for Julia Pluto notebooks. Integrates with `@plutojl/rainbow` package for Pluto backend communication. Extension activates on `.jl` files and provides notebook interface for Pluto notebooks.

## Development Commands

### Build and Watch

```bash
npm run compile          # Type check, lint, and build once
npm run watch            # Watch mode (runs esbuild + tsc in parallel)
npm run package          # Production build (minified, no sourcemaps)
```

### Type Checking and Linting

```bash
npm run check-types      # TypeScript type checking only
npm run lint             # ESLint
```

### Testing

```bash
npm run test             # Run all tests
npm run compile-tests    # Compile tests to out/ directory
npm run watch-tests      # Watch mode for tests
```

### Debug

Press `F5` in VSCode to launch Extension Development Host window for testing.

## Architecture

### Core Components

**Extension Entry Point** (`src/extension.ts`)

- Activates on `onNotebook:pluto-notebook` event
- Registers `PlutoNotebookSerializer` for `.jl` file handling
- Registers `PlutoNotebookController` for cell execution
- All components added to context subscriptions for proper disposal

**Notebook Serializer** (`src/serializer.ts`)

- Implements `vscode.NotebookSerializer` interface
- Currently uses simple JSON format (placeholder)
- TODO: Parse actual Pluto .jl format with cell markers (`# ╔═╡`), metadata, and reactive dependencies
- Converts between Pluto format and VSCode `NotebookData`/`NotebookCellData`

**Notebook Controller** (`src/controller.ts`)

- Implements notebook controller for cell execution
- Controller ID: `pluto-notebook-controller`
- Notebook type: `pluto-notebook`
- Supported language: `julia`
- Currently placeholder execution (1 second delay)
- TODO: Integrate `@plutojl/rainbow` for real Pluto backend execution
- TODO: Handle reactive cell updates and dependencies

### Build System

Uses esbuild (`esbuild.js`) for bundling:

- Entry point: `src/extension.ts`
- Output: `dist/extension.js` (CommonJS format)
- External: `vscode` module (provided by VSCode runtime)
- Production: minified with no sourcemaps
- Development: sourcemaps enabled, watch mode available

TypeScript compilation targets Node16 module system and ES2022 with strict mode enabled.

## Key Implementation Notes

- **Pluto File Format**: Pluto notebooks are Julia files with special cell markers and metadata, not simple JSON
- **Reactive Evaluation**: Pluto uses reactive cell execution model - cells re-run when dependencies change
- **@plutojl/rainbow**: Package for communicating with Pluto server; needs integration in controller
- **Notebook Type**: Registered as `pluto-notebook` with `.jl` file pattern selector

## Current Status

Basic extension structure is complete:

- Serializer and controller are registered and functional
- Extension can be debugged with F5
- Build system works correctly

Placeholder implementation:

- Serializer uses JSON format instead of Pluto .jl format
- Controller simulates execution without connecting to Pluto backend

## Next Implementation Priorities

1. Parse actual Pluto .jl file format in serializer
2. Create Pluto connection manager using @plutojl/rainbow
3. Implement real cell execution in controller
4. Handle rich outputs (HTML, plots, images)
5. Support Pluto's reactive evaluation model
