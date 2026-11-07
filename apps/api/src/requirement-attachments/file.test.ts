import { describe, it, expect } from "vite-plus/test";
import { validateExcel, MAX_EXCEL_BYTES } from "./file";
describe("Excel attachment limits", () => {
  it("rejects mismatched extensions, empty and oversized files", () => {
    expect(() => validateExcel("data.xlsx", new Uint8Array())).toThrow();
    expect(() =>
      validateExcel("data.xlsx", new Uint8Array(MAX_EXCEL_BYTES + 1)),
    ).toThrow();
    expect(() =>
      validateExcel("data.exe", new Uint8Array([0x50, 0x4b, 3, 4])),
    ).toThrow();
    expect(() =>
      validateExcel("data.xls", new Uint8Array([0x50, 0x4b, 3, 4])),
    ).toThrow();
  });
});
