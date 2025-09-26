# Codex Project History
1. use /init to create AGENTS.md and link AGENTS.md to README.md
2. scaffold Express server entrypoint, handlers, and tests
3. relocate Express entry files into src/lib
4. integrate Better-SQLite3 persistence with message routes
5. modify SQLite insert logic to demonstrate SQL injection vulnerability
6. add `/messages/:id` lookup route using vulnerable SQL concatenation
7. add test illustrating schema leakage via injected id payload
8. remove legacy hello/health routes to focus on SQL injection scenarios
