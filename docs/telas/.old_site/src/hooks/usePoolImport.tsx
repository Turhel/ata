import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/apiClient";
import { clearCache, readCache, writeCache } from "@/lib/cache";

const HISTORY_CACHE_KEY = "poolImport:history:v1";
const HISTORY_CACHE_TTL_MS = 2 * 60 * 1000;
const BATCH_ORDERS_CACHE_TTL_MS = 60 * 1000;
const WORDER_CHECK_CACHE_TTL_MS = 2 * 60 * 1000;

function batchOrdersCacheKey(batchId: string, page: number, pageSize: number, searchTerm: string) {
  const safeSearch = searchTerm ? encodeURIComponent(searchTerm.slice(0, 64)) : "";
  return `poolImport:batchOrders:v1:${batchId}:${page}:${pageSize}:${safeSearch}`;
}

function worderCheckCacheKey(worder: string) {
  return `poolImport:worderCheck:v1:${worder.trim().toLowerCase()}`;
}

interface ImportResult {
  totalRows: number;
  newOrders: number;
  updatedOrders: number;
  errors: string[];
  batch?: { id: string; source_filename?: string | null; source_type?: string | null; imported_at?: string | null; total_rows?: number | null } | null;
}

interface ImportHistory {
  id: string;
  fileName: string;
  sourceType: string;
  importedAt: string;
  totalRows: number;
}

interface PoolOrderRow {
  worder: string;
  otype: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zip: string | null;
  due_date: string | null;
  inspector_code: string | null;
  client_code: string | null;
  owner_name: string | null;
  status: string | null;
}

export function usePoolImport() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const parseExcelFile = useCallback(async (file: File): Promise<PoolOrderRow[]> => {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const xlsxModule: any = await import("xlsx");
          const XLSX: any = xlsxModule?.utils ? xlsxModule : xlsxModule?.default ?? xlsxModule;

          const data = e.target?.result;
          if (!data) throw new Error("Missing file data");

          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          const mappedData = jsonData
            .map((row: any): PoolOrderRow | null => {
              const normalizeKey = (obj: any, key: string) => {
                const foundKey = Object.keys(obj).find((k) => k.toLowerCase().trim() === key.toLowerCase());
                return foundKey ? obj[foundKey] : null;
              };

              const worder = normalizeKey(row, "worder") || normalizeKey(row, "wo") || normalizeKey(row, "work order");
              const otype = normalizeKey(row, "otype") || normalizeKey(row, "type") || normalizeKey(row, "order type");

              const addr1 =
                normalizeKey(row, "address1") ||
                normalizeKey(row, "address") ||
                normalizeKey(row, "addr") ||
                normalizeKey(row, "property address");
              const addr2 =
                normalizeKey(row, "address2") ||
                normalizeKey(row, "unit") ||
                normalizeKey(row, "apt") ||
                normalizeKey(row, "suite") ||
                "";

              const city = normalizeKey(row, "city") || normalizeKey(row, "cidade");
              const zip =
                normalizeKey(row, "zip") ||
                normalizeKey(row, "zip code") ||
                normalizeKey(row, "zipcode") ||
                normalizeKey(row, "cep");
              const dueDate =
                normalizeKey(row, "duedate") || normalizeKey(row, "due date") || normalizeKey(row, "vencimento");
              const inspectorCode =
                normalizeKey(row, "inspector") ||
                normalizeKey(row, "inspector code") ||
                normalizeKey(row, "inspector_id");
              const clientCode =
                normalizeKey(row, "client") || normalizeKey(row, "client code") || normalizeKey(row, "client_id");
              const status = normalizeKey(row, "status") || normalizeKey(row, "pool status");
              const ownerName =
                normalizeKey(row, "owner") ||
                normalizeKey(row, "owner_name") ||
                normalizeKey(row, "owner name");

              if (!worder || !otype) return null;

              return {
                worder: String(worder).trim(),
                otype: String(otype).trim(),
                address1: addr1 ? String(addr1).trim() : null,
                address2: addr2 ? String(addr2).trim() : null,
                city: city ? String(city).trim() : null,
                zip: zip ? String(zip).trim() : null,
                due_date: dueDate || null,
                inspector_code: inspectorCode ? String(inspectorCode).trim() : null,
                client_code: clientCode ? String(clientCode).trim() : null,
                owner_name: ownerName ? String(ownerName).trim() : null,
                status: status ? String(status).trim() : null,
              };
            })
            .filter((row): row is PoolOrderRow => row !== null);

          resolve(mappedData);
        } catch (error) {
          reject(new Error("Erro ao processar arquivo Excel"));
        }
      };

      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const formatDate = useCallback((dateValue: any): string | null => {
    if (!dateValue) return null;

    if (typeof dateValue === "number") {
      const serialDays = Math.floor(dateValue);
      if (serialDays > 0) {
        const epochMs = Date.UTC(1899, 11, 30);
        const d = new Date(epochMs + serialDays * 24 * 60 * 60 * 1000);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
    }

    const strVal = String(dateValue).trim();
    if (!strVal) return null;

    if (strVal.includes("/")) {
      const parts = strVal.split("/");
      if (parts.length === 3) {
        const [p1, p2, p3Raw] = parts;
        let p3 = p3Raw;
        if (p3.length === 2) p3 = "20" + p3;
        return `${p3}-${p1.padStart(2, "0")}-${p2.padStart(2, "0")}`;
      }
    }

    if (strVal.match(/^\d{4}-\d{2}-\d{2}$/)) return strVal;

    return null;
  }, []);

  const importFile = useCallback(async (file: File): Promise<ImportResult> => {
    setIsProcessing(true);
    setProgress(0);

    const result: ImportResult = {
      totalRows: 0,
      newOrders: 0,
      updatedOrders: 0,
      errors: [],
      batch: null,
    };

    try {
      setProgress(10);
      const rows = await parseExcelFile(file);
      result.totalRows = rows.length;

      if (rows.length === 0) {
        throw new Error("Arquivo vazio ou sem dados vidos");
      }

      const batchId = crypto.randomUUID();
      setProgress(20);

      const uniqueOrdersMap = new Map();
      rows.forEach((r) => uniqueOrdersMap.set(r.worder, r));
      const uniqueOrders = Array.from(uniqueOrdersMap.values());

      const batchRes = await apiFetch<{ ok: true; batch: { id: string } }>(
        { getToken },
        '/api/pool/import-batches',
        {
          bypassFreeze: true,
          allowWhenHidden: true,
          method: 'POST',
          body: JSON.stringify({
            id: batchId,
            source_filename: file.name,
            source_type: 'xlsx',
            imported_at: new Date().toISOString(),
            total_rows: uniqueOrders.length,
            notes: null,
          }),
        }
      );

      const finalBatchId = batchRes.batch?.id ?? batchId;
      result.batch = batchRes.batch ?? null;

      const ordersToProcess = uniqueOrders.map((row) => ({
        worder: row.worder,
        otype: row.otype,
        address1: row.address1,
        address2: row.address2,
        city: row.city,
        zip: row.zip,
        due_date: formatDate(row.due_date),
        inspector_code: row.inspector_code,
        client_code: row.client_code,
        owner_name: row.owner_name,
        status: row.status || 'open',
        batch_id: finalBatchId,
      }));

      setProgress(30);

      const batchSize = 100;
      for (let i = 0; i < ordersToProcess.length; i += batchSize) {
        const batch = ordersToProcess.slice(i, i + batchSize);
        const batchWorders = batch.map((o) => o.worder);

        const existingRes = await apiFetch<{ ok: true; items: { worder: string }[] }>(
          { getToken },
          `/api/pool/orders?worders=${batchWorders.join(',')}`,
          { bypassFreeze: true, allowWhenHidden: true }
        );

        const existingSet = new Set(existingRes.items?.map((e) => e.worder));

        const countUpdates = batch.filter((o) => existingSet.has(o.worder)).length;
        const countInserts = batch.length - countUpdates;

        await apiFetch<{ ok: true; items: any[] }>(
          { getToken },
          '/api/pool/orders',
          { bypassFreeze: true, allowWhenHidden: true, method: 'POST', body: JSON.stringify({ items: batch }) }
        );

        result.updatedOrders += countUpdates;
        result.newOrders += countInserts;

        const currentProgress = 30 + Math.round(((i + batch.length) / ordersToProcess.length) * 70);
        setProgress(currentProgress);
      }

      // NÃ£o faz PATCH pÃ³s-import: `total_rows` jÃ¡ foi gravado no POST e evita erro/egress extra.

      setProgress(100);
      clearCache(HISTORY_CACHE_KEY);
      return result;
    } catch (error: any) {
      result.errors.push(error.message || 'Erro desconhecido');
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [formatDate, getToken, parseExcelFile]);

  const getImportHistory = useCallback(async (): Promise<ImportHistory[]> => {
    const cached = readCache<ImportHistory[]>(HISTORY_CACHE_KEY, HISTORY_CACHE_TTL_MS);
    if (cached) return cached;

    try {
      const res = await apiFetch<{ ok: true; batches: any[] }>(
        { getToken },
        '/api/pool/import-batches'
      );

      const history: ImportHistory[] = [];

      (res.batches || []).slice(0, 15).forEach((batch) => {
        history.push({
          id: batch.id,
          fileName: batch.source_filename || `Lote ${batch.id.substring(0, 8)}...`,
          sourceType: batch.source_type || 'xlsx',
          importedAt: batch.imported_at ? new Date(batch.imported_at).toLocaleString('pt-BR') : '-',
          totalRows: batch.total_rows || 0,
        });
      });

      writeCache(HISTORY_CACHE_KEY, history);
      return history;
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }, [getToken]);

  const getOrdersByBatch = useCallback(async (
    batchId: string,
    page: number = 0,
    pageSize: number = 50,
    searchTerm: string = "",
  ) => {
    const cacheKey = batchOrdersCacheKey(batchId, page, pageSize, searchTerm);
    const cached = readCache<{ data: any[]; totalCount: number }>(cacheKey, BATCH_ORDERS_CACHE_TTL_MS);
    if (cached) return cached;

    try {
      const qs = new URLSearchParams();
      qs.set('batch_id', batchId);
      qs.set('page', String(page));
      qs.set('page_size', String(pageSize));
      if (searchTerm) qs.set('search', searchTerm);

      const res = await apiFetch<{ ok: true; items: any[]; totalCount: number }>(
        { getToken },
        `/api/pool/orders?${qs.toString()}`
      );

      const out = { data: (res.items as any[]) || [], totalCount: res.totalCount ?? 0 };
      writeCache(cacheKey, out);
      return out;
    } catch (error) {
      console.error('Error fetching batch:', error);
      return { data: [], totalCount: 0 };
    }
  }, [getToken]);

  const checkWorderExists = useCallback(async (worder: string) => {
    const key = worderCheckCacheKey(worder);
    const cached = readCache<{ exists: boolean; isFollowUp: boolean }>(key, WORDER_CHECK_CACHE_TTL_MS);
    if (cached) return cached;

    try {
      const poolRes = await apiFetch<{ ok: true; items: any[] }>(
        { getToken },
        `/api/pool/orders?worders=${encodeURIComponent(worder)}`
      );
      const ordersRes = await apiFetch<{ ok: true; items: any[] }>(
        { getToken },
        `/api/orders?external_id=${encodeURIComponent(worder)}&limit=1&archived=false`
      );
      const exists = (poolRes.items || []).length > 0;
      const isFollowUp = exists || (ordersRes.items || []).length > 0;
      const out = { exists, isFollowUp };
      if (exists || isFollowUp) writeCache(key, out);
      return out;
    } catch {
      return { exists: false, isFollowUp: false };
    }
  }, [getToken]);

  const addManualOrder = useCallback(async (orderData: {
    worder: string;
    otype: string;
    address1?: string;
    address2?: string;
    city?: string;
    zip?: string;
    due_date?: string;
    isFollowUp?: boolean;
  }) => {
    try {
      const manualBatchName = `manual-${new Date().toISOString().slice(0, 10)}`;
      const manualBatchId = crypto.randomUUID();
      const manualBatchRes = await apiFetch<{ ok: true; batch: { id: string } }>(
        { getToken },
        '/api/pool/import-batches',
        {
          method: 'POST',
          body: JSON.stringify({
            id: manualBatchId,
            source_filename: manualBatchName,
            source_type: 'manual',
            imported_at: new Date().toISOString(),
            total_rows: 1,
          }),
        }
      );

      const payload = {
        worder: orderData.worder.trim(),
        otype: orderData.otype.trim().toUpperCase(),
        address1: orderData.address1?.trim() || null,
        address2: orderData.address2?.trim() || null,
        city: orderData.city?.trim() || null,
        zip: orderData.zip?.trim() || null,
        due_date: orderData.due_date || null,
        batch_id: manualBatchRes.batch.id,
        status: 'open',
      };

      await apiFetch<{ ok: true; items: any[] }>(
        { getToken },
        '/api/pool/orders',
        { method: 'POST', body: JSON.stringify({ items: [payload] }) }
      );

      clearCache(HISTORY_CACHE_KEY);
      clearCache(worderCheckCacheKey(orderData.worder));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [getToken]);

  return {
    importFile,
    getImportHistory,
    getOrdersByBatch,
    checkWorderExists,
    addManualOrder,
    isProcessing,
    progress,
  };
}
