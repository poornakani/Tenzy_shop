const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 40;
const TOP = 800;
const LINE_HEIGHT = 14;
const MAX_LINES_PER_PAGE = 48;

export function padValue(value, width) {
  const text = String(value ?? "");
  if (text.length >= width) return `${text.slice(0, width - 1)}~`;
  return text.padEnd(width, " ");
}

export function tabulateReport(columns, rows) {
  const widths = columns.map((column) => column.width ?? 18);
  const header = columns.map((column, index) => padValue(column.label, widths[index])).join("  ");
  const divider = widths.map((width) => "-".repeat(width)).join("  ");
  const body = rows.map((row) =>
    columns.map((column, index) => padValue(row[column.key] ?? "", widths[index])).join("  ")
  );
  return [header, divider, ...body];
}

function escapePdfText(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildContentStream(lines) {
  return [
    "BT",
    "/F1 10 Tf",
    `${LEFT} ${TOP} Td`,
    ...lines.flatMap((line, index) => {
      if (index === 0) return [`(${escapePdfText(line)}) Tj`];
      return [`0 -${LINE_HEIGHT} Td`, `(${escapePdfText(line)}) Tj`];
    }),
    "ET",
  ].join("\n");
}

export function buildSimplePdf({ title, subtitle, columns, rows }) {
  const lines = [
    title,
    subtitle || "",
    "",
    ...tabulateReport(columns, rows),
  ];

  const pages = [];
  for (let index = 0; index < lines.length; index += MAX_LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + MAX_LINES_PER_PAGE));
  }

  const objects = [];
  const pageObjectIds = [];
  const contentObjectIds = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj");
  objects.push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj");

  pages.forEach((pageLines) => {
    const contentStream = buildContentStream(pageLines);
    const contentObjectId = objects.length + 1;
    const pageObjectId = objects.length + 2;
    contentObjectIds.push(contentObjectId);
    pageObjectIds.push(pageObjectId);

    objects.push(
      `${contentObjectId} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`
    );
    objects.push(
      `${pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj`
    );
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>\nendobj`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadSimplePdf({ fileName, title, subtitle, columns, rows }) {
  const blob = buildSimplePdf({ title, subtitle, columns, rows });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
