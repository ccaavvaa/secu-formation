# Repository Guidelines

## Project Structure & Module Organization
- `src/index.ts` is the executable entry point; keep it lean and delegate logic into reusable modules.
- Feature code belongs in `src/lib/`, grouped by domain (`HelloWorld.ts` is the current example). Export named classes or functions.
- Tests live in `src/test/` and should mirror the folder and file name of the code they cover using the `*.test.ts` suffix.
- Compiled artifacts are emitted to `dist/` via TypeScript; keep generated files out of source control.

## Build, Test, and Development Commands
- `npm start` runs `ts-node src/index.ts` for a fast TypeScript REPL-style entry point.
- `npm run build` cleans `dist/` and compiles TypeScript with the repo `tsconfig.json`.
- `npm test` executes Node's built-in test runner (`node --test`) against every file in `src/test/**`.
- `npm run lint` applies the shared ESLint configuration across the project.

## Coding Style & Naming Conventions
- Use TypeScript with strict mode; follow the ESLint rules bundled from `@eslint/js` and `typescript-eslint`.
- Prefer 2-space indentation, trailing commas where valid, and `import`/`export` module syntax.
- Name classes in PascalCase (`HelloWorld`), functions and variables in camelCase, and tests as `<Module>.test.ts`.
- Default to named exports to keep tree-shaking predictable; reserve default exports for entry files.

## Testing Guidelines
- Write tests with Node's `node:test` API (`test()` blocks plus `assert`).
- Structure new suites alongside their targets (`src/lib/Foo.ts` → `src/test/Foo.test.ts`).
- Keep tests deterministic; mock filesystem or network access when needed.
- Run `npm test` before committing and after significant refactors.

## Commit & Pull Request Guidelines
- Use short, imperative commit subjects (e.g., `Add validation guard`) similar to the existing history.
- Squash noisy WIP commits before raising a PR to keep history clean.
- PRs should outline the change, link related issues, note risks, and include relevant screenshots or logs for CLI output.
- Confirm linting and tests pass locally; mention the commands run in the PR description.
