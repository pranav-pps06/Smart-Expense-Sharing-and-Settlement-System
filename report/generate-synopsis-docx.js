import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Packer } from 'docx';
import { buildDocFromMarkdown } from './lib/buildDocFromMarkdown.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '..');
const mdPath = path.join(workspaceRoot, 'docs', 'synopsis_copied.md');
const outPath = path.join(workspaceRoot, 'docs', 'reports', 'synopsis_copied.docx');

(async () => {
  try {
    if (!fs.existsSync(mdPath)) {
      console.error(`Markdown file not found at: ${mdPath}`);
      process.exit(1);
    }
    const md = fs.readFileSync(mdPath, 'utf8');
    const doc = buildDocFromMarkdown(md, workspaceRoot);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated DOCX at: ${outPath}`);
  } catch (err) {
    console.error('Failed to generate DOCX:', err);
    process.exit(1);
  }
})();
