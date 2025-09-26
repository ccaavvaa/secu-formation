import { createApp } from './app.js';

const app = createApp();
const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
