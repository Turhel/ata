import { useEffect, useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Send,
  Copy,
  MapPin,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useInspectors } from "@/hooks/useInspectors";
import { useAuth } from "@/hooks/useAuth";
import { useAppUser } from "@/hooks/useAppUser";
import { useWorkTypes, useWorkTypeRequests } from "@/hooks/useWorkTypes";
import { useDuplicateRequests } from "@/hooks/useDuplicateRequests";
import { format, parseISO } from "date-fns"; // Adicionado parseISO aqui
import { ptBR } from "date-fns/locale";
import { NOT_DONE_REASONS } from "@/lib/not-done-reasons";
import { apiFetch } from "@/lib/apiClient";
import { upsertInspectorRouteNote } from "@/lib/inspectorRouteNotes";
import { Badge } from "@/components/ui/badge";
import { clearCacheByPrefix } from "@/lib/cache";

type AppStatus = "available" | "scheduled" | "submitted" | "followup" | "canceled" | "closed";

interface PoolOrderInfo {
  id: string;
  worder: string;
  otype: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zip: string | null;
  due_date: string | null;
  owner_name?: string | null;
  client_code?: string | null;
  inspector_code?: string | null;
  status?: string | null;
}

interface ParsedOrder {
  id: string;
  rawPath: string;
  orderId: string;
  workType: string;
  status: "ok" | "due_date" | "cancelada" | "nao_feita";
  dueDate?: string;
  dueDateNeedsReview?: boolean;
  isValid: boolean;
  error?: string;
  errorType?: "order_id" | "work_type" | "duplicate";
  duplicateInfo?: {
    originalOrderId: string;
    originalCreatedAt: string;
    originalAssistantId: string | null;
    originalAssistantName: string | null;
    originalWorkType: string;
    originalStatus: string;
  };
  notInPool?: boolean;
  poolInfo?: PoolOrderInfo;
  // New fields for route and not done reason
  notDoneReason?: string;
  customNotDoneReason?: string; // Para quando for "outro"
  // Órfã - ordem existente sem assistente que pode ser assumida
  isOrphan?: boolean;
  orphanOrderId?: string; // ID interno da ordem órfã para UPDATE
  orphanPreviousStatus?: AppStatus | null;
}

// Inspector route point tracking
interface InspectorRouteState {
  [inspectorId: string]: string; // "Ponto X" or "rota_completa"
}

export default function OrdersNew() {
  const queryClient = useQueryClient();
  const [pathsInput, setPathsInput] = useState("");
  const [selectedInspector, setSelectedInspector] = useState("");
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [missingWorkType, setMissingWorkType] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [routePoint, setRoutePoint] = useState<string>("");
  const [customRoutePoint, setCustomRoutePoint] = useState<string>("");
  const [skippedRows, setSkippedRows] = useState<{ id: string; point: string; reason: string }[]>([
    { id: `${Date.now()}_${Math.random()}`, point: "", reason: "" },
  ]);


  // Duplicate request dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateOrderInfo, setDuplicateOrderInfo] = useState<ParsedOrder | null>(null);
  const [duplicateNotes, setDuplicateNotes] = useState("");
  const [isSendingDuplicateRequest, setIsSendingDuplicateRequest] = useState(false);

  // Custom "not done" reason dialog state
  const [customReasonDialogOpen, setCustomReasonDialogOpen] = useState(false);
  const [customReasonOrderId, setCustomReasonOrderId] = useState<string | null>(null);
  const [customReasonText, setCustomReasonText] = useState("");
  const [poolCheckProgress, setPoolCheckProgress] = useState<number | null>(null);
  const [poolCheckLabel, setPoolCheckLabel] = useState<string>("");
  const [pendingHolds, setPendingHolds] = useState<
    Array<{
      id: string;
      raw_path: string;
      order_id: string | null;
      work_type: string | null;
      reason: string | null;
      created_at: string;
      expires_at: string;
    }>
  >([]);
  const [holdsLoading, setHoldsLoading] = useState(false);

  const { toast } = useToast();
  const { inspectors, isLoading: inspectorsLoading } = useInspectors();
  const { user, getToken } = useAuth();
  const { appUser } = useAppUser();
  const assistantId = appUser?.id ?? null;

  // Fetch work types from database
  const { activeWorkTypes, isLoading: workTypesLoading } = useWorkTypes();
  const { createRequest } = useWorkTypeRequests();
  const { createRequest: createDuplicateRequest } = useDuplicateRequests();
  const selectedInspectorInfo = useMemo(
    () => inspectors.find((inspector) => inspector.id === selectedInspector) || null,
    [inspectors, selectedInspector],
  );

  // Build work type categories map from database
  const workTypeCategories = useMemo(() => {
    const categories: Record<string, "regular" | "exterior" | "interior" | "fint"> = {};
    activeWorkTypes.forEach((wt) => {
      categories[wt.code.toUpperCase()] = wt.category;
    });
    return categories;
  }, [activeWorkTypes]);

  const knownWorkTypes = useMemo(() => Object.keys(workTypeCategories), [workTypeCategories]);

  // Helper function to get category from work type
  const getWorkTypeCategory = (workType: string): "regular" | "exterior" | "interior" | "fint" | null => {
    return workTypeCategories[workType.toUpperCase()] || null;
  };

  const getFinalNotDoneReason = (order: ParsedOrder): string | null => {
    if (order.status !== "nao_feita") return null;
    if (order.notDoneReason?.startsWith("outro")) {
      return order.customNotDoneReason || order.notDoneReason.replace("outro: ", "").trim() || "Outro motivo";
    }
    return order.notDoneReason || null;
  };

  const normalizeSkippedPoint = useCallback((raw: string): string => {
    const v = String(raw || "").trim();
    if (!v) return "";
    const onlyDigits = v.match(/^\d+$/);
    if (onlyDigits) return `Ponto ${onlyDigits[0]}`;
    const pontoDigits = v.match(/^ponto\s*(\d+)$/i);
    if (pontoDigits) return `Ponto ${pontoDigits[1]}`;
    return v;
  }, []);

  const skippedEntries = useMemo(() => {
    const entries = skippedRows
      .map((r) => ({
        point: normalizeSkippedPoint(r.point),
        reason: String(r.reason || "").trim(),
      }))
      .filter((e) => e.point || e.reason);

    const valid = entries.filter((e) => e.point && e.reason);

    // De-dup by point (keep last).
    const byPoint = new Map<string, { point: string; reason: string }>();
    valid.forEach((e) => byPoint.set(e.point.toLowerCase(), e));
    return Array.from(byPoint.values());
  }, [skippedRows, normalizeSkippedPoint]);

  const skippedRowsHasErrors = useMemo(() => {
    return skippedRows.some((r) => {
      const point = normalizeSkippedPoint(r.point);
      const reason = String(r.reason || "").trim();
      return (!!point && !reason) || (!point && !!reason);
    });
  }, [skippedRows, normalizeSkippedPoint]);

  const addSkippedRow = useCallback(() => {
    setSkippedRows((rows) => [...rows, { id: `${Date.now()}_${Math.random()}`, point: "", reason: "" }]);
  }, []);

  const removeSkippedRow = useCallback((id: string) => {
    setSkippedRows((rows) => {
      const next = rows.filter((r) => r.id !== id);
      return next.length ? next : [{ id: `${Date.now()}_${Math.random()}`, point: "", reason: "" }];
    });
  }, []);

  const updateSkippedRow = useCallback((id: string, patch: Partial<{ point: string; reason: string }>) => {
    setSkippedRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const getRoutePointValue = () => {
    if (routePoint === "custom") return customRoutePoint.trim();
    if (routePoint === "rota_completa") return "rota completa";
    if (routePoint) return routePoint;
    return "";
  };

  const loadPendingHolds = useCallback(async () => {
    if (!user) return;
    setHoldsLoading(true);
    try {
      await apiFetch<{ ok: true }>(
        { getToken },
        `/api/orders/import-holds?expires_before=${encodeURIComponent(new Date().toISOString())}`,
        { method: "DELETE" }
      );

      const res = await apiFetch<{ ok: true; holds: any[] }>(
        { getToken },
        "/api/orders/import-holds"
      );

      setPendingHolds(res.holds || []);
    } catch (err) {
      console.error("Error loading pending holds:", err);
    } finally {
      setHoldsLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    loadPendingHolds();
  }, [loadPendingHolds]);

  const fetchPoolOrdersBatch = async (orderIds: string[]) => {
    const poolMap = new Map<string, PoolOrderInfo>();
    if (orderIds.length === 0) {
      setPoolCheckProgress(null);
      setPoolCheckLabel("");
      return poolMap;
    }

    const chunkSize = 200;
    const totalChunks = Math.ceil(orderIds.length / chunkSize);
    setPoolCheckProgress(0);
    setPoolCheckLabel(`Validando ordens: 0/${orderIds.length}`);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * chunkSize;
      const chunk = orderIds.slice(start, start + chunkSize);

      const res = await apiFetch<{ ok: true; items: any[] }>(
        { getToken },
        `/api/orders?external_ids=${encodeURIComponent(chunk.join(","))}&limit=${chunk.length}&archived=false`,
        { bypassFreeze: true }
      );

      (res.items || []).forEach((row) => {
        const worder = String(row.external_id ?? "");
        if (!worder) return;
        poolMap.set(worder, {
          id: String(row.id),
          worder,
          otype: String(row.otype ?? ""),
          address1: row.address1 ?? null,
          address2: row.address2 ?? null,
          city: row.city ?? null,
          zip: row.zip ?? null,
          due_date: row.hold_until ?? null,
          owner_name: row.owner_name ?? null,
          client_code: row.client_code ?? null,
          inspector_code: row.inspector_code ?? null,
          status: row.app_status ?? null,
        });
      });

      const processed = Math.min(start + chunk.length, orderIds.length);
      const progress = Math.round((processed / orderIds.length) * 100);
      setPoolCheckProgress(progress);
      setPoolCheckLabel(`Validando ordens: ${processed}/${orderIds.length}`);
    }

    setTimeout(() => {
      setPoolCheckProgress(null);
      setPoolCheckLabel("");
    }, 400);

    return poolMap;
  };

  const enrichParsedOrder = async (order: ParsedOrder, poolMap: Map<string, PoolOrderInfo>) => {
    if (!order.isValid || order.orderId === "N/A") return order;

    const tryLoadExisting = async (archived: boolean) => {
      const existingRes = await apiFetch<{ ok: true; items: any[] }>(
        { getToken },
        `/api/orders?external_id=${encodeURIComponent(order.orderId)}&limit=1&archived=${archived ? "true" : "false"}`,
        { bypassFreeze: true }
      );
      return existingRes.items?.[0] ?? null;
    };

    const existingOrder = (await tryLoadExisting(false)) ?? (await tryLoadExisting(true));

    if (existingOrder) {
      const existingStatus = (existingOrder.app_status ?? null) as AppStatus | null;
      if (existingStatus && ["submitted", "followup", "closed", "canceled"].includes(existingStatus)) {
        return {
          ...order,
          isValid: false,
          error: `Ordem já registrada em ${format(new Date(existingOrder.created_at), "dd/MM/yyyy", { locale: ptBR })}`,
          errorType: "duplicate" as const,
          duplicateInfo: {
            originalOrderId: existingOrder.id,
            originalCreatedAt: existingOrder.created_at,
            originalAssistantId: null,
            originalAssistantName: null,
            originalWorkType: existingOrder.otype ?? order.workType,
            originalStatus: existingStatus,
          },
        };
      }

      const poolInfo = poolMap.get(order.orderId) || null;
      const isClaimable =
        existingStatus === "available" && (existingOrder.assistant_id == null || existingOrder.assistant_id === "");

      return {
        ...order,
        isValid: true,
        isOrphan: isClaimable,
        orphanOrderId: existingOrder.id,
        orphanPreviousStatus: existingStatus,
        poolInfo,
        notInPool: !poolInfo,
      };
    }

    const poolInfo = poolMap.get(order.orderId) || null;
    if (!poolInfo) {
      return {
        ...order,
        notInPool: true,
      };
    }

    return {
      ...order,
      poolInfo,
    };
  };

  const createPoolExceptionFollowup = async (orderId: string, reason: string) => {
    if (!user) return;
    try {
      await apiFetch<{ ok: true; followups: any[] }>(
        { getToken },
        "/api/orders/followups",
        {
          method: "POST",
          body: JSON.stringify({
            items: [
              {
                order_id: orderId,
                kind: "pool_exception",
                status: "open",
                reason,
                notes: null,
              },
            ],
          }),
        }
      );
    } catch (err: any) {
      if (err?.code !== "23505") {
        console.error("Error creating pool exception followup:", err);
      }
    }
  };

  const insertOrderHistoryItems = async (
    items: Array<{
      order_id: string;
      previous_status: AppStatus | null;
      new_status: AppStatus;
      changed_by: string;
      change_reason: string | null;
      details?: any;
    }>,
  ) => {
    if (!user) return;
    if (items.length === 0) return;
    try {
      await apiFetch<{ ok: true; history: any[] }>(
        { getToken },
        "/api/orders/history",
        { method: "POST", body: JSON.stringify({ items }) },
      );
    } catch (err) {
      console.error("Error inserting order history:", err);
    }
  };

  // Parser function for folder paths
  const parseFolderPath = (path: string): ParsedOrder | null => {
    // Get the basename (last folder name)
    const basename = path.split(/[/\\]/).pop()?.trim() || "";
    if (!basename) return null;

    // Regex patterns
    const orderIdPattern = /\b(\d{9})\b/;
    const workTypePattern = /\b([A-Z0-9]+)\b/gi;
    const dueDatePattern = /!DUE\s*DATE\s*(\d{1,2})-(\d{1,2})(?:-(\d{4}))?/i;
    const okPattern = /\bok[ei]?\b/i;
    const cancelledPattern = /!CANCELADA/i;
    const notDonePattern = /!N[ÃA]O\s*FEITA/i;

    const orderIdMatch = basename.match(orderIdPattern);

    // Find work type by matching known types from database
    let foundWorkType: string | null = null;
    const workTypeMatches = basename.match(workTypePattern);
    if (workTypeMatches) {
      for (const match of workTypeMatches) {
        if (knownWorkTypes.includes(match.toUpperCase())) {
          foundWorkType = match.toUpperCase();
          break;
        }
      }
    }

    // Also try to capture unknown work types (2-10 uppercase chars that aren't the order ID)
    let unknownWorkType: string | null = null;
    if (!foundWorkType && workTypeMatches) {
      for (const match of workTypeMatches) {
        const upper = match.toUpperCase();
        if (
          upper.length >= 2 &&
          upper.length <= 10 &&
          !/^\d+$/.test(upper) &&
          upper !== "OK" &&
          upper !== "OKE" &&
          upper !== "DUE" &&
          upper !== "DATE"
        ) {
          unknownWorkType = upper;
          break;
        }
      }
    }

    const dueDateMatch = basename.match(dueDatePattern);

    if (!orderIdMatch) {
      return {
        id: crypto.randomUUID(),
        rawPath: path,
        orderId: "N/A",
        workType: foundWorkType || unknownWorkType || "N/A",
        status: "nao_feita",
        isValid: false,
        error: "ID da ordem nao encontrado (9 digitos)",
        errorType: "order_id",
      };
    }

    if (!foundWorkType) {
      return {
        id: crypto.randomUUID(),
        rawPath: path,
        orderId: orderIdMatch[1],
        workType: unknownWorkType || "N/A",
        status: "nao_feita",
        isValid: false,
        error: unknownWorkType
          ? `Tipo de trabalho "${unknownWorkType}" nao reconhecido`
          : "Tipo de trabalho nao encontrado",
        errorType: "work_type",
      };
    }

    // Determine status - paths WITHOUT "ok" are "não realizada" by default
    let status: ParsedOrder["status"] = "nao_feita"; // Default: não realizada
    let dueDate: string | undefined;
    let dueDateNeedsReview = false;

    if (dueDateMatch) {
      const month = dueDateMatch[1].padStart(2, "0");
      const day = dueDateMatch[2].padStart(2, "0");
      const yearRaw = dueDateMatch[3];
      const year = yearRaw ? Number(yearRaw) : new Date().getFullYear();
      dueDate = `${year}-${month}-${day}`;
      dueDateNeedsReview = !yearRaw;
    }

    if (cancelledPattern.test(basename)) {
      status = "cancelada";
    } else if (notDonePattern.test(basename)) {
      status = "nao_feita";
    } else if (okPattern.test(basename)) {
      status = "ok"; // Only "ok" if explicitly marked
    } else if (dueDateMatch) {
      status = "due_date";
    }
    // If none of the above, stays as 'nao_feita'

    return {
      id: crypto.randomUUID(),
      rawPath: path,
      orderId: orderIdMatch[1],
      workType: foundWorkType,
      status,
      dueDate,
      dueDateNeedsReview,
      isValid: true,
    };
  };

  const handleParse = async () => {
    if (!pathsInput.trim()) {
      toast({
        title: "Erro",
        description: "Cole os caminhos das pastas para processar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Split by newlines and parse each path
      const paths = pathsInput.split("\n").filter((p) => p.trim());
      const parsed = paths.map(parseFolderPath).filter(Boolean) as ParsedOrder[];

      const unknownTypeOrders = parsed.filter((order) => order.errorType === "work_type");
      if (unknownTypeOrders.length > 0 && user) {
        const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        const existingRawPaths = new Set(pendingHolds.map((hold) => hold.raw_path));
        const payload = unknownTypeOrders
          .filter((order) => !existingRawPaths.has(order.rawPath))
          .map((order) => ({
            user_id: user.id,
            raw_path: order.rawPath,
            order_id: order.orderId !== "N/A" ? order.orderId : null,
            work_type: order.workType !== "N/A" ? order.workType : null,
            reason: "work_type_unknown",
            expires_at: expiresAt,
          }));
        if (payload.length > 0) {
          try {
            await apiFetch<{ ok: true; holds: any[] }>(
              { getToken },
              "/api/orders/import-holds",
              { method: "POST", body: JSON.stringify({ items: payload }) }
            );
            loadPendingHolds();
          } catch (err) {
            console.error("Error saving unknown work type holds:", err);
          }
        }
      }

      const poolCandidates = parsed
        .filter((order) => order.isValid && order.orderId !== "N/A")
        .map((order) => order.orderId);
      const poolMap = await fetchPoolOrdersBatch(poolCandidates);

      // Check for duplicates, orphans, and pool validation for valid orders
      const checkedOrders = await Promise.all(
        parsed.map((order) => enrichParsedOrder(order, poolMap))
      );

      setParsedOrders(checkedOrders);

      const validCount = checkedOrders.filter((o) => o.isValid).length;
      const invalidCount = checkedOrders.length - validCount;
      const duplicateCount = checkedOrders.filter((o) => o.errorType === "duplicate").length;
      const notInPoolCount = checkedOrders.filter((o) => o.notInPool).length;

      let description = `${validCount} ordens válidas, ${invalidCount} com erros`;
      if (duplicateCount > 0) {
        description += ` (${duplicateCount} duplicadas)`;
      }
      if (notInPoolCount > 0) {
        description += ` - ${notInPoolCount} não encontradas no pool`;
      }

      toast({
        title: "Processamento concluído",
        description,
      });
    } catch (err) {
      console.error("Error parsing orders:", err);
      toast({
        title: "Erro",
        description: "Erro ao processar os caminhos.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveOrder = (id: string) => {
    setParsedOrders((orders) => orders.filter((o) => o.id !== id));
  };

  const handleRequestDuplicate = (order: ParsedOrder) => {
    setDuplicateOrderInfo(order);
    setDuplicateNotes("");
    setDuplicateDialogOpen(true);
  };

  const handleSendDuplicateRequest = async () => {
    if (!duplicateOrderInfo?.duplicateInfo) return;

    setIsSendingDuplicateRequest(true);

    try {
      await createDuplicateRequest(
        duplicateOrderInfo.orderId,
        duplicateOrderInfo.duplicateInfo.originalOrderId,
        duplicateOrderInfo.duplicateInfo.originalCreatedAt,
        duplicateOrderInfo.duplicateInfo.originalAssistantId,
        duplicateNotes || undefined,
      );

      setDuplicateDialogOpen(false);
      setDuplicateOrderInfo(null);
      setDuplicateNotes("");

      // Remove the order from the list since request was sent
      setParsedOrders((orders) => orders.filter((o) => o.id !== duplicateOrderInfo.id));
    } catch (error) {
      console.error("Error sending duplicate request:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação.",
        variant: "destructive",
      });
    } finally {
      setIsSendingDuplicateRequest(false);
    }
  };

  const handleRequestWorkType = (workType: string) => {
    setMissingWorkType(workType !== "N/A" ? workType : "");
    setRequestDialogOpen(true);
  };

  const handleSendWorkTypeRequest = async () => {
    if (!missingWorkType.trim()) {
      toast({
        title: "Erro",
        description: "Informe o tipo de trabalho.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingRequest(true);

    try {
      // Create a work type request in the database
      await createRequest(missingWorkType.toUpperCase());

      toast({
        title: "Solicitação enviada",
        description: `Solicitação para adicionar o tipo "${missingWorkType.toUpperCase()}" foi enviada para aprovação.`,
      });

      setRequestDialogOpen(false);
      setMissingWorkType("");
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação.",
        variant: "destructive",
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Update not done reason for an order
  const handleUpdateNotDoneReason = (orderId: string, reason: string) => {
    // If "outro" is selected, open dialog for custom input
    if (reason === "outro") {
      setCustomReasonOrderId(orderId);
      setCustomReasonText("");
      setCustomReasonDialogOpen(true);
      return;
    }
    setParsedOrders((orders) => orders.map((o) => (o.id === orderId ? { ...o, notDoneReason: reason } : o)));
  };

  // Confirm custom reason from dialog
  const handleConfirmCustomReason = () => {
    if (!customReasonOrderId || !customReasonText.trim()) return;

    // Store custom reason with "outro:" prefix for identification
    const customReason = `outro: ${customReasonText.trim()}`;
    setParsedOrders((orders) =>
      orders.map((o) =>
        o.id === customReasonOrderId
          ? { ...o, notDoneReason: customReason, customNotDoneReason: customReasonText.trim() }
          : o,
      ),
    );

    setCustomReasonDialogOpen(false);
    setCustomReasonOrderId(null);
    setCustomReasonText("");
  };

  const handleUpdateCustomReason = (orderId: string, customReason: string) => {
    setParsedOrders((orders) =>
      orders.map((o) => (o.id === orderId ? { ...o, customNotDoneReason: customReason } : o)),
    );
  };

  const handleUpdateDueDate = (orderId: string, date?: Date) => {
    setParsedOrders((orders) =>
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              dueDate: date ? format(date, "yyyy-MM-dd") : order.dueDate,
              dueDateNeedsReview: false,
            }
          : order,
      ),
    );
  };

  const handleRemoveHold = async (holdId: string) => {
    try {
      await apiFetch<{ ok: true }>(
        { getToken },
        `/api/orders/import-holds?id=${encodeURIComponent(holdId)}`,
        { method: "DELETE" }
      );
      setPendingHolds((holds) => holds.filter((hold) => hold.id !== holdId));
    } catch (err) {
      console.error("Error removing hold:", err);
    }
  };

  const handleReprocessHold = async (holdId: string, rawPath: string) => {
    const parsed = parseFolderPath(rawPath);
    if (!parsed) return;

    if (!parsed.isValid) {
      toast({
        title: "Tipo ainda nao reconhecido",
        description: "Aguarde o Admin aprovar o tipo para reenviar.",
        variant: "destructive",
      });
      return;
    }

    const poolMap = await fetchPoolOrdersBatch(parsed.orderId !== "N/A" ? [parsed.orderId] : []);
    const checked = await enrichParsedOrder(parsed, poolMap);

    setParsedOrders((orders) => [...orders, checked]);
    await handleRemoveHold(holdId);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "UsuÃ¡rio nÃ£o autenticado.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedInspector) {
      toast({
        title: "Erro",
        description: "Selecione um inspetor antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    const validOrders = parsedOrders.filter((o) => o.isValid);
    if (validOrders.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma ordem válida para enviar.",
        variant: "destructive",
      });
      return;
    }

    // Validate not done reasons for nao_feita orders
    const notDoneOrders = validOrders.filter((o) => o.status === "nao_feita");
    const missingReasons = notDoneOrders.filter((o) => !o.notDoneReason);
    const missingCustomReasons = notDoneOrders.filter(
      (o) => o.notDoneReason === "outro" && (!o.customNotDoneReason || !o.customNotDoneReason.trim()),
    );

    if (missingReasons.length > 0 || missingCustomReasons.length > 0) {
      toast({
        title: "Motivos obrigatórios",
        description: `Informe o motivo para todas as ordem(s) não feita(s).`,
        variant: "destructive",
      });
      return;
    }

    const dueDateReviewNeeded = validOrders.filter(
      (order) => order.dueDateNeedsReview || (order.status === "due_date" && !order.dueDate),
    );
    if (dueDateReviewNeeded.length > 0) {
      toast({
        title: "Revisar due date",
        description: "Revise as datas de due date antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // RESILIÊNCIA: Processa cada ordem individualmente com try/catch
    const effectiveAssistantId = assistantId ?? user.id;

    const results: { success: string[]; failed: { orderId: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    // Audit (best-effort): record only exceptional status changes that have a reason,
    // and send as a single batch to avoid N requests per submission.
    const orderHistoryItems: Array<{
      order_id: string;
      previous_status: AppStatus | null;
      new_status: AppStatus;
      changed_by: string;
      change_reason: string | null;
      details?: any;
    }> = [];

    for (const order of validOrders) {
      try {
        const finalNotDoneReason = getFinalNotDoneReason(order);

        const targetStatus: AppStatus =
          order.status === "ok"
            ? "submitted"
            : order.status === "due_date"
              ? "scheduled"
              : order.status === "cancelada"
                ? "canceled"
                : "available"; // nao_feita -> retorna ao pool

        const changeReason =
          targetStatus === "available"
            ? finalNotDoneReason ?? "nao_feita"
            : targetStatus === "canceled"
              ? "cancelada"
              : null;

        if (!order.orphanOrderId) {
          const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
          await apiFetch<{ ok: true; holds: any[] }>(
            { getToken },
            "/api/orders/import-holds",
            {
              method: "POST",
              body: JSON.stringify({
                items: [
                  {
                    raw_path: order.rawPath,
                    order_id: order.orderId !== "N/A" ? order.orderId : null,
                    work_type: order.workType !== "N/A" ? order.workType : null,
                    reason: "order_not_found",
                    expires_at: expiresAt,
                  },
                ],
              }),
            }
          );
          results.failed.push({ orderId: order.orderId, error: "Ordem nÃ£o encontrada no /api/orders (hold criado)" });
          continue;
        }

        const patchBody: Record<string, any> =
          order.status === "ok"
            ? {
                app_status: "submitted",
                ...(assistantId ? { assistant_id: assistantId } : {}),
                inspector_id: selectedInspector,
                submitted_at: new Date().toISOString(),
                ...(order.dueDate ? { hold_until: order.dueDate, due_date_confirmed: true } : {}),
              }
            : order.status === "due_date"
              ? {
                  app_status: "scheduled",
                  ...(assistantId ? { assistant_id: assistantId } : {}),
                  inspector_id: selectedInspector,
                  hold_until: order.dueDate || null,
                  ...(order.dueDate ? { due_date_confirmed: true } : {}),
                }
              : order.status === "cancelada"
                ? {
                    app_status: "canceled",
                    inspector_id: selectedInspector,
                    auto_clear_possession: true,
                  }
                : {
                    app_status: "available",
                    assistant_id: effectiveAssistantId,
                    inspector_id: selectedInspector,
                  };

        await apiFetch<{ ok: true; order: any }>(
          { getToken },
          `/api/orders/${order.orphanOrderId}`,
          { method: "PATCH", body: JSON.stringify(patchBody) }
        );

        if (order.orphanPreviousStatus !== targetStatus && changeReason) {
          orderHistoryItems.push({
            order_id: order.orphanOrderId,
            previous_status: order.orphanPreviousStatus ?? null,
            new_status: targetStatus,
            changed_by: appUser?.id ?? user.id,
            change_reason: changeReason,
            details: { source: "orders_new" },
          });
        }

        if (targetStatus === "available" && changeReason) {
          await createPoolExceptionFollowup(order.orphanOrderId, changeReason);
        }

        if (order.notInPool) {
          await createPoolExceptionFollowup(order.orphanOrderId, "Ordem fora do pool");
        }

        results.success.push(order.orderId);
      } catch (err: any) {
        console.error(`Error processing order ${order.orderId}:`, err);
        results.failed.push({
          orderId: order.orderId,
          error: err?.message || "Erro desconhecido",
        });
      }
    }

    if (orderHistoryItems.length > 0) {
      await insertOrderHistoryItems(orderHistoryItems);
    }

    if (results.success.length > 0 && selectedInspector && user) {
      const routePointValue = getRoutePointValue();
      if (skippedRowsHasErrors) {
        toast({
          title: "Pontos pulados incompletos",
          description: "Se você informar um ponto pulado, o motivo é obrigatório (e vice-versa).",
          variant: "destructive",
        });
        return;
      }

      const skippedPointsValue = skippedEntries.length ? skippedEntries.map((e) => e.point).join(", ") : "";
      const skippedReasonValue = skippedEntries.length ? skippedEntries.map((e) => `${e.point} | ${e.reason}`).join("\n") : "";
      if (routePointValue || skippedPointsValue || skippedReasonValue) {
        const reportDate = format(new Date(), "yyyy-MM-dd");
        upsertInspectorRouteNote({
          assistantId: user.id,
          reportDate,
          inspectorId: selectedInspector,
          inspectorCode: selectedInspectorInfo?.code || null,
          stopPoint: routePointValue || null,
          skippedPoints: skippedPointsValue || null,
          skippedReason: skippedReasonValue || null,
          skippedEntries: skippedEntries.length ? skippedEntries : null,
        });
      }
    }

    // RELATÓRIO FINAL
    const orphanCount = validOrders.filter((o) => o.isOrphan).length;
    const notInPoolSubmitted = results.success.filter(
      (id) => validOrders.find((o) => o.orderId === id)?.notInPool,
    ).length;

    if (results.failed.length > 0 && results.success.length > 0) {
      // Sucesso parcial
      toast({
        title: "Processamento parcial",
        description: `Sucesso: ${results.success.length} ordens. Falhas: ${results.failed.length} ordens (${results.failed.map((f) => f.orderId).join(", ")})`,
        variant: "destructive",
      });
    } else if (results.failed.length > 0) {
      // Tudo falhou
      toast({
        title: "Erro ao enviar ordens",
        description: `Todas as ${results.failed.length} ordens falharam. Verifique o console.`,
        variant: "destructive",
      });
    } else {
      // Sucesso total
      let message = `${results.success.length} ordens enviadas com sucesso.`;
      if (orphanCount > 0) {
        message += ` ${orphanCount} ordem(ns) assumidas do pool.`;
      }
      if (notInPoolSubmitted > 0) {
        message += ` ${notInPoolSubmitted} com alerta para verificação.`;
      }

      toast({
        title: "Sucesso!",
        description: message,
      });
    }

    // Reset form only if at least some succeeded
    if (results.success.length > 0) {
      // Ordem mudou: limpar caches anti-egress para evitar UX "stale" em Dashboard/Sidebar/RelatÃ³rios.
      clearCacheByPrefix("orders:");
      clearCacheByPrefix("followups:");
      clearCacheByPrefix("order-stats:");
      queryClient.removeQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-summary"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });

      setPathsInput("");
      setParsedOrders([]);
      setSelectedInspector("");
      setRoutePoint("");
      setCustomRoutePoint("");
      setSkippedRows([{ id: `${Date.now()}_${Math.random()}`, point: "", reason: "" }]);
    }

    setIsSubmitting(false);
  };

  const getStatusBadge = (status: ParsedOrder["status"]) => {
    const config = {
      ok: { label: "Enviada", style: "bg-chart-4/20 text-chart-4" },
      due_date: { label: "Agendada", style: "bg-chart-5/20 text-chart-5" },
      cancelada: { label: "Cancelada", style: "bg-muted text-muted-foreground" },
      nao_feita: { label: "Não Realizada", style: "bg-destructive/20 text-destructive" },
    };
    const { label, style } = config[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>{label}</span>;
  };

  const validCount = parsedOrders.filter((o) => o.isValid).length;
  const invalidCount = parsedOrders.length - validCount;
  const notDoneWithoutReason = parsedOrders.filter(
    (o) =>
      o.isValid &&
      o.status === "nao_feita" &&
      (!o.notDoneReason || (o.notDoneReason === "outro" && !o.customNotDoneReason)),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inserir Ordens</h1>
        <p className="text-muted-foreground">Cole os caminhos das pastas para processar em lote</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Caminhos das Pastas
            </CardTitle>
            <CardDescription>Cole os caminhos completos das pastas (um por linha)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Inspetor</Label>
              <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o inspetor" />
                </SelectTrigger>
                <SelectContent>
                  {inspectorsLoading ? (
                    <SelectItem value="loading" disabled>
                      Carregando...
                    </SelectItem>
                  ) : inspectors.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      Nenhum inspetor disponível
                    </SelectItem>
                  ) : (
                    inspectors.map((inspector) => (
                      <SelectItem key={inspector.id} value={inspector.id}>
                        {inspector.name} ({inspector.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Route Point Section */}
            {selectedInspector && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Ponto de Parada do Inspetor
                </Label>
                <Select value={routePoint} onValueChange={setRoutePoint}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ponto ou rota completa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rota_completa">✅ Rota Completa</SelectItem>
                    <SelectItem value="custom">Digite o Ponto...</SelectItem>
                  </SelectContent>
                </Select>
                  {routePoint === "custom" && (
                    <Input
                      placeholder="Digite o ponto (ex: Ponto 15, Rua X...)"
                      value={customRoutePoint}
                      onChange={(e) => setCustomRoutePoint(e.target.value)}
                      className="mt-2"
                    />
                  )}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground">Pontos pulados (opcional)</Label>
                      <Button type="button" variant="outline" size="sm" className="h-7" onClick={addSkippedRow}>
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      <div className="grid grid-cols-[110px_1fr_32px] gap-2 items-center text-[10px] text-muted-foreground px-1">
                        <span>Ponto pulado</span>
                        <span>Motivo</span>
                        <span />
                      </div>

                      {skippedRows.map((row, index) => {
                        const point = normalizeSkippedPoint(row.point);
                        const reason = String(row.reason || "").trim();
                        const hasPoint = !!point;
                        const hasReason = !!reason;
                        const pointError = !hasPoint && hasReason;
                        const reasonError = hasPoint && !hasReason;
                        const showError = pointError || reasonError;

                        return (
                          <div key={row.id} className="grid gap-1">
                            <div className="grid grid-cols-[110px_1fr_32px] gap-2 items-start">
                              <Input
                                placeholder="14"
                                value={row.point}
                                onChange={(e) => updateSkippedRow(row.id, { point: e.target.value })}
                                className={`h-8 text-xs ${pointError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              />
                              <Input
                                placeholder="Motivo (obrigatório se houver ponto)"
                                value={row.reason}
                                onChange={(e) => updateSkippedRow(row.id, { reason: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addSkippedRow();
                                  }
                                }}
                                className={`h-8 text-xs ${reasonError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeSkippedRow(row.id)}
                                disabled={skippedRows.length === 1 && !row.point.trim() && !row.reason.trim()}
                                aria-label={`Remover linha ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {showError && (
                              <p className="text-[10px] text-destructive px-1">
                                {reasonError
                                  ? "Motivo obrigatório quando houver ponto pulado."
                                  : "Informe o ponto pulado quando houver motivo."}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {skippedEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {skippedEntries.slice(0, 30).map((e) => (
                            <Badge key={e.point} variant="secondary" className="text-[10px] px-2 py-0.5">
                              {e.point}
                            </Badge>
                          ))}
                          {skippedEntries.length > 30 && (
                            <span className="text-[10px] text-muted-foreground">+{skippedEntries.length - 30}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Dica: se digitar só números, vira automaticamente “Ponto X”.
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">Informe onde o inspetor parou na rota (opcional)</p>
                </div>
              )}

            <div className="space-y-2">
              <Label>Caminhos das Pastas</Label>
              <Textarea
                placeholder={`Cole os caminhos aqui, por exemplo:
C:\\Users\\Assistant\\Work\\ok 351653566 - FI
C:\\Users\\Assistant\\Work\\!DUE DATE 10-11 - 351655566 - DF
C:\\Users\\Assistant\\Work\\351593408 - FI (sem "ok" = não realizada)`}
                value={pathsInput}
                onChange={(e) => setPathsInput(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Suporta até 200+ caminhos por vez</p>
            </div>

            <Button onClick={handleParse} className="w-full" disabled={isProcessing || !pathsInput.trim()}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Processar Caminhos
                </>
              )}
            </Button>
            {poolCheckProgress !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{poolCheckLabel || "Validando pool..."}</span>
                  <span>{poolCheckProgress}%</span>
                </div>
                <Progress value={poolCheckProgress} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Tags reconhecidas:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <code className="bg-muted px-1 rounded">ok</code> ou{" "}
                  <code className="bg-muted px-1 rounded">oke</code> - Trabalho enviado
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">!DUE DATE MM-DD</code> - Trabalho agendado
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">!CANCELADA</code> - Ordem cancelada
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">!NÃO FEITA</code> - Não realizada
                </li>
                <li className="text-chart-5">
                  <strong>Sem tag "ok"</strong> - Considerada não realizada
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Tipos de trabalho:</h4>
              <ul className="grid grid-cols-2 gap-1 text-muted-foreground">
                <li>
                  <strong>Regular:</strong> FI, DF, FINC, FIB...
                </li>
                <li>
                  <strong>Exterior:</strong> E3RNN, E11CNN...
                </li>
                <li>
                  <strong>Interior:</strong> ILIS, SIFINT...
                </li>
                <li>
                  <strong>FINT:</strong> FINT, USFINT...
                </li>
              </ul>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-muted-foreground">
                <strong>Dica:</strong> O sistema extrai automaticamente o ID da ordem (9 dígitos) e o tipo de trabalho
                do nome da pasta.
              </p>
              <p className="text-muted-foreground">
                <strong>Tipo não reconhecido?</strong> Clique em "Solicitar" na tabela para pedir ao admin a inclusão do
                tipo.
              </p>
              <p className="text-muted-foreground">
                <strong>Não feitas:</strong> Ordens sem "ok" precisam de um motivo selecionado na tabela.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {(holdsLoading || pendingHolds.length > 0) && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Ordens pendentes</CardTitle>
            <CardDescription>Tipos aguardando aprovacao para reenviar</CardDescription>
          </CardHeader>
          <CardContent>
            {holdsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando pendencias...
              </div>
            ) : pendingHolds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pendencia encontrada.</p>
            ) : (
              <div className="space-y-2">
                {pendingHolds.map((hold) => (
                  <div
                    key={hold.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {hold.order_id || "Sem ID"}{" "}
                        {hold.work_type ? <span className="text-muted-foreground">• {hold.work_type}</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expira em {format(parseISO(hold.expires_at), "dd/MM/yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[420px]">
                        {hold.raw_path}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleReprocessHold(hold.id, hold.raw_path)}>
                        Reprocessar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveHold(hold.id)}
                        aria-label="Remover pendencia"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parsed Results */}
      {parsedOrders.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ordens Processadas</CardTitle>
                <CardDescription>
                  <span className="text-chart-4">{validCount} válidas</span>
                  {invalidCount > 0 && <span className="text-destructive ml-2">{invalidCount} com erros</span>}
                  {notDoneWithoutReason > 0 && (
                    <span className="text-chart-5 ml-2">{notDoneWithoutReason} aguardando motivo</span>
                  )}
                </CardDescription>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || validCount === 0 || !selectedInspector || notDoneWithoutReason > 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Enviar {validCount} Ordens
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50 max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID da Ordem</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Motivo (Não Feita)</TableHead>
                    <TableHead>Validação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className={
                        !order.isValid
                          ? "bg-destructive/5"
                          : order.isOrphan
                            ? "bg-emerald-500/10"
                            : order.notInPool
                              ? "bg-chart-5/10"
                              : ""
                      }
                    >
                      <TableCell className="font-mono">{order.orderId}</TableCell>
                      <TableCell>{order.workType}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {order.dueDate ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span>
                                {order.dueDate ? format(parseISO(order.dueDate), "dd/MM/yyyy") : "-"}
                              </span>
                              {order.dueDateNeedsReview && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Revise a due date para confirmar o ano correto.</p>
                                      {order.dueDate && (
                                        <p>Data detectada: {format(parseISO(order.dueDate), "dd/MM/yyyy")}</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                                  Ajustar
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="p-2">
                                <CalendarComponent
                                  mode="single"
                                  selected={order.dueDate ? parseISO(order.dueDate) : undefined}
                                  onSelect={(date) => date && handleUpdateDueDate(order.id, date)}
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.isValid && order.status === "nao_feita" ? (
                          order.notDoneReason?.startsWith("outro:") ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs max-w-[160px] truncate"
                                title={order.notDoneReason.replace("outro: ", "")}
                              >
                                {order.notDoneReason.replace("outro: ", "")}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setCustomReasonOrderId(order.id);
                                  setCustomReasonText(order.notDoneReason?.replace("outro: ", "") || "");
                                  setCustomReasonDialogOpen(true);
                                }}
                              >
                                <FileText className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <Select
                                value={order.notDoneReason || ""}
                                onValueChange={(val) => handleUpdateNotDoneReason(order.id, val)}
                              >
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                  <SelectValue placeholder="Selecione o motivo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {NOT_DONE_REASONS.map((reason) => (
                                    <SelectItem key={reason.value} value={reason.value}>
                                      {reason.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {/* INPUT PARA OUTRO MOTIVO SELECIONADO NA LISTA */}
                              {order.notDoneReason === "outro" && (
                                <Input
                                  placeholder="Digite o motivo..."
                                  value={order.customNotDoneReason || ""}
                                  onChange={(e) => handleUpdateCustomReason(order.id, e.target.value)}
                                  className="h-8 text-xs"
                                />
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.isValid ? (
                          order.isOrphan ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">Assumir do Pool</span>
                            </span>
                          ) : order.notInPool ? (
                            <span className="flex items-center gap-1 text-chart-5">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Não encontrada no pool</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-chart-4">
                              <CheckCircle2 className="h-4 w-4" />
                              Válida
                            </span>
                          )
                        ) : (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {order.error}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!order.isValid && order.errorType === "work_type" && (
                            <Button variant="outline" size="sm" onClick={() => handleRequestWorkType(order.workType)}>
                              <Send className="h-3 w-3 mr-1" />
                              Solicitar
                            </Button>
                          )}
                          {!order.isValid && order.errorType === "duplicate" && (
                            <Button variant="outline" size="sm" onClick={() => handleRequestDuplicate(order)}>
                              <Copy className="h-3 w-3 mr-1" />
                              Solicitar Revisão
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveOrder(order.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Work Type Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Novo Tipo de Trabalho</DialogTitle>
            <DialogDescription>
              Envie uma solicitação aos administradores para adicionar um novo tipo de trabalho ao sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workType">Tipo de Trabalho</Label>
              <Input
                id="workType"
                value={missingWorkType}
                onChange={(e) => setMissingWorkType(e.target.value.toUpperCase())}
                placeholder="Ex: WFFIF"
                className="uppercase"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Informe o código do tipo de trabalho que não foi reconhecido.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendWorkTypeRequest} disabled={isSendingRequest || !missingWorkType.trim()}>
              {isSendingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Order Request Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Revisão de Ordem Duplicada</DialogTitle>
            <DialogDescription>
              Esta ordem já foi registrada no sistema. Envie uma solicitação para revisão administrativa.
            </DialogDescription>
          </DialogHeader>
          {duplicateOrderInfo?.duplicateInfo && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <h4 className="font-medium text-sm">Informações da ordem original:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID da Ordem:</span>
                    <p className="font-mono font-medium">{duplicateOrderInfo.orderId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo de Trabalho:</span>
                    <p className="font-medium">{duplicateOrderInfo.duplicateInfo.originalWorkType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium">{duplicateOrderInfo.duplicateInfo.originalStatus}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mesmo assistente:</span>
                    <p className="font-medium">
                      {!appUser?.id || !duplicateOrderInfo.duplicateInfo.originalAssistantId
                        ? "-"
                        : duplicateOrderInfo.duplicateInfo.originalAssistantId === appUser.id
                          ? "Sim"
                          : "Não"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registrada em:</span>
                    <p className="font-medium">
                      {format(new Date(duplicateOrderInfo.duplicateInfo.originalCreatedAt), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Por:</span>
                    <p className="font-medium">
                      {duplicateOrderInfo.duplicateInfo.originalAssistantName || "Não identificado"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duplicateNotes">Observações (opcional)</Label>
                <Textarea
                  id="duplicateNotes"
                  value={duplicateNotes}
                  onChange={(e) => setDuplicateNotes(e.target.value)}
                  placeholder="Ex: Ordem voltou para refazer e o assistente original não respondeu..."
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Informe o motivo pelo qual você está tentando registrar esta ordem novamente.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendDuplicateRequest} disabled={isSendingDuplicateRequest}>
              {isSendingDuplicateRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Not Done Reason Dialog */}
      <Dialog open={customReasonDialogOpen} onOpenChange={setCustomReasonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Informar Motivo</DialogTitle>
            <DialogDescription>Descreva o motivo pelo qual a ordem não foi realizada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customReason">Motivo</Label>
              <Textarea
                id="customReason"
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                placeholder="Ex: Cliente viajou e não tinha ninguém para atender..."
                className="min-h-[100px]"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomReasonDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmCustomReason} disabled={!customReasonText.trim()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
