import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { businessName, formatDate, invoiceLabel, logoUrl } from "@/lib/invoice";
import { bpsToPercentString, formatCents, formatQuantity, lineAmountCents } from "@/lib/money";
import type { InvoiceWithItems, Profile } from "@/lib/types";

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const M = 48; // margin
const INK = rgb(0.11, 0.11, 0.1);
const MUTE = rgb(0.42, 0.42, 0.39);
const LINE = rgb(0.89, 0.88, 0.85);
const ACCENT = rgb(0.85, 0.28, 0.06);

// Standard PDF fonts only cover WinAnsi; swap anything else for "?".
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function safe(text: string): string {
  return Array.from(text.replace(/\r/g, ""))
    .map((ch) => {
      const c = ch.codePointAt(0)!;
      if (ch === "\n" || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.has(ch)) return ch;
      return "?";
    })
    .join("");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of safe(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
      } else {
        if (line) out.push(line);
        // Hard-break words longer than the column.
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
          let i = w.length;
          while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
          out.push(w.slice(0, i));
          w = w.slice(i);
        }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

async function loadLogo(doc: PDFDocument, path: string | null): Promise<PDFImage | null> {
  const url = logoUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    // PNG signature check; otherwise try JPEG.
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
  } catch {
    // A broken logo should never block the invoice.
  }
  return null;
}

export async function renderInvoicePdf(inv: InvoiceWithItems, profile: Profile): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${invoiceLabel(inv.number)} - ${businessName(profile)}`);
  doc.setCreator("VoiceBill Pro");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(doc, profile.logo_path);

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const text = (s: string, x: number, size: number, font = regular, color = INK) =>
    page.drawText(safe(s), { x, y, size, font, color });
  const right = (s: string, xRight: number, size: number, font = regular, color = INK) =>
    page.drawText(safe(s), { x: xRight - font.widthOfTextAtSize(safe(s), size), y, size, font, color });
  const rule = () => page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 0.75, color: LINE });
  const ensure = (needed: number) => {
    if (y - needed < M + 30) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
    }
  };

  // Header: logo + business on the left, invoice number on the right.
  let headerX = M;
  if (logo) {
    const scale = Math.min(56 / logo.height, 140 / logo.width);
    const w = logo.width * scale;
    const h = logo.height * scale;
    page.drawImage(logo, { x: M, y: y - h + 4, width: w, height: h });
    headerX = M + w + 14;
  }
  y -= 18;
  text(businessName(profile), headerX, 20, bold);
  right("INVOICE", PAGE_W - M, 20, bold, ACCENT);
  y -= 18;
  text(profile.email, headerX, 10, regular, MUTE);
  right(invoiceLabel(inv.number), PAGE_W - M, 11, bold);
  y -= 14;
  right(formatDate(inv.issued_on), PAGE_W - M, 10, regular, MUTE);
  y -= logo ? 34 : 26;

  // Bill to.
  text("BILL TO", M, 9, bold, MUTE);
  y -= 15;
  text(inv.customer_name || "Customer", M, 12, bold);
  if (inv.customer_email) {
    y -= 14;
    text(inv.customer_email, M, 10, regular, MUTE);
  }
  y -= 28;

  // Line items table.
  const colQty = PAGE_W - M - 190;
  const colRate = PAGE_W - M - 95;
  const colAmt = PAGE_W - M;
  const descW = colQty - M - 50;

  const header = () => {
    text("ITEM", M, 9, bold, MUTE);
    right("QTY", colQty, 9, bold, MUTE);
    right("RATE", colRate, 9, bold, MUTE);
    right("AMOUNT", colAmt, 9, bold, MUTE);
    y -= 8;
    rule();
    y -= 16;
  };
  header();

  for (const it of inv.line_items) {
    const lines = wrap(it.description || "-", regular, 11, descW);
    ensure(lines.length * 14 + 12);
    right(formatQuantity(it.quantity), colQty, 11);
    right(formatCents(it.rate_cents), colRate, 11);
    right(formatCents(lineAmountCents(it.quantity, it.rate_cents)), colAmt, 11);
    for (const [i, l] of lines.entries()) {
      if (i > 0) y -= 14;
      text(l, M, 11);
    }
    y -= 10;
    rule();
    y -= 16;
  }

  // Totals.
  ensure(80);
  const labelX = colRate - 60;
  text("Subtotal", labelX, 11, regular, MUTE);
  right(formatCents(inv.subtotal_cents), colAmt, 11);
  if (inv.tax_rate_bps > 0) {
    y -= 18;
    text(`Tax (${bpsToPercentString(inv.tax_rate_bps)}%)`, labelX, 11, regular, MUTE);
    right(formatCents(inv.tax_cents), colAmt, 11);
  }
  y -= 24;
  text("Total due", labelX, 14, bold);
  right(formatCents(inv.total_cents), colAmt, 14, bold);
  y -= 36;

  const block = (title: string, body: string) => {
    const lines = wrap(body, regular, 10, PAGE_W - 2 * M);
    ensure(20 + lines.length * 13);
    text(title, M, 9, bold, MUTE);
    y -= 15;
    for (const l of lines) {
      ensure(13);
      text(l, M, 10);
      y -= 13;
    }
    y -= 14;
  };
  if (inv.notes) block("NOTES", inv.notes);
  if (profile.payment_instructions) block("HOW TO PAY", profile.payment_instructions);

  // Footer on every page.
  for (const p of doc.getPages()) {
    const s = "Made with VoiceBill Pro";
    p.drawText(s, { x: (PAGE_W - regular.widthOfTextAtSize(s, 8)) / 2, y: M - 20, size: 8, font: regular, color: MUTE });
  }

  return doc.save();
}
