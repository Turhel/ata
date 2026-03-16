import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { useScopeSummaries, ScopeCategory } from "@/hooks/useScopeSummaries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Copy,
  Download,
  Plus,
  Trash2,
  FileText,
  GripVertical,
  RefreshCw,
  Save,
  CheckCircle2,
  MapPin,
  AlertTriangle,
  Route,
  Square,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { useTheme } from "next-themes";

const DEFAULT_CATEGORIES = ["EXTERIOR", "INTERIOR", "DETACHED"];

// Paleta de cores para as categorias - Light mode
const CATEGORY_PALETTE_LIGHT = [
  { name: "blue", bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-700", headerBg: "bg-blue-100/80" },
  { name: "green", bg: "bg-green-50", border: "border-green-500", text: "text-green-700", headerBg: "bg-green-100/80" },
  { name: "orange", bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-800", headerBg: "bg-orange-100/80" },
  { name: "purple", bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-700", headerBg: "bg-purple-100/80" },
  { name: "pink", bg: "bg-pink-50", border: "border-pink-500", text: "text-pink-700", headerBg: "bg-pink-100/80" },
  { name: "teal", bg: "bg-teal-50", border: "border-teal-500", text: "text-teal-700", headerBg: "bg-teal-100/80" },
  { name: "indigo", bg: "bg-indigo-50", border: "border-indigo-500", text: "text-indigo-700", headerBg: "bg-indigo-100/80" },
];

// Paleta de cores para as categorias - Dark mode
const CATEGORY_PALETTE_DARK = [
  { name: "blue", bg: "bg-blue-950/40", border: "border-blue-400", text: "text-blue-300", headerBg: "bg-blue-900/60" },
  { name: "green", bg: "bg-green-950/40", border: "border-green-400", text: "text-green-300", headerBg: "bg-green-900/60" },
  { name: "orange", bg: "bg-orange-950/40", border: "border-orange-400", text: "text-orange-300", headerBg: "bg-orange-900/60" },
  { name: "purple", bg: "bg-purple-950/40", border: "border-purple-400", text: "text-purple-300", headerBg: "bg-purple-900/60" },
  { name: "pink", bg: "bg-pink-950/40", border: "border-pink-400", text: "text-pink-300", headerBg: "bg-pink-900/60" },
  { name: "teal", bg: "bg-teal-950/40", border: "border-teal-400", text: "text-teal-300", headerBg: "bg-teal-900/60" },
  { name: "indigo", bg: "bg-indigo-950/40", border: "border-indigo-400", text: "text-indigo-300", headerBg: "bg-indigo-900/60" },
];

const ScopeGenerator = () => {
  const { createSummary, isCreating, searchOrderData, findExistingSummary } = useScopeSummaries();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const previewRef = useRef<HTMLDivElement>(null);

  // Refs for keyboard navigation
  const addressRef = useRef<HTMLInputElement>(null);
  const lossRef = useRef<HTMLInputElement>(null);
  const routeRef = useRef<HTMLInputElement>(null);
  const newCategoryRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Form state
  const [orderId, setOrderId] = useState("");
  const [address, setAddress] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [routePoint, setRoutePoint] = useState("");
  const [categories, setCategories] = useState<ScopeCategory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [foundInPool, setFoundInPool] = useState<boolean | null>(null);
  const [existingSummary, setExistingSummary] = useState(false);

  // New category input
  const [newCategoryName, setNewCategoryName] = useState("");

  // Estado para controlar os checkboxes da prévia visual
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const getCategoryStyle = (index: number) => {
    const palette = isDark ? CATEGORY_PALETTE_DARK : CATEGORY_PALETTE_LIGHT;
    return palette[index % palette.length];
  };

  // Keyboard navigation handlers
  const handleOrderKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchOrder();
    }
  };

  const handleAddressKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      lossRef.current?.focus();
    }
  };

  const handleLossKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      routeRef.current?.focus();
    }
  };

  const handleRouteKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (categories.length > 0) {
        const firstItemKey = `${0}-${categories[0].items.length}`;
        addItem(0);
        setTimeout(() => {
          itemRefs.current.get(firstItemKey)?.focus();
        }, 50);
      } else {
        newCategoryRef.current?.focus();
      }
    }
  };

  const handleItemKeyDown = (e: KeyboardEvent<HTMLInputElement>, catIndex: number, itemIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem(catIndex);
      setTimeout(() => {
        const newItemKey = `${catIndex}-${itemIndex + 1}`;
        itemRefs.current.get(newItemKey)?.focus();
      }, 50);
    }
  };

  const setItemRef = (key: string, el: HTMLInputElement | null) => {
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  };

  const handleSearchOrder = async () => {
    if (!orderId.trim()) {
      toast.error("Digite o número da ordem");
      return;
    }

    setIsSearching(true);
    setFoundInPool(null);
    setExistingSummary(false);
    setCheckedItems({}); // Limpa os checks ao buscar nova ordem

    try {
      const existing = await findExistingSummary(orderId.trim());
      if (existing) {
        setAddress(existing.address || "");
        setLossReason(existing.loss_reason || "");
        setRoutePoint(existing.route_point || "");
        setCategories(existing.content || []);
        setExistingSummary(true);
        setFoundInPool(true);
        toast.success("Escopo anterior encontrado e carregado!");
        return;
      }

      const poolData = await searchOrderData(orderId.trim());

      if (poolData) {
        const fullAddress = [poolData.address, poolData.city, poolData.state, poolData.zip]
          .filter(Boolean)
          .join(", ");
        setAddress(fullAddress);
        setFoundInPool(true);

        const otype = poolData.otype?.toUpperCase() || "";
        const inferredCategories: ScopeCategory[] = [];

        if (otype.includes("INT") || otype.includes("INTERIOR")) {
          inferredCategories.push({ name: "INTERIOR", items: [] });
        }
        if (otype.includes("EXT") || otype.includes("EXTERIOR")) {
          inferredCategories.push({ name: "EXTERIOR", items: [] });
        }
        if (inferredCategories.length === 0) {
          inferredCategories.push({ name: "EXTERIOR", items: [] });
        }

        setCategories(inferredCategories);
        toast.success("Ordem encontrada no pool!");
      } else {
        setFoundInPool(false);
        toast.warning("Ordem não encontrada no pool. Preencha manualmente.");
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Erro ao buscar ordem");
    } finally {
      setIsSearching(false);
    }
  };

  const addCategory = (name?: string) => {
    const categoryName = (name || newCategoryName).trim().toUpperCase();
    if (!categoryName) return;

    if (categories.some((c) => c.name === categoryName)) {
      toast.error("Categoria já existe");
      return;
    }

    setCategories([...categories, { name: categoryName, items: [] }]);
    setNewCategoryName("");
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const addItem = (categoryIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].items.push("");
    setCategories(newCategories);
  };

  const updateItem = (categoryIndex: number, itemIndex: number, value: string) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].items[itemIndex] = value;
    setCategories(newCategories);
  };

  const removeItem = (categoryIndex: number, itemIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].items = newCategories[categoryIndex].items.filter((_, i) => i !== itemIndex);
    setCategories(newCategories);
  };

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const generatePreviewText = useCallback(() => {
    const lines: string[] = [];

    if (orderId) {
      lines.push(`${orderId}${address ? ` - ${address}` : ""}`);
    }
    if (lossReason) {
      lines.push(`Loss: ${lossReason}`);
    }
    if (routePoint) {
      lines.push(`PONTO ${routePoint}`);
    }

    if (lines.length > 0 && categories.length > 0) {
      lines.push("===================");
    }

    categories.forEach((category) => {
      lines.push("");
      lines.push(`-- ${category.name} --`);
      lines.push("");
      category.items
        .filter((item) => item.trim())
        .forEach((item) => {
          lines.push(item);
        });
    });

    return lines.join("\n");
  }, [orderId, address, lossReason, routePoint, categories]);

  const handleCopyText = () => {
    const text = generatePreviewText();
    if (!text.trim()) {
      toast.error("Nada para copiar");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const handleDownloadImage = async () => {
    if (!previewRef.current) return;

    try {
      const element = previewRef.current;
      const width = element.scrollWidth + 40;
      const height = element.scrollHeight + 40;

      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        width: width,
        height: height,
        style: {
          padding: "40px",
          height: "auto",
          width: "auto",
          maxHeight: "none",
          maxWidth: "none",
          overflow: "visible",
          backgroundImage: "none",
          backgroundColor: "#ffffff",
          color: "#1e293b",
          border: "1px solid #e2e8f0",
          borderRadius: "0px",
          boxShadow: "none",
          transform: "none",
        },
      });

      const link = document.createElement("a");
      link.download = `escopo-${orderId || "resumo"}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Imagem baixada!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Erro ao gerar imagem");
    }
  };

  const handleSave = async () => {
    if (!orderId.trim()) {
      toast.error("Número da ordem é obrigatório");
      return;
    }

    await createSummary({
      order_id: orderId.trim(),
      address: address || null,
      loss_reason: lossReason || null,
      route_point: routePoint || null,
      content: categories,
    });
  };

  const handleClear = () => {
    setOrderId("");
    setAddress("");
    setLossReason("");
    setRoutePoint("");
    setCategories([]);
    setFoundInPool(null);
    setExistingSummary(false);
    setNewCategoryName("");
    setCheckedItems({});
  };

  const hasContent = orderId || address || lossReason || routePoint || categories.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Gerador de Resumos
          </h1>
          <p className="text-muted-foreground">Crie resumos de escopo padronizados para enviar aos inspetores</p>
        </div>

        <Button variant="outline" onClick={handleClear} disabled={!hasContent}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Dados da Ordem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="order-id">Número da Ordem</Label>
                <div className="flex gap-2">
                  <Input
                    id="order-id"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Ex: 352833618"
                    onKeyDown={handleOrderKeyDown}
                    autoFocus
                  />
                  <Button onClick={handleSearchOrder} disabled={isSearching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {foundInPool !== null && (
                  <div className="flex items-center gap-2">
                    {foundInPool ? (
                      <Badge variant="outline" className="text-success border-success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {existingSummary ? "Escopo anterior carregado" : "Encontrado no pool"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning border-warning">
                        Não encontrado - preencha manualmente
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  ref={addressRef}
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Endereço da propriedade"
                  onKeyDown={handleAddressKeyDown}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loss">Loss / Causa</Label>
                  <Input
                    ref={lossRef}
                    id="loss"
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    placeholder="Ex: Windstorm"
                    onKeyDown={handleLossKeyDown}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route">Ponto na Rota</Label>
                  <Input
                    ref={routeRef}
                    id="route"
                    value={routePoint}
                    onChange={(e) => setRoutePoint(e.target.value)}
                    placeholder="Ex: 32"
                    onKeyDown={handleRouteKeyDown}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Categorias e Itens</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {DEFAULT_CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant="outline"
                    size="sm"
                    onClick={() => addCategory(cat)}
                    disabled={categories.some((c) => c.name === cat)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {cat}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  ref={newCategoryRef}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nova categoria..."
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <Button variant="outline" onClick={() => addCategory()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {categories.map((category, catIndex) => {
                  const style = getCategoryStyle(catIndex);
                  return (
                    <div key={catIndex} className={`border rounded-lg p-3 space-y-2 border-l-4 ${style.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className={`font-medium text-sm text-foreground`}>{category.name}</span>
                          <Badge variant="secondary" className={`text-xs border ${style.headerBg} ${style.text}`}>
                            {category.items.filter((i) => i.trim()).length} itens
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => removeCategory(catIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2 pl-6">
                        {category.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex gap-2">
                            <Input
                              ref={(el) => setItemRef(`${catIndex}-${itemIndex}`, el)}
                              value={item}
                              onChange={(e) => updateItem(catIndex, itemIndex, e.target.value)}
                              onKeyDown={(e) => handleItemKeyDown(e, catIndex, itemIndex)}
                              placeholder={`Item ${itemIndex + 1} (Enter = novo)`}
                              className="h-8 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeItem(catIndex, itemIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 text-xs hover:bg-muted"
                          onClick={() => addItem(catIndex)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Item (ou Enter)
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Adicione categorias usando os botões acima
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Column */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Prévia</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyText}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadImage}>
                    <Download className="h-4 w-4 mr-1" />
                    PNG
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Prévia Visual - Suporta Dark/Light mode */}
              <div
                ref={previewRef}
                className={`rounded-xl p-5 min-h-[300px] shadow-inner border ${
                  isDark 
                    ? "bg-slate-900 text-slate-100 border-slate-700" 
                    : "bg-white text-slate-900 border-slate-200"
                }`}
              >
                {hasContent ? (
                  <div className="space-y-4">
                    {/* Header Section */}
                    {(orderId || address) && (
                      <div className={`rounded-lg p-4 border ${
                        isDark 
                          ? "bg-slate-800 border-slate-700" 
                          : "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full p-2 ${isDark ? "bg-blue-900/60" : "bg-blue-100"}`}>
                            <FileText className={`h-5 w-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-lg tracking-wide ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                              {orderId || "Ordem"}
                            </p>
                            {address && (
                              <div className={`flex items-center gap-1.5 mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                <p className="text-sm truncate">{address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info Badges */}
                    {(lossReason || routePoint) && (
                      <div className="flex flex-wrap gap-2">
                        {lossReason && (
                          <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            isDark 
                              ? "bg-orange-900/50 text-orange-300 border-orange-700" 
                              : "bg-orange-50 text-orange-700 border-orange-200"
                          }`}>
                            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                            Loss: {lossReason}
                          </span>
                        )}
                        {routePoint && (
                          <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            isDark 
                              ? "bg-blue-900/50 text-blue-300 border-blue-700" 
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            <Route className="h-3.5 w-3.5 mr-1.5" />
                            Ponto {routePoint}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Divider */}
                    {categories.length > 0 && (orderId || lossReason || routePoint) && (
                      <div className="relative">
                        <Separator className={isDark ? "bg-slate-700" : "bg-slate-200"} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`px-3 text-xs font-medium uppercase tracking-wider ${
                            isDark 
                              ? "bg-slate-900 text-slate-500" 
                              : "bg-white text-slate-400"
                          }`}>
                            Escopo
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Categories */}
                    <div className="space-y-4">
                      {categories.map((category, idx) => {
                        const filledItems = category.items.filter((item) => item.trim());
                        if (filledItems.length === 0 && categories.length > 1) return null;

                        const style = getCategoryStyle(idx);

                        return (
                          <div key={idx} className={`rounded-lg border overflow-hidden ${style.border} ${style.bg}`}>
                            <div className={`px-4 py-2 border-b ${isDark ? "border-slate-700" : "border-slate-100"} ${style.headerBg}`}>
                              <h4 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${style.text}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                {category.name}
                                <span className={`ml-auto text-xs border px-1.5 py-0.5 rounded-full ${
                                  isDark 
                                    ? "bg-slate-800/80 border-slate-600 text-slate-300" 
                                    : "bg-white/80 border-slate-200 text-slate-600"
                                }`}>
                                  {filledItems.length}
                                </span>
                              </h4>
                            </div>
                            <ul className="p-3 space-y-1">
                              {filledItems.length > 0 ? (
                                filledItems.map((item, itemIdx) => {
                                  const itemKey = `${idx}-${itemIdx}`;
                                  const isChecked = checkedItems[itemKey] || false;

                                  // Lógica de Subroom
                                  const subroomMatch = item.match(/^(?:subroom|sub-room):?\s*(.*)/i);
                                  const isSubroom = !!subroomMatch;
                                  const displayText = isSubroom ? subroomMatch[1] : item;

                                  return (
                                    <li
                                      key={itemIdx}
                                      className={`flex items-start gap-2 text-sm p-1 rounded cursor-pointer transition-colors ${
                                        isChecked ? "opacity-60" : ""
                                      } ${
                                        isDark 
                                          ? "text-slate-200 hover:bg-slate-700/50" 
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                      onClick={() => toggleCheck(itemKey)}
                                    >
                                      {/* Indentação para subroom */}
                                      {isSubroom && <span className={`ml-1 select-none ${isDark ? "text-slate-500" : "text-slate-400"}`}>└</span>}

                                      {/* Checkbox Interativo */}
                                      <span className={`mt-0.5 flex-shrink-0 ${
                                        isChecked 
                                          ? "text-emerald-500" 
                                          : isDark ? "text-slate-500" : "text-slate-300"
                                      }`}>
                                        {isChecked ? (
                                          <CheckSquare className="h-4 w-4" />
                                        ) : (
                                          <Square className="h-4 w-4" />
                                        )}
                                      </span>

                                      <span className={isChecked 
                                        ? `line-through ${isDark ? "text-slate-500" : "text-slate-400"}` 
                                        : ""
                                      }>
                                        {displayText}
                                      </span>
                                    </li>
                                  );
                                })
                              ) : (
                                <li className={`text-sm italic px-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                  Adicione itens...
                                </li>
                              )}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center h-full min-h-[250px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    <FileText className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-center">Preencha os dados ao lado para visualizar o resumo</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={handleSave} disabled={!orderId.trim() || isCreating}>
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? "Salvando..." : "Salvar Resumo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScopeGenerator;
