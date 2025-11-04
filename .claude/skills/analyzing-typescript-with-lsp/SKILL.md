---
name: analyzing-typescript-with-lsp
description: Use when working with TypeScript/JavaScript files and need to check compilation errors, find symbol definitions/references, get type signatures, or understand code structure before refactoring - provides LSP integration for diagnostics, symbol analysis, and impact assessment without running builds
---

# Analyzing TypeScript with LSP

TypeScript language server integration via MCP for checking errors, finding references, and understanding code structure without running builds.

## When to Use

**Use this skill when:**
- About to edit TypeScript/JavaScript files and need to check for existing errors
- Refactoring and need to find all references to a symbol
- Debugging type errors and need detailed type information
- Exploring unfamiliar TypeScript codebase
- Need to verify type signatures without reading entire files

**Don't use when:**
- Working with non-TypeScript files (use regular Read/Grep tools)
- Runtime debugging (use actual debugging tools)
- Simple syntax checks (editor provides these)

## Available Tools

**IMPORTANT: All tools use relative paths from project root (e.g., `src/file.ts`), NOT absolute paths (e.g., `/workspace/src/file.ts`).**

### `mcp__static-analysis__get_compilation_errors`

Get TypeScript compilation errors for files or directories. **Always use before and after editing.**

```javascript
// Single file - use relative path
{ "path": "src/components/Button.tsx" }

// Directory with pattern
{ "path": "src/components", "filePattern": "**/*.tsx", "verbosity": "detailed" }
```

### `mcp__static-analysis__analyze_file`

Get all symbols, imports, and exports from a file. **Best entry point for unfamiliar code.**

```javascript
{ "filePath": "src/api.ts", "analysisType": "all" }
```

### `mcp__lsp__get-symbol-definition`

Get type signature and location. **Lightweight - use for quick lookups.**

```javascript
{ "file": "src/api.ts", "symbol": "formatUser" }
```

### `mcp__static-analysis__analyze_symbol`

Get comprehensive analysis including implementation body. **Use when you need to understand how something works.**

```javascript
{
  "symbolIdentifier": {
    "filePath": "src/api.ts",
    "symbolName": "formatUser",
    "line": 42  // Read file first to find line number
  }
}
```

### `mcp__static-analysis__find_references`

Find all usages across codebase. **Critical before refactoring to assess impact.**

```javascript
{
  "symbolIdentifier": {
    "filePath": "src/types.ts",
    "symbolName": "UserConfig",
    "line": 15
  },
  "maxResults": 100
}
```

## Workflows

### Before Editing TypeScript Files

1. **Check existing issues**: `get_compilation_errors` on target file
2. **Understand structure**: `analyze_file` for symbols/imports/exports
3. **Quick type check**: `get-symbol-definition` for symbols you'll modify

### When Refactoring

1. **Assess impact**: `find_references` (requires symbol line number - read file first)
2. **Deep understanding**: `analyze_symbol` for implementation details
3. **Verify no breaking changes**: `get_compilation_errors` on affected directories

### When Debugging Type Errors

1. **Get precise errors**: `get_compilation_errors` with `verbosity: "detailed"`
2. **Quick signature lookup**: `get-symbol-definition` to verify types
3. **Deep dive**: `analyze_symbol` for problematic types

### Exploring Unfamiliar Codebases

1. **Start with file analysis**: `analyze_file` to see exports
2. **Get signatures**: `get-symbol-definition` for exported functions
3. **Dive deeper**: `analyze_symbol` when you need implementation details

## Tool Selection Guide

| Tool | When to Use |
|------|-------------|
| `get-symbol-definition` (lightweight) | Quick signatures, parameters, return types, finding definitions |
| `analyze_symbol` (comprehensive) | Understanding implementation, debugging logic, seeing function body |
| `analyze_file` | Getting oriented in new file, understanding module exports/imports |
| `find_references` | Before renaming/changing APIs, assessing refactoring impact |
| `get_compilation_errors` | Before/after edits, debugging type errors, directory-wide checks |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting to check errors BEFORE editing | Always run `get_compilation_errors` first to understand baseline |
| Using absolute paths like `/workspace/src/file.ts` | Use relative paths from project root: `src/file.ts` |
| Using `analyze_symbol` when `get-symbol-definition` is enough | Start lightweight, upgrade to comprehensive only when needed |
| Not finding references before refactoring | Use `find_references` to assess impact - prevents breaking changes |
| Guessing symbol line numbers | Read file first to find exact line where symbol is defined |
| Checking single file during directory-wide refactor | Use directory path with file pattern to catch all issues |

## Best Practices

- **Use relative paths** from project root (e.g., `src/file.ts`), never absolute paths
- **Always check compilation errors** before and after editing TypeScript files
- **Find references before** renaming or changing public APIs
- **Start lightweight** with `get-symbol-definition`, upgrade to `analyze_symbol` if needed
- **Use analyze_file** as entry point for unfamiliar code

## Important Notes

### Path Format

**Always use relative paths from project root**, not absolute paths:
- ✅ Correct: `"path": "src/components/Button.tsx"`
- ❌ Wrong: `"path": "/workspace/src/components/Button.tsx"`

### Symbol Identifier Requirements

Most `static-analysis` tools require a `symbolIdentifier` with:
- `filePath`: Path to file (relative to project root)
- `symbolName`: Exact symbol name
- `line`: Line number where symbol is defined

**You must read the file first** to find the line number where a symbol is defined.

### Performance

- First query may initialize language server (100-500ms)
- Subsequent queries are fast (<50ms)
- `get_compilation_errors` on large directories may take 1-2 seconds
