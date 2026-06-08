import test from "node:test";
import assert from "node:assert/strict";
import { buildSimplePdf, padValue, tabulateReport } from "../src/adminportal/utils/simplePdf.js";

test("padValue trims long values without adding truncation markers", () => {
  assert.equal(padValue("abcdefghij", 6), "abcdef");
});

test("tabulateReport returns header, divider, and body lines", () => {
  const lines = tabulateReport(
    [
      { key: "product", label: "Product", width: 10 },
      { key: "qty", label: "Qty", width: 5 },
    ],
    [{ product: "CeraVe", qty: 3 }]
  );

  assert.equal(lines.length, 3);
  assert.match(lines[0], /Product/);
  assert.match(lines[2], /CeraVe/);
});

test("buildSimplePdf creates a PDF blob with content", async () => {
  const blob = buildSimplePdf({
    title: "Tenzy report",
    subtitle: "Generated today",
    columns: [{ key: "product", label: "Product", width: 10 }],
    rows: [{ product: "Boots haul" }],
  });

  assert.equal(blob.type, "application/pdf");
  const text = await blob.text();
  assert.match(text, /%PDF-1\.4/);
  assert.match(text, /Tenzy report/);
});
