import assert from "node:assert/strict";
import test from "node:test";
import { parseCreatePaymentBatchInput } from "../modules/payments/create-payment-batch.js";

test("parseCreatePaymentBatchInput deduplica orderIds e normaliza notes", () => {
  const result = parseCreatePaymentBatchInput({
    referenceCode: "  LOT-001  ",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    orderIds: ["a", "a", "b", "", null],
    notes: "  observação  "
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.referenceCode, "LOT-001");
  assert.deepEqual(result.orderIds, ["a", "b"]);
  assert.equal(result.notes, "observação");
});

test("parseCreatePaymentBatchInput rejeita intervalo invertido", () => {
  const result = parseCreatePaymentBatchInput({
    referenceCode: "LOT-002",
    periodStart: "2026-04-01",
    periodEnd: "2026-03-31",
    orderIds: ["a"]
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error, "BAD_REQUEST");
  assert.match(result.message, /periodStart/i);
  assert.match(result.message, /periodEnd/i);
});
