import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { parsePoolXlsxBuffer } from "../modules/orders/parse-pool-xlsx.js";

test("parsePoolXlsxBuffer converte workbook em payload normalizado", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      STATUS: "Assigned",
      WORDER: "ABC123",
      INSPECTOR: "ATAVEND07",
      CLIENT: "CLIENTE_X",
      NAME: "Nome Teste",
      ADDRESS1: "Rua X",
      ADDRESS2: "Apto 1",
      CITY: "Fortaleza",
      STATE: "CE",
      ZIP: "60000-000",
      OTYPE: "TIPO_Y",
      DUEDATE: "03/15/2026",
      "START DATE": "03/13/2026",
      RUSH: "Y",
      VACANT: "N"
    }
  ]);

  XLSX.utils.book_append_sheet(workbook, sheet, "Pool");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const result = parsePoolXlsxBuffer({ buffer, fileName: "pool.xlsx" });

  assert.equal(result.fileName, "pool.xlsx");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.externalOrderCode, "ABC123");
  assert.equal(result.items[0]?.sourceStatus, "Assigned");
  assert.equal(result.items[0]?.availableDate, "2026-03-13");
  assert.equal(result.items[0]?.deadlineDate, "2026-03-15");
  assert.equal(result.items[0]?.isRush, true);
  assert.equal(result.items[0]?.isVacant, false);
  assert.equal(result.items[0]?.sourceInspectorAccountCode, "ATAVEND07");
  assert.equal(result.items[0]?.sourceClientCode, "CLIENTE_X");
  assert.equal(result.items[0]?.sourceWorkTypeCode, "TIPO_Y");
});
