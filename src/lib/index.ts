import { createApp } from './app.js';
import { VulnerableMessageRepository, SecureMessageRepository } from './message-repository.js';

const vulnerableRepository = new VulnerableMessageRepository();
const secureRepository = new SecureMessageRepository();
const app = createApp(vulnerableRepository, secureRepository);
const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
