# Repository Guidelines

- `src/lib/index.ts` hosts the HTTP bootstrap: read the `PORT` env, create the server, and keep it free of business logic.
- `src/lib/app.ts` wires the Express instance, shared middleware, and route handlers (export handlers for direct unit tests).
- `src/lib/database.ts` centralises the Better-SQLite3 connection plus migrations and message helpers.
- `src/index.ts` simply re-exports lib modules for consumers that import from the package root.
- Domain logic (e.g., `HelloWorld.ts`) lives under `src/lib/` and should stay framework-agnostic.
- Tests sit in `src/test/` beside the feature they cover with a `*.test.ts` suffix; prefer lightweight handler/unit tests instead of opening sockets.
- TypeScript output goes to `dist/`; generated assets and log files should be ignored via `.gitignore`.

## Build, Test, and Development Commands
- `npm start` → `node --import tsx src/index.ts`, launching the Express server against the current sources.
- `npm run dev` → `tsx watch src/index.ts` for auto-reload during local development.
- `npm run build` → transpiles TypeScript after cleaning `dist/`.
- `npm test` → `node --import tsx --test src/test/app.test.ts`; set `SQLITE_DB_PATH=':memory:'` when you need isolated runs.
- `npm run lint` → ESLint across `.ts` files with the shared TypeScript ruleset.

## Coding Style & Naming Conventions
- Stick with strict TypeScript settings already enforced by `tsconfig.json` and the ESLint preset.
- Two-space indentation, single quotes unless interpolation makes template strings clearer, and explicit `.js` extensions in ESM imports.
- Name route handlers in camelCase (`healthRouteHandler`), classes in PascalCase, and keep filenames descriptive (`userSession.service.ts`).
- Centralize cross-route helpers in `src/lib/`; avoid inline business rules inside Express handlers.
- Prefer repository-style helpers (e.g., `database.ts`) for persistence to keep handlers thin.

## Testing Guidelines
- Use Node's `node:test` with `assert/strict`. Mock the Express `Response` object as done in `src/test/app.test.ts` to keep tests sandbox-compatible.
- Add new suites next to their targets (e.g., `src/lib/user/UserService.ts` → `src/test/user/UserService.test.ts`) and reference them from the `npm test` command when needed.
- Target deterministic behaviour; prefer pure function tests and handler-level assertions over network calls.
- Use the `clearMessages()` helper from `database.ts` when tests need a clean SQLite state, and run lint/tests (`npm run lint && npm test`) before opening a pull request.

## Commit & Pull Request Guidelines
- Favor short, imperative commit subjects (e.g., `Introduce user session routes`) as seen in the log.
- Rebase or squash noise before submitting; each PR should describe scope, risks, validation steps, and link any tracking issues.
- Include CLI output or screenshots when behaviour changes (e.g., new routes or responses).
- Confirm the server starts locally and reference which commands you executed in the PR template or description.
