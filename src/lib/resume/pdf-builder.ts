import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { BaseResume, TailoredResume } from '@/types';

// ── Constants ─────────────────────────────────────────────────────

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Colors
const TEXT_COLOR = rgb(0.102, 0.102, 0.102); // #1a1a1a
const ACCENT_COLOR = rgb(0.145, 0.388, 0.922); // #2563eb
const SECONDARY_COLOR = rgb(0.42, 0.45, 0.5); // #6b7280

// Font sizes
const NAME_SIZE = 20;
const CONTACT_SIZE = 9;
const HEADING_SIZE = 8;
const SUBHEADING_SIZE = 10;
const BODY_SIZE = 9.5;
const BULLET_SIZE = 9;
const LINE_HEIGHT = 12;
const SECTION_GAP = 16;
const HEADING_GAP = 6;

// ── Public API ────────────────────────────────────────────────────

export async function generateResumePdf(
  baseResume: BaseResume,
  tailored: TailoredResume,
  outputPath: string,
): Promise<void> {
  const doc = await PDFDocument.create();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: DrawContext = {
    doc,
    fontRegular,
    fontBold,
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
  };

  // 1. Header
  drawHeader(ctx, baseResume);

  // 2. Summary
  drawSectionHeading(ctx, 'SUMMARY');
  drawWrappedText(ctx, tailored.tailoredSummary || baseResume.summary, {
    font: ctx.fontRegular,
    size: BODY_SIZE,
    color: TEXT_COLOR,
    lineHeight: LINE_HEIGHT + 2,
  });
  ctx.y -= SECTION_GAP;

  // 3. Experience
  drawSectionHeading(ctx, 'EXPERIENCE');
  for (const exp of baseResume.experience) {
    ensureSpace(ctx, 60);

    // Company + Title line
    const left = `${exp.company}  —  ${exp.title}`;
    const right = `${exp.startDate} – ${exp.endDate}`;
    drawTwoColumn(ctx, left, right, {
      leftFont: ctx.fontBold,
      rightFont: ctx.fontRegular,
      size: SUBHEADING_SIZE,
      color: TEXT_COLOR,
    });
    ctx.y -= 4;

    // Bullets: prefer tailored, fall back to original
    const bullets =
      tailored.tailoredBullets[exp.company] ??
      tailored.tailoredBullets[exp.company.toLowerCase()] ??
      exp.bullets;

    for (const bullet of bullets) {
      ensureSpace(ctx, LINE_HEIGHT * 2);
      drawWrappedText(ctx, `•  ${bullet}`, {
        font: ctx.fontRegular,
        size: BULLET_SIZE,
        color: TEXT_COLOR,
        lineHeight: LINE_HEIGHT,
        indent: 10,
      });
    }

    ctx.y -= 8;
  }
  ctx.y -= SECTION_GAP - 8;

  // 4. Skills
  drawSectionHeading(ctx, 'SKILLS');
  drawWrappedText(ctx, baseResume.skills.join(', '), {
    font: ctx.fontRegular,
    size: BULLET_SIZE,
    color: TEXT_COLOR,
    lineHeight: LINE_HEIGHT,
  });
  ctx.y -= SECTION_GAP;

  // 5. Education
  if (baseResume.education.length > 0) {
    drawSectionHeading(ctx, 'EDUCATION');
    for (const edu of baseResume.education) {
      ensureSpace(ctx, 30);
      const left = `${edu.degree} in ${edu.field}  —  ${edu.institution}`;
      const right = String(edu.graduationYear);
      drawTwoColumn(ctx, left, right, {
        leftFont: ctx.fontRegular,
        rightFont: ctx.fontRegular,
        size: BULLET_SIZE,
        color: TEXT_COLOR,
      });
      ctx.y -= 4;
    }
    ctx.y -= SECTION_GAP;
  }

  // 6. Projects
  if (baseResume.projects.length > 0) {
    drawSectionHeading(ctx, 'PROJECTS');
    for (const proj of baseResume.projects) {
      ensureSpace(ctx, 40);
      drawWrappedText(ctx, proj.name, {
        font: ctx.fontBold,
        size: BULLET_SIZE,
        color: TEXT_COLOR,
        lineHeight: LINE_HEIGHT,
      });
      drawWrappedText(ctx, proj.description, {
        font: ctx.fontRegular,
        size: BULLET_SIZE,
        color: SECONDARY_COLOR,
        lineHeight: LINE_HEIGHT,
      });
      if (proj.techStack.length) {
        drawWrappedText(ctx, `Tech: ${proj.techStack.join(', ')}`, {
          font: ctx.fontRegular,
          size: 8,
          color: SECONDARY_COLOR,
          lineHeight: LINE_HEIGHT,
        });
      }
      ctx.y -= 6;
    }
  }

  // Save
  const pdfBytes = await doc.save();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, pdfBytes);
}

// ── Draw context ──────────────────────────────────────────────────

interface DrawContext {
  doc: PDFDocument;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  page: PDFPage;
  y: number;
}

// ── Drawing helpers ───────────────────────────────────────────────

function drawHeader(ctx: DrawContext, resume: BaseResume): void {
  // Name
  ctx.page.drawText(resume.fullName, {
    x: MARGIN,
    y: ctx.y,
    size: NAME_SIZE,
    font: ctx.fontBold,
    color: ACCENT_COLOR,
  });
  ctx.y -= NAME_SIZE + 6;

  // Contact line
  const contactParts = [
    resume.email,
    resume.phone,
    resume.linkedin,
    resume.github,
  ].filter(Boolean);
  const contactLine = contactParts.join('  |  ');
  ctx.page.drawText(contactLine, {
    x: MARGIN,
    y: ctx.y,
    size: CONTACT_SIZE,
    font: ctx.fontRegular,
    color: SECONDARY_COLOR,
  });
  ctx.y -= CONTACT_SIZE + 8;

  // Horizontal rule
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 1,
    color: ACCENT_COLOR,
  });
  ctx.y -= SECTION_GAP;
}

function drawSectionHeading(ctx: DrawContext, title: string): void {
  ensureSpace(ctx, 30);

  // Letter-spaced uppercase heading
  const spaced = title.split('').join(' ');
  ctx.page.drawText(spaced, {
    x: MARGIN,
    y: ctx.y,
    size: HEADING_SIZE,
    font: ctx.fontBold,
    color: ACCENT_COLOR,
  });
  ctx.y -= HEADING_SIZE + HEADING_GAP;
}

interface TextOptions {
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  lineHeight: number;
  indent?: number;
}

function drawWrappedText(ctx: DrawContext, text: string, opts: TextOptions): void {
  const indent = opts.indent ?? 0;
  const maxWidth = CONTENT_W - indent;
  const lines = wrapText(text, opts.font, opts.size, maxWidth);

  for (const line of lines) {
    ensureSpace(ctx, opts.lineHeight);
    ctx.page.drawText(line, {
      x: MARGIN + indent,
      y: ctx.y,
      size: opts.size,
      font: opts.font,
      color: opts.color,
    });
    ctx.y -= opts.lineHeight;
  }
}

interface TwoColumnOptions {
  leftFont: PDFFont;
  rightFont: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
}

function drawTwoColumn(
  ctx: DrawContext,
  left: string,
  right: string,
  opts: TwoColumnOptions,
): void {
  ensureSpace(ctx, opts.size + 4);

  ctx.page.drawText(left, {
    x: MARGIN,
    y: ctx.y,
    size: opts.size,
    font: opts.leftFont,
    color: opts.color,
  });

  const rightWidth = opts.rightFont.widthOfTextAtSize(right, opts.size);
  ctx.page.drawText(right, {
    x: PAGE_W - MARGIN - rightWidth,
    y: ctx.y,
    size: opts.size,
    font: opts.rightFont,
    color: SECONDARY_COLOR,
  });

  ctx.y -= opts.size + 2;
}

function ensureSpace(ctx: DrawContext, needed: number): void {
  if (ctx.y - needed < MARGIN) {
    ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
  }
}

// ── Text wrapping ─────────────────────────────────────────────────

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);

    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) lines.push(current);
  return lines;
}
