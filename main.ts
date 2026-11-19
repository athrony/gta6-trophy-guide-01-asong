import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDirectory, { recursive: true });
cpSync(join(projectRoot, 'app'), join(outputDirectory, 'app'), { recursive: true });
mkdirSync(join(outputDirectory, 'screenshots'), { recursive: true });
if (existsSync(join(projectRoot, 'screenshots'))) {
  cpSync(join(projectRoot, 'screenshots'), join(outputDirectory, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outputDirectory, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDirectory, 'dossier.json'), dossier);
