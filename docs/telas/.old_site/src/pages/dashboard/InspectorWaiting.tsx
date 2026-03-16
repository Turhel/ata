import { Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppUser } from "@/hooks/useAppUser";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function InspectorWaiting() {
  const { refetch, isLoading } = useAppUser();
  return (
    <div className="max-w-xl mx-auto w-full">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Aguardando autorização
          </CardTitle>
          <CardDescription>
            Sua conta de inspetor ainda não recebeu um código. Entre em contato com o Master para liberar o acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Assim que o código for atribuído, a tela principal será liberada.
          </div>
          <Button variant="outline" className="w-full" onClick={refetch} disabled={isLoading}>
            {isLoading ? "Verificando…" : "Verificar autorização"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
