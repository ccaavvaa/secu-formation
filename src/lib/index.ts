import { createApp } from './app.js';
import { VulnerableMessageRepository } from './message-repository.js';

const repository = new VulnerableMessageRepository();
const app = createApp(repository);
const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
