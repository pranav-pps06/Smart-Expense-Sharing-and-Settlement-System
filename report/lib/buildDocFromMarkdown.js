import fs from 'fs';
import path from 'path';
import {
  Document,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  ImageRun,
  PageNumber,
  Footer
} from 'docx';

export function buildDocFromMarkdown(md, workspaceRoot) {
  const lines = md.split(/\r?\n/);
  const children = [];
  let inCode = false;
  let codeBuffer = [];

  const flushCode = () => {
    if (codeBuffer.length) {
      const codeText = codeBuffer.join('\n');
      children.push(
        new Paragraph({
          children: [new TextRun({ text: codeText, font: 'Consolas' })]
        })
      );
      codeBuffer = [];
    }
  };

  const addParagraph = (text) => {
    if (!text.trim()) {
      children.push(new Paragraph(''));
      return;
    }
    if (/^\d+\./.test(text) || /^Table of Contents$/i.test(text)) {
      children.push(new Paragraph({ text: text, heading: HeadingLevel.HEADING_2 }));
      return;
    }
    if (/^\-\s+/.test(text)) {
      children.push(new Paragraph({ text: text.replace(/^\-\s+/, ''), bullet: { level: 0 } }));
      return;
    }
    if (/^---+$/.test(text.trim())) {
      children.push(new Paragraph(''));
      return;
    }
    children.push(new Paragraph({ children: [new TextRun(text)] }));
  };

  // Center first non-empty line as a title
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    if (lines[i]?.trim()) {
      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: lines[i], bold: true })] })
      );
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```(.*)/);
    if (fence) {
      inCode = !inCode;
      if (!inCode) flushCode();
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }
    const imgMatch = line.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (imgMatch) {
      const relPath = imgMatch[1];
      const imgPath = path.isAbsolute(relPath) ? relPath : path.join(workspaceRoot, relPath);
      try {
        const imgData = fs.readFileSync(imgPath);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: imgData, transformation: { width: 500, height: 300 } })]
          })
        );
      } catch (e) {
        addParagraph(`(Image not found: ${relPath})`);
      }
      continue;
    }
    addParagraph(line);
  }

  flushCode();

  return new Document({
    sections: [
      {
        properties: {},
        children
      }
    ],
    footer: new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun('Page '), PageNumber.CURRENT, new TextRun(' of '), PageNumber.TOTAL_PAGES]
        })
      ]
    })
  });
}
