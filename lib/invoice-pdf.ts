import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { invoiceTotals, lineTotalCents, type Company, type Invoice, type InvoiceLine } from "./invoice";
import { LOGO_PATHS, LOGO_VIEWBOX } from "./logo-paths";
import type { Quote } from "./quote";

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const INK = rgb(0.16, 0.13, 0.11);
const MUTED = rgb(0.45, 0.41, 0.38);
const ACCENT = rgb(0.71, 0.27, 0.17);
const LINE = rgb(0.88, 0.85, 0.82);

// Table columns: description, quantity, unit price, VAT, total (x = left edge; numbers are right-aligned).
const COLUMNS = { description: MARGIN, quantity: 330, price: 410, vat: 455, total: PAGE_WIDTH - MARGIN };

const AMOUNT_FORMAT = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

function formatAmount(cents: number) {
  return AMOUNT_FORMAT.format(cents / 100);
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type Fonts = { regular: PDFFont; bold: PDFFont };

// The standard PDF fonts only cover WinAnsi; replace anything else instead of failing.
function safeText(font: PDFFont, value: string) {
  let result = "";
  for (const char of value.replace(/[  ]/g, " ")) {
    try {
      font.encodeText(char);
      result += char;
    } catch {
      result += "?";
    }
  }
  return result;
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of safeText(font, value).split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

class Writer {
  page: PDFPage;
  y = PAGE_HEIGHT - MARGIN;

  constructor(
    private doc: PDFDocument,
    private fonts: Fonts,
    private draft: boolean,
  ) {
    this.page = this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
    if (this.draft) {
      this.page.drawText("CONCEPT", {
        x: 120,
        y: 280,
        size: 110,
        font: this.fonts.bold,
        color: rgb(0.93, 0.9, 0.88),
        rotate: degrees(35),
      });
    }
    return this.page;
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN + 40) this.newPage();
  }

  text(value: string, x: number, options: { size?: number; bold?: boolean; color?: typeof INK; align?: "left" | "right" } = {}) {
    const { size = 10, bold = false, color = INK, align = "left" } = options;
    const font = bold ? this.fonts.bold : this.fonts.regular;
    const clean = safeText(font, value);
    const drawX = align === "right" ? x - font.widthOfTextAtSize(clean, size) : x;
    this.page.drawText(clean, { x: drawX, y: this.y, size, font, color });
  }

  rule(thickness = 0.75) {
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y }, thickness, color: LINE });
  }
}

/** What a document (invoice or quote) shows; the layout is shared. */
type PdfDocument = {
  title: string;
  heading: string;
  /** "CONCEPT" watermark. */
  draft: boolean;
  seller: Company;
  details: [string, string][];
  customerHeading: string;
  customerLines: (string | null)[];
  lines: InvoiceLine[];
  /** Small print below the totals. */
  closing: string[];
};

// The white logo on a rounded badge in the brand colour, as in the app header. Returns its height.
function drawLogo(page: PDFPage, x: number, top: number) {
  const logoHeight = 54;
  const scale = logoHeight / LOGO_VIEWBOX.height;
  const padX = 10;
  const padY = 6;
  const width = LOGO_VIEWBOX.width * scale + 2 * padX;
  const height = logoHeight + 2 * padY;
  const r = 6;
  page.drawSvgPath(
    `M${r},0 H${width - r} Q${width},0 ${width},${r} V${height - r} Q${width},${height} ${width - r},${height} H${r} Q0,${height} 0,${height - r} V${r} Q0,0 ${r},0 Z`,
    { x, y: top, color: ACCENT, borderWidth: 0 },
  );
  for (const path of LOGO_PATHS) page.drawSvgPath(path, { x: x + padX, y: top - padY, scale, color: rgb(1, 1, 1), borderWidth: 0 });
  return height;
}

async function renderDocument(input: PdfDocument): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
  const { title, seller } = input;
  doc.setTitle(title);
  doc.setAuthor(seller.name);

  const w = new Writer(doc, fonts, input.draft);

  // Header: logo top left, document title top right.
  const top = PAGE_HEIGHT - MARGIN + 14;
  const logoHeight = drawLogo(w.page, MARGIN, top);
  w.y = top - 20;
  w.text(input.heading, PAGE_WIDTH - MARGIN, { size: 16, bold: true, align: "right" });
  w.y = top - logoHeight - 22;

  // Seller below the logo, document details on the right.
  const startY = w.y;
  w.text(seller.name, MARGIN, { size: 11, bold: true });
  w.y -= 14;
  const sellerLines = [
    seller.address,
    `${seller.postal_code} ${seller.city}`,
    seller.email,
    seller.phone,
    `KvK ${seller.kvk_number}`,
    `Btw ${seller.vat_number}`,
    `IBAN ${seller.iban}`,
  ].filter((line): line is string => Boolean(line));
  for (const line of sellerLines) {
    w.text(line, MARGIN, { size: 9, color: MUTED });
    w.y -= 12;
  }

  const endSellerY = w.y;
  w.y = startY;
  for (const [label, value] of input.details) {
    w.text(label, 360, { size: 9, color: MUTED });
    w.text(value, PAGE_WIDTH - MARGIN, { size: 9, bold: true, align: "right" });
    w.y -= 14;
  }
  w.y = Math.min(w.y, endSellerY) - 20;

  // Customer.
  w.text(input.customerHeading, MARGIN, { size: 9, bold: true, color: MUTED });
  w.y -= 14;
  input.customerLines.forEach((line, index) => {
    if (!line?.trim()) return;
    w.text(line, MARGIN, { size: 10, bold: index === 0 });
    w.y -= 13;
  });
  w.y -= 22;

  // Lines table.
  const tableHeader = () => {
    w.text("Omschrijving", COLUMNS.description, { size: 9, bold: true, color: MUTED });
    w.text("Aantal", COLUMNS.quantity, { size: 9, bold: true, color: MUTED, align: "right" });
    w.text("Prijs incl.", COLUMNS.price, { size: 9, bold: true, color: MUTED, align: "right" });
    w.text("Btw", COLUMNS.vat, { size: 9, bold: true, color: MUTED, align: "right" });
    w.text("Totaal incl.", COLUMNS.total, { size: 9, bold: true, color: MUTED, align: "right" });
    w.y -= 8;
    w.rule();
    w.y -= 16;
  };
  tableHeader();

  for (const line of input.lines) {
    const descriptionLines = wrap(fonts.regular, line.description, 10, COLUMNS.quantity - COLUMNS.description - 50);
    const rowHeight = descriptionLines.length * 13 + 8;
    if (w.y - rowHeight < MARGIN + 40) {
      w.newPage();
      tableHeader();
    }
    const rowTop = w.y;
    w.text(String(line.quantity), COLUMNS.quantity, { align: "right" });
    w.text(formatAmount(line.unit_price_cents), COLUMNS.price, { align: "right" });
    w.text(`${line.vat_rate}%`, COLUMNS.vat, { align: "right" });
    w.text(formatAmount(lineTotalCents(line)), COLUMNS.total, { align: "right" });
    for (const text of descriptionLines) {
      w.text(text, COLUMNS.description);
      w.y -= 13;
    }
    w.y = rowTop - rowHeight;
  }
  w.y += 8;
  w.rule();
  w.y -= 20;

  // Totals with VAT per rate.
  const totals = invoiceTotals(input.lines);
  w.ensureSpace(40 + totals.groups.length * 14 + 80);
  const labelX = 330;
  const totalRow = (label: string, amount: number, bold = false) => {
    w.text(label, labelX, { size: bold ? 11 : 10, bold, color: bold ? INK : MUTED });
    w.text(formatAmount(amount), COLUMNS.total, { size: bold ? 11 : 10, bold, align: "right" });
    w.y -= bold ? 18 : 14;
  };
  totalRow("Subtotaal excl. btw", totals.exclCents);
  for (const group of totals.groups) totalRow(`Btw ${group.rate}% over ${formatAmount(group.exclCents)}`, group.vatCents);
  w.y -= 4;
  w.page.drawLine({ start: { x: labelX, y: w.y + 12 }, end: { x: PAGE_WIDTH - MARGIN, y: w.y + 12 }, thickness: 0.75, color: LINE });
  totalRow("Totaal incl. btw", totals.inclCents, true);

  // Small print, paragraph by paragraph.
  w.y -= 24;
  for (const paragraph of input.closing) {
    for (const text of paragraph.split("\n").flatMap((part) => wrap(fonts.regular, part, 9, PAGE_WIDTH - 2 * MARGIN))) {
      w.ensureSpace(12);
      w.text(text, MARGIN, { size: 9, color: MUTED });
      w.y -= 12;
    }
    w.y -= 8;
  }

  // Page numbers, once the page count is known.
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const label = safeText(fonts.regular, `${title} · pagina ${index + 1} van ${pages.length}`);
    const size = 8;
    page.drawText(label, { x: PAGE_WIDTH - MARGIN - fonts.regular.widthOfTextAtSize(label, size), y: MARGIN - 20, size, font: fonts.regular, color: MUTED });
  });

  return doc.save();
}

export async function createInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const draft = invoice.number === null;
  const dueDate = addDays(invoice.issueDate, invoice.seller.payment_term_days);
  const totals = invoiceTotals(invoice.lines);
  const { customer, seller } = invoice;
  return renderDocument({
    title: draft ? draftName(invoice) : `Factuur ${invoice.number}`,
    heading: draft ? "CONCEPTFACTUUR" : "FACTUUR",
    draft,
    seller,
    details: [
      ["Factuurnummer", invoice.number ?? "wordt toegekend"],
      ["Factuurdatum", formatDate(invoice.issueDate)],
      ["Vervaldatum", formatDate(dueDate)],
      ...(invoice.stoveNumber === null ? [] : [["Kachelnummer", String(invoice.stoveNumber)] as [string, string]]),
    ],
    customerHeading: "Factuur aan",
    customerLines: [customer.name, customer.address, `${customer.postal_code} ${customer.city}`, customer.email, customer.phone],
    lines: invoice.lines,
    closing: [
      `Graag het totaalbedrag van ${formatAmount(totals.inclCents)} vóór ${formatDate(dueDate)} overmaken op ${seller.iban} ten name van ${seller.name}, onder vermelding van ${invoice.number ? `factuurnummer ${invoice.number}` : "het factuurnummer"}.`,
    ],
  });
}

export async function createQuotePdf(quote: Quote, seller: Company): Promise<Uint8Array> {
  const { customer } = quote;
  return renderDocument({
    title: quote.number ? `Offerte ${quote.number}` : "Conceptofferte",
    heading: "OFFERTE",
    draft: quote.number === null,
    seller,
    details: [
      ["Offertenummer", quote.number ?? "wordt toegekend"],
      ["Datum", formatDate(quote.issueDate)],
      ["Geldig tot", formatDate(quote.validUntil)],
    ],
    customerHeading: "Offerte voor",
    customerLines: [customer.name, customer.address, [customer.postalCode, customer.city].filter(Boolean).join(" "), customer.email, customer.phone],
    lines: quote.lines,
    closing: [
      ...(quote.notes ? [quote.notes] : []),
      `Deze offerte is geldig tot en met ${formatDate(quote.validUntil)}. Alle prijzen zijn inclusief btw.`,
    ],
  });
}

function draftName(invoice: Invoice) {
  return invoice.stoveNumber === null ? "Conceptfactuur" : `Conceptfactuur kachel ${invoice.stoveNumber}`;
}

export function invoiceFileName(invoice: Invoice) {
  return invoice.number ? `Factuur ${invoice.number}.pdf` : `${draftName(invoice)}.pdf`;
}

export function quoteFileName(quote: Pick<Quote, "number">) {
  return quote.number ? `Offerte ${quote.number}.pdf` : "Conceptofferte.pdf";
}
