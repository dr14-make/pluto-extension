# Pluto Notebook VSCode Extension - Action Plan

## Project Overview

This VSCode extension provides notebook support for Julia Pluto notebooks, integrating with the `@plutojl/rainbow` package for communication with Pluto backend.

## Project Structure

```
pluto-notebook/
├── src/
│   ├── extension.ts       # Extension entry point
│   ├── serializer.ts      # Notebook serializer (converts .jl files to/from notebook format)
│   ├── controller.ts      # Notebook controller (handles cell execution)
│   └── test/              # Test files
├── dist/                  # Compiled output
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
└── esbuild.js            # Build configuration
```

## Current Status ✅

### Completed

1. ✅ Project initialized using Yeoman generator (`yo code`)
2. ✅ Dependencies installed:
   - `@plutojl/rainbow` - Pluto backend integration
   - `@types/vscode` - VSCode API types
   - `typescript`, `esbuild` - Build tools
3. ✅ Extension configured in `package.json`:
   - Notebook type: `pluto-notebook`
   - File pattern: `*.jl`
   - Category: Notebooks
4. ✅ Core components implemented:
   - `PlutoNotebookSerializer` - Parses and serializes actual Pluto .jl files using @plutojl/rainbow
   - `PlutoNotebookController` - Handles cell execution with @plutojl/rainbow integration
   - `PlutoManager` - Manages Pluto server connections and notebook workers
   - Extension activation with proper registration
5. ✅ Build and debug configuration verified
   - Build compiles successfully
   - Launch configuration available in `.vscode/launch.json`
6. ✅ Phase 1 Complete: Pluto File Format Integration
   - Serializer uses @plutojl/rainbow's parse() function to parse Pluto .jl files
   - Serializer uses @plutojl/rainbow's serialize() function to generate Pluto .jl files
   - Cell metadata preserved for round-trip serialization
   - Markdown cell detection (md"..." pattern)
7. ✅ Phase 2 Complete: Pluto Backend Integration
   - PlutoManager class created for connection management
   - Host and Worker API from @plutojl/rainbow integrated
   - Cell execution through Pluto backend
   - Real-time update subscription support

## Next Steps 🚀

### ~~Phase 1: Pluto File Format Integration~~ ✅ COMPLETED

### ~~Phase 2: Pluto Backend Integration~~ ✅ COMPLETED

### Phase 3: Rich Output Support

**Priority: MEDIUM**

1. **Implement Output Renderers**
   - Text output
   - HTML output (plots, tables)
   - Images
   - Interactive widgets
   - Error formatting

2. **Cell State Management**
   - Running/idle indicators
   - Execution order display
   - Cell dependencies visualization (optional)

### Phase 4: Enhanced Features

**Priority: MEDIUM**

1. **Commands and UI**
   - Start/Stop Pluto server
   - Open notebook in browser
   - Export to HTML
   - Cell operations (run, clear, etc.)

2. **Settings and Configuration**
   - Pluto server URL
   - Julia executable path
   - Auto-start server option
   - Port configuration

3. **Status Bar Integration**
   - Show connection status
   - Display Julia/Pluto version
   - Quick actions

### Phase 5: Testing and Polish

**Priority: LOW**

1. **Testing**
   - Unit tests for serializer
   - Integration tests for execution
   - End-to-end tests

2. **Documentation**
   - Update README.md
   - Add usage examples
   - Document configuration options
   - Create troubleshooting guide

3. **Performance**
   - Optimize large notebook handling
   - Cache management
   - Memory optimization

## How to Build and Debug

### Build

```bash
npm run compile        # One-time build
npm run watch         # Watch mode for development
```

### Debug

1. Open project in VSCode
2. Press `F5` or go to Run → Start Debugging
3. A new "Extension Development Host" window will open
4. Open or create a `.jl` file
5. Test notebook functionality

### Test

```bash
npm run test          # Run tests
```

## Key Files to Work On Next

1. **`src/serializer.ts`** - Parse actual Pluto .jl format
2. **`src/plutoManager.ts`** - New file for Pluto connection management
3. **`src/controller.ts`** - Integrate @plutojl/rainbow for execution
4. **`package.json`** - Add commands and configuration options

## Resources

- [VSCode Notebook API Docs](https://code.visualstudio.com/api/extension-guides/notebook)
- [@plutojl/rainbow Package](https://www.npmjs.com/package/@plutojl/rainbow)
- [Pluto.jl GitHub](https://github.com/fonsp/Pluto.jl)
- [VSCode Extension Samples](https://github.com/microsoft/vscode-extension-samples)

## Notes

- The current serializer uses a simple JSON format for testing
- Cell execution is a placeholder that needs @plutojl/rainbow integration
- Debug by pressing F5 - works out of the box with current setup
- Extension activates when opening `.jl` files
