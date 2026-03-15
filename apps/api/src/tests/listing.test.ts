import assert from "node:assert/strict";
import test from "node:test";
import { buildListMeta, normalizeSearch, parsePagination } from "../lib/listing.js";

test("parsePagination aplica defaults e limite máximo", () => {
  assert.deepEqual(parsePagination({}, { pageSize: 20, maxPageSize: 100 }), {
    page: 1,
    pageSize: 20,
    offset: 0
  });

  assert.deepEqual(parsePagination({ page: "3", pageSize: "500" }, { pageSize: 20, maxPageSize: 100 }), {
    page: 3,
    pageSize: 100,
    offset: 200
  });
});

test("buildListMeta calcula totalPages com mínimo de 1", () => {
  assert.deepEqual(buildListMeta({ page: 1, pageSize: 20, total: 0 }), {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });

  assert.deepEqual(buildListMeta({ page: 2, pageSize: 10, total: 25 }), {
    page: 2,
    pageSize: 10,
    total: 25,
    totalPages: 3
  });
});

test("normalizeSearch remove espaços e descarta vazio", () => {
  assert.equal(normalizeSearch("  abc  "), "abc");
  assert.equal(normalizeSearch("   "), null);
  assert.equal(normalizeSearch(undefined), null);
});
