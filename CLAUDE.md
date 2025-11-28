# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **security training project** that intentionally demonstrates SQL injection vulnerabilities. The codebase is a TypeScript/Express API with SQLite persistence, built to showcase both vulnerable patterns and secure alternatives for educational purposes.

**CRITICAL**: `insertMessage()` and `findMessageById()` in [src/lib/database.ts](src/lib/database.ts) contain **intentional SQL injection vulnerabilities**. Do not "fix" these functions unless explicitly updating the training materials, as they exist to demonstrate security risks.

## Development Commands

```bash
# Development (hot reload)
npm run dev

# Production start
npm start

# Build TypeScript to dist/
npm run build

# Run tests
npm test

# Lint
npm run lint

# Run tests with in-memory database (isolated)
SQLITE_DB_PATH=':memory:' npm test

# Clean build output
npm run clean
```

## Environment Variables

- `PORT`: HTTP server port (default: 3000)
- `SQLITE_DB_PATH`: Database file path (default: `./data/app.db`, use `:memory:` for ephemeral)

## Architecture

### Core Structure

- **[src/lib/index.ts](src/lib/index.ts)** - HTTP bootstrap: reads `PORT` env, creates server, no business logic
- **[src/lib/app.ts](src/lib/app.ts)** - Express instance, middleware, route handlers (exported for unit tests)
- **[src/lib/database.ts](src/lib/database.ts)** - Better-SQLite3 singleton, migrations, message helpers
- **[src/index.ts](src/index.ts)** - Re-exports lib modules for package root consumers
- **[src/test/](src/test/)** - Test files with `*.test.ts` suffix

### API Routes

| Method | Route | Handler | Purpose |
|--------|-------|---------|---------|
| GET | `/messages` | `listMessagesHandler` | Lists messages (newest first) |
| GET | `/messages/:id` | `getMessageHandler` | Returns message by id (vulnerable to injection) |
| POST | `/messages` | `createMessageHandler` | Creates message (vulnerable to injection) |

### Database Module Design

**Safe function**: `executeParameterizedQuery(sql, params)` - Centralized SQL execution that supports parameterized queries. However, the vulnerable helpers pass concatenated strings through this function, bypassing its safety.

**Vulnerable functions (intentional)**:
- `insertMessage(body)` - Line 127: Uses raw string concatenation `INSERT INTO messages (body) VALUES ('${body}')`
- `findMessageById(id)` - Line 152: Uses raw string concatenation `WHERE id = ${id}`

**Safe functions**:
- `listMessages()` - Uses parameterized queries correctly
- `clearMessages()` - Test helper to reset database state

## Testing Approach

- Uses Node's built-in `node:test` with `assert/strict`
- Tests directly invoke route handlers with mocked Express `Request`/`Response` objects
- Avoids opening HTTP sockets for faster, sandbox-compatible tests
- Set `SQLITE_DB_PATH=':memory:'` for test isolation
- Use `clearMessages()` in test setup (`t.beforeEach`) to ensure clean state

Example test structure from [src/test/app.test.ts](src/test/app.test.ts):
```typescript
test('POST /messages handler', async (t) => {
  t.beforeEach(() => { clearMessages(); });

  await t.test('description', () => {
    // Test implementation
  });
});
```

## Code Style

- Strict TypeScript via [tsconfig.json](tsconfig.json): `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict`, `verbatimModuleSyntax`
- ESM modules with `"type": "module"` in [package.json](package.json)
- Explicit `.js` extensions in import paths (TypeScript resolves at compile time)
- Two-space indentation, single quotes (unless interpolation needed)
- camelCase for handlers (`listMessagesHandler`), PascalCase for classes
- Keep route handlers thin; centralize business logic in `src/lib/` modules
- Repository-style helpers in [database.ts](src/lib/database.ts) for persistence

## Commit Conventions

- Short, imperative subjects (e.g., "Introduce user session routes")
- Rebase/squash noise before submitting PRs
- PRs should describe scope, risks, validation steps, and link tracking issues
- Include CLI output or screenshots for behavior changes
