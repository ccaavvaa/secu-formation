# secu-form

Demonstration project that couples Express 5, TypeScript, and SQLite to showcase common SQL injection pitfalls. The API intentionally ships with raw string queries so you can probe, exploit, and harden the vulnerable patterns in a controlled environment.

## Quick start
- Install dependencies: `npm install`
- Launch with hot reload: `npm run dev`
- Start the production build: `npm start`
- Run lint + tests: `npm run lint && npm test`

By default the HTTP server listens on `http://localhost:3000`. Override the port with `PORT=<number>`. SQLite persists to `./data/app.db`; set `SQLITE_DB_PATH=':memory:'` for ephemeral runs or point it to any file path.

## API surface
| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/messages` | Lists messages ordered by newest first. |
| `GET` | `/messages/:id` | Returns a message by id; accepts raw SQL fragments for injection demos. |
| `POST` | `/messages` | Inserts a message body; vulnerable to injection via the `body` field. |

Send JSON payloads like `{ "body": "hello" }`. Payloads such as `"'); DELETE FROM messages; --"` illustrate destructive injection on the write path, while `0 OR 1=1` or UNION payloads target the read path.

## Project layout
- `src/lib/index.ts` – bootstraps the Express server and reads the `PORT` environment variable.
- `src/lib/app.ts` – builds the Express app, registers JSON middleware, and exposes the `/messages` handlers for unit tests.
- `src/lib/database.ts` – centralises the Better-SQLite3 connection, migrations, and the intentionally unsafe helper functions (`insertMessage`, `findMessageById`).
- `src/index.ts` – re-exports the library entry points for consumers.
- `src/test/app.test.ts` – Node test suite that mocks Express responses and demonstrates exploitation scenarios alongside expected behaviour.
- `data/` – default on-disk SQLite location when `SQLITE_DB_PATH` is not set.
- `dist/` – generated TypeScript output after running `npm run build`.

## Development tips
- Use `npm run dev` during workshops to reload changes instantly.
- When adding new features, keep framework-agnostic logic under `src/lib/` and expose testable handlers or helpers.
- The `executeParameterizedQuery` utility is available for safe queries; the existing insecure helpers remain unchanged to support the training narrative.
- Reset database state in tests with `clearMessages()` and prefer handler-level unit tests over opening sockets.

For workflow conventions and deeper contributor guidelines, see [AGENTS.md](AGENTS.md).
