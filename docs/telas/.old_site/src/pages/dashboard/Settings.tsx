import { useClerk } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  const clerk = useClerk();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Temporariamente desativadas</p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>
            Por enquanto, as configurações do app foram desativadas. Use <strong>Minha Conta</strong> para gerenciar
            perfil, segurança e sessão.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Se você chegou aqui por um link antigo, pode voltar para o dashboard sem perder nada.
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => clerk.openUserProfile()}>
              Minha Conta
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Voltar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

