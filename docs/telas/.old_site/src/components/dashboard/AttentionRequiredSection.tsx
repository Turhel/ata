import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CalendarClock, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import type { Order } from "@/hooks/useOrders";

interface AttentionRequiredSectionProps {
  dueDateOrders: Order[];
  returnedOrders: Order[];
  onConfirmOrder: (order: Order, type: "duedate" | "redo") => void;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  try {
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "-";
  }
};

// Animated counter component
function AnimatedBadge({ count, variant = "secondary" }: { count: number; variant?: "secondary" | "destructive" }) {
  const [displayCount, setDisplayCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (prevCountRef.current !== count) {
      setIsAnimating(true);

      // Animate the number transition
      const duration = 300;
      const startCount = prevCountRef.current;
      const diff = count - startCount;
      const startTime = performance.now();

      const animateCount = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuad = 1 - (1 - progress) * (1 - progress);
        const currentValue = Math.round(startCount + diff * easeOutQuad);

        setDisplayCount(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animateCount);
        } else {
          setDisplayCount(count);
          setTimeout(() => setIsAnimating(false), 200);
        }
      };

      requestAnimationFrame(animateCount);
      prevCountRef.current = count;
    }
  }, [count]);

  if (count === 0) return null;

  return (
    <Badge
      variant={variant}
      className={`ml-1.5 h-5 px-1.5 text-[10px] transition-all duration-200 ${
        isAnimating ? "scale-125 ring-2 ring-primary/30" : ""
      }`}
    >
      {displayCount}
    </Badge>
  );
}

export function AttentionRequiredSection({
  dueDateOrders,
  returnedOrders,
  onConfirmOrder,
}: AttentionRequiredSectionProps) {
  const assistantReturnedOrders = returnedOrders;
  const needsAttentionCount = dueDateOrders.length + assistantReturnedOrders.length;

  if (needsAttentionCount === 0) return null;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-destructive/10 via-destructive/5 to-background border-destructive/30 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          Atencao Necessaria
          <AnimatedBadge count={needsAttentionCount} variant="destructive" />
        </CardTitle>
        <CardDescription>Ordens que precisam de confirmacao</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="prazos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3 bg-destructive/5 border border-destructive/20 p-1">
            <TabsTrigger value="prazos" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-destructive">
              <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
              Prazos
              <AnimatedBadge count={dueDateOrders.length} />
            </TabsTrigger>
            <TabsTrigger value="pendencias" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-destructive">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Pendências
              <AnimatedBadge count={assistantReturnedOrders.length} />
            </TabsTrigger>
          </TabsList>

          {/* Prazos Tab */}
          <TabsContent value="prazos" className="mt-0">
            <ScrollArea className="h-[280px] pr-3">
              {dueDateOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                  <CalendarClock className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma ordem com prazo pendente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dueDateOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background border border-chart-5/30 hover:border-chart-5/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{order.external_id}</p>
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 bg-chart-5/10 border-chart-5/30 text-chart-5"
                          >
                            {order.work_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Prazo: {formatDate(order.due_date)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        className="shrink-0 ml-2"
                        onClick={() => onConfirmOrder(order, "duedate")}
                      >
                        Confirmar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {dueDateOrders.length > 0 && (
              <div className="pt-2 border-t mt-2">
                <Button variant="link" asChild className="p-0 h-auto text-xs">
                  <Link to="/dashboard/orders">Ver todas ({dueDateOrders.length}) →</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Pendências Tab */}
          <TabsContent value="pendencias" className="mt-0">
            <ScrollArea className="h-[280px] pr-3">
              {assistantReturnedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                  <RotateCcw className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma ordem retornada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assistantReturnedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background border border-chart-3/30 hover:border-chart-3/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{order.external_id}</p>
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 bg-chart-3/10 border-chart-3/30 text-chart-3"
                          >
                            Retornada
                          </Badge>
                        </div>
                        <p className="text-xs text-destructive truncate">
                          {order.audit_reason || "Sem motivo especificado"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 ml-2"
                        onClick={() => onConfirmOrder(order, "redo")}
                      >
                        Atualizar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {assistantReturnedOrders.length > 0 && (
              <div className="pt-2 border-t mt-2">
                <Button variant="link" asChild className="p-0 h-auto text-xs">
                  <Link to="/dashboard/orders">Ver todas ({assistantReturnedOrders.length}) &rarr;</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
