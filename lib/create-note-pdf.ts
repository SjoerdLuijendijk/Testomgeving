import { PDFDocument } from "pdf-lib";

export type PdfNoteFile = {
  name: string;
  url: string | null;
};

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const MARGIN = 100;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_HEIGHT - 130;
const MAX_IMAGE_HEIGHT = 1280;
const INK = "#20332f";
const MUTED = "#697a73";
const GREEN = "#276e60";
const LINE = "#dce5df";

function isImage(name: string, mimeType: string) {
  return /^(image\/(jpeg|png|webp|gif|bmp))$/.test(mimeType) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(name);
}

function isPdf(name: string, mimeType: string) {
  return mimeType === "application/pdf" || /\.pdf$/i.test(name);
}

async function loadImage(bytes: ArrayBuffer, mimeType: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new Error("Een afbeelding kon niet worden geopend voor de PDF.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createNotePdf(note: {
  text: string;
  createdAt: string;
  files: PdfNoteFile[];
}): Promise<Uint8Array> {
  // Fetch every file before creating a PDF, so a failed download cannot produce an incomplete export.
  const attachments = await Promise.all(
    note.files.map(async (file) => {
      if (!file.url) throw new Error("Een bijlage is niet beschikbaar. Vernieuw de pagina en probeer opnieuw.");
      let response: Response;
      try {
        response = await fetch(file.url);
      } catch {
        throw new Error("Een bijlage kon niet worden opgehaald. Vernieuw de pagina en probeer opnieuw.");
      }
      if (!response.ok) throw new Error("Een bijlage kon niet worden opgehaald. Vernieuw de pagina en probeer opnieuw.");
      return {
        name: file.name,
        bytes: await response.arrayBuffer(),
        mimeType: response.headers.get("content-type")?.split(";")[0] || "application/octet-stream",
      };
    }),
  );
  const usedNames = new Set<string>();
  for (const attachment of attachments) {
    const originalName = attachment.name;
    const dot = originalName.lastIndexOf(".");
    let copy = 2;
    while (usedNames.has(attachment.name)) {
      attachment.name = dot > 0
        ? `${originalName.slice(0, dot)} (${copy})${originalName.slice(dot)}`
        : `${originalName} (${copy})`;
      copy++;
    }
    usedNames.add(attachment.name);
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle("Notitie");
  const canvases: HTMLCanvasElement[] = [];
  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  let y: number;

  function newPage() {
    canvas = document.createElement("canvas");
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const drawingContext = canvas.getContext("2d");
    if (!drawingContext) throw new Error("De PDF-pagina kon niet worden gemaakt.");
    context = drawingContext;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    context.fillStyle = INK;
    context.fillRect(MARGIN, 72, 48, 48);
    context.fillStyle = "#ffffff";
    context.font = "bold 29px Georgia";
    context.fillText("N", MARGIN + 12, 106);
    context.fillStyle = INK;
    context.font = "bold 25px Arial";
    context.fillText("NOTITIES", MARGIN + 66, 105);
    context.fillStyle = MUTED;
    context.font = "20px Arial";
    context.textAlign = "right";
    context.fillText("PERSOONLIJK ARCHIEF", PAGE_WIDTH - MARGIN, 104);
    context.textAlign = "left";
    context.strokeStyle = LINE;
    context.beginPath();
    context.moveTo(MARGIN, 145);
    context.lineTo(PAGE_WIDTH - MARGIN, 145);
    context.stroke();
    y = 205;
    canvases.push(canvas);
  }

  function write(text: string, font: string, lineHeight: number, gap = 0, color = INK, x = MARGIN, width = CONTENT_WIDTH) {
    context.font = font;
    for (const paragraph of text.split(/\r?\n/)) {
      let line = "";
      for (const character of Array.from(paragraph)) {
        if (context.measureText(line + character).width > width && line) {
          drawLine(line, font, lineHeight, color, x);
          line = character === " " ? "" : character;
        } else {
          line += character;
        }
      }
      drawLine(line, font, lineHeight, color, x);
    }
    y += gap;
  }

  function drawLine(line: string, font: string, lineHeight: number, color: string, x: number) {
    if (y + lineHeight > CONTENT_BOTTOM) newPage();
    context.font = font;
    context.fillStyle = color;
    context.fillText(line, x, y + lineHeight * 0.8);
    y += lineHeight;
  }

  newPage();
  write("NOTITIE", "bold 23px Arial", 34, 12, GREEN);
  write(new Date(note.createdAt).toLocaleString("nl-NL", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }), "26px Arial", 40, 39, MUTED);
  if (y + 58 > CONTENT_BOTTOM) newPage();
  context.fillStyle = GREEN;
  context.fillRect(MARGIN, y + 7, 5, 45);
  write(note.text, "40px Georgia", 58, 56, INK, MARGIN + 30, CONTENT_WIDTH - 30);

  const pdfAttachments: typeof attachments = [];
  if (attachments.length > 0) {
    if (y + 110 > CONTENT_BOTTOM) newPage();
    context.strokeStyle = LINE;
    context.beginPath();
    context.moveTo(MARGIN, y);
    context.lineTo(PAGE_WIDTH - MARGIN, y);
    context.stroke();
    y += 40;
    write("BIJLAGEN", "bold 23px Arial", 34, 29, GREEN);
    for (const attachment of attachments) {
      if (isImage(attachment.name, attachment.mimeType)) {
        const image = await loadImage(attachment.bytes, attachment.mimeType);
        const scale = Math.min(CONTENT_WIDTH / image.naturalWidth, MAX_IMAGE_HEIGHT / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        if (y + 90 + height > CONTENT_BOTTOM) newPage();
        write(attachment.name, "bold 26px Arial", 40, 17);
        if (y + height > CONTENT_BOTTOM) newPage();
        context.drawImage(image, MARGIN, y, width, height);
        context.strokeStyle = LINE;
        context.strokeRect(MARGIN, y, width, height);
        y += height + 42;
      } else if (isPdf(attachment.name, attachment.mimeType)) {
        pdfAttachments.push(attachment);
        write(attachment.name, "bold 26px Arial", 40, 5);
        write("PDF · pagina's volgen na de notitie", "23px Arial", 34, 28, MUTED);
      } else {
        write(attachment.name, "bold 26px Arial", 40, 5);
        write("Open dit bestand via het bijlagenpaneel van je PDF-lezer", "23px Arial", 34, 28, MUTED);
      }
    }
  }

  for (const [index, pageCanvas] of canvases.entries()) {
    const pageContext = pageCanvas.getContext("2d");
    if (!pageContext) throw new Error("De PDF-pagina kon niet worden gemaakt.");
    pageContext.strokeStyle = LINE;
    pageContext.beginPath();
    pageContext.moveTo(MARGIN, PAGE_HEIGHT - 100);
    pageContext.lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 100);
    pageContext.stroke();
    pageContext.fillStyle = MUTED;
    pageContext.font = "20px Arial";
    pageContext.fillText("NOTITIES", MARGIN, PAGE_HEIGHT - 62);
    pageContext.textAlign = "right";
    pageContext.fillText(`PAGINA ${index + 1}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 62);
    pageContext.textAlign = "left";
    const png = await pdf.embedPng(await new Promise<Blob>((resolve, reject) => {
      pageCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("De PDF-pagina kon niet worden gemaakt.")), "image/png");
    }).then((blob) => blob.arrayBuffer()));
    const page = pdf.addPage([595.28, 841.89]);
    page.drawImage(png, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }

  for (const attachment of pdfAttachments) {
    try {
      const source = await PDFDocument.load(attachment.bytes);
      const pages = await pdf.copyPages(source, source.getPageIndices());
      for (const page of pages) pdf.addPage(page);
    } catch {
      throw new Error(`De PDF-bijlage ${attachment.name} kon niet worden toegevoegd.`);
    }
  }

  for (const attachment of attachments) {
    await pdf.attach(attachment.bytes, attachment.name, { mimeType: attachment.mimeType });
  }

  return pdf.save();
}
