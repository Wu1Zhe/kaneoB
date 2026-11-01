import { inflateRawSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { exportReport } from "./export-report";
import { reportFixture } from "./report-fixture.test-helper";
const { download } = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("file-saver", () => ({ saveAs: download }));
const t = (key: string) => key.split(":").at(-1)!.split(".").at(-1)!;
afterEach(() => {
  download.mockClear();
  document.body.replaceChildren();
});
async function bytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}
// Read ZIP's central directory, rather than searching compressed bytes for text.
function zipEntries(data: ArrayBuffer) {
  const view = new DataView(data);
  const raw = new Uint8Array(data);
  const decoder = new TextDecoder();
  let end = raw.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  expect(end).toBeGreaterThanOrEqual(0);
  const entries = new Map<string, string>();
  let cursor = view.getUint32(end + 16, true);
  for (let index = 0; index < view.getUint16(end + 10, true); index++) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50);
    const method = view.getUint16(cursor + 10, true);
    const size = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const name = decoder.decode(
      raw.slice(cursor + 46, cursor + 46 + nameLength),
    );
    const local = view.getUint32(cursor + 42, true);
    const start =
      local +
      30 +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    const compressed = raw.slice(start, start + size);
    const content = method === 8 ? inflateRawSync(compressed) : compressed;
    entries.set(name, decoder.decode(content));
    cursor +=
      46 +
      nameLength +
      view.getUint16(cursor + 30, true) +
      view.getUint16(cursor + 32, true);
  }
  return entries;
}
describe("native report exports", () => {
  it("creates a real XLSX with statistics and complete detail sheets", async () => {
    await exportReport(
      "xlsx",
      reportFixture(),
      document.createElement("div"),
      t,
    );
    const [blob, filename] = download.mock.calls[0]!;
    expect(filename).toMatch(/\.xlsx$/);
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await bytes(blob));
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "overview",
      "details",
      "flow",
      "weekly",
    ]);
    expect(workbook.getWorksheet("details")?.getCell("C2").value).toBe(
      "测试需求",
    );
    expect(workbook.getWorksheet("details")?.getCell("O2").value).toBe(
      "Example Editor",
    );
  });
  it("creates a valid Word package containing Chinese text and editable tables", async () => {
    await exportReport(
      "docx",
      reportFixture(),
      document.createElement("div"),
      t,
    );
    const [blob, filename] = download.mock.calls[0]!;
    expect(filename).toMatch(/\.docx$/);
    const entries = zipEntries(await bytes(blob));
    const documentXml = entries.get("word/document.xml")!;
    expect(documentXml).toContain("测试需求");
    expect(documentXml).toContain("<w:tbl>");
    expect(entries.has("[Content_Types].xml")).toBe(true);
    expect(
      new DOMParser()
        .parseFromString(documentXml, "application/xml")
        .querySelector("parsererror"),
    ).toBeNull();
  });
  it("creates a valid PowerPoint package with statistics and editable details", async () => {
    await exportReport(
      "pptx",
      reportFixture(),
      document.createElement("div"),
      t,
    );
    const [blob, filename] = download.mock.calls[0]!;
    expect(filename).toMatch(/\.pptx$/);
    const entries = zipEntries(await bytes(blob));
    const slides = [...entries].filter(([path]) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(path),
    );
    expect(slides.length).toBeGreaterThan(1);
    expect(slides.some(([, xml]) => xml.includes("测试需求"))).toBe(true);
    for (const [, xml] of slides)
      expect(
        new DOMParser()
          .parseFromString(xml, "application/xml")
          .querySelector("parsererror"),
      ).toBeNull();
  });
  it("escapes user content when generating a PDF print document", async () => {
    const report = reportFixture();
    report.project.name = '<script>alert("x")</script>';
    await exportReport("pdf", report, document.createElement("div"), t);
    const frame = document.querySelector("iframe")!;
    frame.onload = null;
    expect(frame.srcdoc).toContain("&lt;script&gt;");
    expect(frame.srcdoc).not.toContain("<script>");
    expect(frame.srcdoc).toContain("测试需求");
  });
});
