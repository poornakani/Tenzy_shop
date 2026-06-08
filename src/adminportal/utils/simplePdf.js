const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 34;
const TABLE_TOP = 128;
const HEADER_HEIGHT = 24;
const ROW_PADDING_X = 6;
const ROW_PADDING_Y = 6;
const BODY_FONT_SIZE = 8;
const HEADER_FONT_SIZE = 8;
const LINE_HEIGHT = 10;
const MIN_ROW_HEIGHT = 24;
const FOOTER_Y = 22;

const COLORS = {
  teal: "0.051 0.580 0.533",
  tealDark: "0.047 0.345 0.314",
  slate900: "0.059 0.090 0.165",
  slate700: "0.200 0.255 0.333",
  slate500: "0.392 0.455 0.545",
  slate300: "0.796 0.835 0.882",
  slate100: "0.945 0.961 0.976",
  white: "1 1 1",
};

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .replace(/£/g, "GBP ")
    .replace(/[→←↑↓]/g, "->")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/[×÷]/g, "x")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value) {
  return sanitizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function drawText(text, x, y, { font = "F1", size = BODY_FONT_SIZE, color = COLORS.slate700 } = {}) {
  return [
    "BT",
    `/${font} ${size} Tf`,
    `${color} rg`,
    `${x.toFixed(2)} ${y.toFixed(2)} Td`,
    `(${escapePdfText(text)}) Tj`,
    "ET",
  ].join("\n");
}

function rect(x, y, width, height, color, mode = "f") {
  return [
    `${color} ${mode === "S" ? "RG" : "rg"}`,
    `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${mode}`,
  ].join("\n");
}

function line(x1, y1, x2, y2, color = COLORS.slate300, width = 0.6) {
  return [
    `${color} RG`,
    `${width} w`,
    `${x1.toFixed(2)} ${y1.toFixed(2)} m`,
    `${x2.toFixed(2)} ${y2.toFixed(2)} l`,
    "S",
  ].join("\n");
}

export function padValue(value, width) {
  const text = String(value ?? "");
  if (text.length >= width) return text.slice(0, width);
  return text.padEnd(width, " ");
}

function wrapValue(value, maxChars) {
  const text = String(value ?? "").trim();
  if (!text) return [""];

  const lines = [];
  const words = text.split(/\s+/);
  let lineText = "";

  words.forEach((word) => {
    if (word.length > maxChars) {
      if (lineText) {
        lines.push(lineText);
        lineText = "";
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      return;
    }

    const next = lineText ? `${lineText} ${word}` : word;
    if (next.length > maxChars) {
      lines.push(lineText);
      lineText = word;
    } else {
      lineText = next;
    }
  });

  if (lineText) lines.push(lineText);
  return lines.length ? lines : [""];
}

export function tabulateReport(columns, rows) {
  const widths = columns.map((column) => column.width ?? 18);
  const header = columns.map((column, index) => padValue(column.label, widths[index])).join("  ");
  const divider = widths.map((width) => "-".repeat(width)).join("  ");
  const body = rows.flatMap((row) => {
    const wrappedCells = columns.map((column, index) => wrapValue(row[column.key] ?? "", widths[index]));
    const lineCount = Math.max(...wrappedCells.map((cell) => cell.length));
    return Array.from({ length: lineCount }, (_, lineIndex) =>
      columns.map((column, columnIndex) => padValue(wrappedCells[columnIndex][lineIndex] ?? "", widths[columnIndex])).join("  ")
    );
  });
  return [header, divider, ...body];
}

function normalizeColumns(columns) {
  const totalWidth = PAGE_WIDTH - MARGIN * 2;
  const declaredTotal = columns.reduce((sum, column) => sum + (column.width ?? 18), 0) || 1;
  let x = MARGIN;
  return columns.map((column, index) => {
    const isLast = index === columns.length - 1;
    const width = isLast ? PAGE_WIDTH - MARGIN - x : totalWidth * ((column.width ?? 18) / declaredTotal);
    const result = { ...column, x, pdfWidth: width };
    x += width;
    return result;
  });
}

function prepareRows(columns, rows) {
  return rows.map((row, rowIndex) => {
    const cells = columns.map((column) => {
      const maxChars = Math.max(6, Math.floor((column.pdfWidth - ROW_PADDING_X * 2) / (BODY_FONT_SIZE * 0.52)));
      return wrapValue(row[column.key] ?? "", maxChars);
    });
    const lineCount = Math.max(...cells.map((cell) => cell.length));
    return {
      cells,
      rowIndex,
      height: Math.max(MIN_ROW_HEIGHT, ROW_PADDING_Y * 2 + lineCount * LINE_HEIGHT),
    };
  });
}

function paginate(preparedRows) {
  const pages = [];
  const bottomLimit = FOOTER_Y + 24;
  let page = [];
  let used = TABLE_TOP + HEADER_HEIGHT;

  preparedRows.forEach((row) => {
    if (page.length > 0 && used + row.height > PAGE_HEIGHT - bottomLimit) {
      pages.push(page);
      page = [];
      used = TABLE_TOP + HEADER_HEIGHT;
    }
    page.push(row);
    used += row.height;
  });

  pages.push(page);
  return pages;
}

function buildPageStream({ title, subtitle, columns, pageRows, pageNumber, pageCount, rowCount }) {
  const parts = [];

  parts.push(rect(0, PAGE_HEIGHT - 86, PAGE_WIDTH, 86, COLORS.tealDark));
  parts.push(rect(0, PAGE_HEIGHT - 90, PAGE_WIDTH, 4, COLORS.teal));
  parts.push(drawText("TENZY SHOP", MARGIN, PAGE_HEIGHT - 35, { font: "F2", size: 10, color: COLORS.white }));
  parts.push(drawText(title || "Report", MARGIN, PAGE_HEIGHT - 58, { font: "F2", size: 20, color: COLORS.white }));
  if (subtitle) {
    parts.push(drawText(subtitle, MARGIN, PAGE_HEIGHT - 76, { size: 9, color: COLORS.white }));
  }

  const meta = `${rowCount} row${rowCount === 1 ? "" : "s"} exported`;
  parts.push(rect(PAGE_WIDTH - MARGIN - 124, PAGE_HEIGHT - 70, 124, 30, COLORS.white));
  parts.push(drawText(meta, PAGE_WIDTH - MARGIN - 112, PAGE_HEIGHT - 52, { font: "F2", size: 8, color: COLORS.tealDark }));
  parts.push(drawText(`Page ${pageNumber} of ${pageCount}`, PAGE_WIDTH - MARGIN - 112, PAGE_HEIGHT - 64, { size: 8, color: COLORS.slate500 }));

  parts.push(rect(MARGIN, PAGE_HEIGHT - TABLE_TOP - HEADER_HEIGHT, PAGE_WIDTH - MARGIN * 2, HEADER_HEIGHT, COLORS.teal));
  columns.forEach((column) => {
    parts.push(drawText(column.label, column.x + ROW_PADDING_X, PAGE_HEIGHT - TABLE_TOP - 15, {
      font: "F2",
      size: HEADER_FONT_SIZE,
      color: COLORS.white,
    }));
  });

  let y = PAGE_HEIGHT - TABLE_TOP - HEADER_HEIGHT;
  pageRows.forEach((row) => {
    y -= row.height;
    parts.push(rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, row.height, row.rowIndex % 2 === 0 ? COLORS.white : COLORS.slate100));
    parts.push(line(MARGIN, y, PAGE_WIDTH - MARGIN, y, COLORS.slate300, 0.4));

    columns.forEach((column, columnIndex) => {
      const cellLines = row.cells[columnIndex];
      const textX = column.x + ROW_PADDING_X;
      let textY = y + row.height - ROW_PADDING_Y - BODY_FONT_SIZE;
      cellLines.forEach((cellLine) => {
        parts.push(drawText(cellLine, textX, textY, { size: BODY_FONT_SIZE, color: COLORS.slate700 }));
        textY -= LINE_HEIGHT;
      });
    });
  });

  parts.push(line(MARGIN, FOOTER_Y + 14, PAGE_WIDTH - MARGIN, FOOTER_Y + 14, COLORS.slate300, 0.5));
  parts.push(drawText("Generated by Tenzy admin portal", MARGIN, FOOTER_Y, { size: 8, color: COLORS.slate500 }));
  parts.push(drawText(new Date().toISOString().slice(0, 10), PAGE_WIDTH - MARGIN - 58, FOOTER_Y, { size: 8, color: COLORS.slate500 }));

  return parts.join("\n");
}

export function buildSimplePdf({ title, subtitle, columns, rows }) {
  const normalizedColumns = normalizeColumns(columns ?? []);
  const preparedRows = prepareRows(normalizedColumns, rows ?? []);
  const pages = paginate(preparedRows);

  const objects = [];
  const pageObjectIds = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj");
  objects.push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");

  pages.forEach((pageRows, index) => {
    const contentStream = buildPageStream({
      title,
      subtitle,
      columns: normalizedColumns,
      pageRows,
      pageNumber: index + 1,
      pageCount: pages.length,
      rowCount: rows?.length ?? 0,
    });
    const contentObjectId = objects.length + 1;
    const pageObjectId = objects.length + 2;
    pageObjectIds.push(pageObjectId);

    objects.push(
      `${contentObjectId} 0 obj\n<< /Length ${byteLength(contentStream)} >>\nstream\n${contentStream}\nendstream\nendobj`
    );
    objects.push(
      `${pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj`
    );
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>\nendobj`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(byteLength(pdf));
    pdf += `${object}\n`;
  });

  const xrefStart = byteLength(pdf);
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
