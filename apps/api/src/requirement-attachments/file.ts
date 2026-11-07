import { HTTPException } from "hono/http-exception";
export const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
export function validateExcel(filename: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_EXCEL_BYTES)
    throw new HTTPException(400, {
      message: "Excel files must be between 1 byte and 10 MiB",
    });
  const extension = filename.toLowerCase().split(".").at(-1);
  const xlsx =
    extension === "xlsx" &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 3 &&
    bytes[3] === 4;
  const xls =
    extension === "xls" &&
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every(
      (value, index) => bytes[index] === value,
    );
  if (!xlsx && !xls)
    throw new HTTPException(400, {
      message: "Upload a valid .xlsx or .xls Excel file",
    });
  return xlsx
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/vnd.ms-excel";
}
