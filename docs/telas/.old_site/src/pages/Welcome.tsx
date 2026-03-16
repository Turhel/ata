import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, ClipboardList, MapPin, UserCog } from "lucide-react";

import { apiFetch } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { useAppUser } from "@/hooks/useAppUser";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Persona = "assistant" | "inspector";

export default function Welcome() {
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const { persona, isLoading, refetch } = useAppUser();

  const [selected, setSelected] = useState<Persona | null>(null);
  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [saving, setSaving] = useState(false);

  const hasPersona = useMemo(() => !!persona, [persona]);

  if (!user) return <Navigate to="/auth" replace />;
  if (isLoading) return null;

  if (hasPersona) {
    return <Navigate to="/dashboard" replace />;
  }

  const saveAssistant = async () => {
    setSaving(true);
    try {
      await apiFetch<{ ok: true }>({ getToken }, "/api/onboarding", {
        method: "PATCH",
        bypassFreeze: true,
        body: JSON.stringify({ persona: "assistant" }),
      });
      await refetch();
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const saveInspector = async () => {
    setSaving(true);
    try {
      await apiFetch<{ ok: true }>({ getToken }, "/api/onboarding", {
        method: "PATCH",
        bypassFreeze: true,
        body: JSON.stringify({
          persona: "inspector",
          origin_city: originCity,
          origin_state: originState,
          origin_zip: originZip,
        }),
      });
      await refetch();
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Bem-vindo(a)</h1>
          <p className="text-sm text-muted-foreground">
            Antes de continuar, selecione seu tipo de acesso.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Você é…</CardTitle>
            <CardDescription>
              Essa escolha define sua experiência no app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelected("assistant")}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  selected === "assistant" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Assistente</div>
                    <div className="text-xs text-muted-foreground">
                      Ordens, pagamentos e rotinas operacionais.
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelected("inspector")}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  selected === "inspector" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <UserCog className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Inspetor</div>
                    <div className="text-xs text-muted-foreground">
                      Consulta de escopo e resumo diário com baixo consumo.
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {selected === "assistant" && (
              <div className="pt-2">
                <Button className="w-full" onClick={saveAssistant} disabled={saving}>
                  {saving ? "Salvando…" : "Continuar como Assistente"}
                </Button>
              </div>
            )}

            {selected === "inspector" && (
              <div className="space-y-3 pt-2">
                <Separator />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4" />
                  Origem (para roteamento)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="originCity">Cidade</Label>
                    <Input
                      id="originCity"
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      placeholder="Ex: Orlando"
                      autoComplete="address-level2"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="originState">Estado (UF)</Label>
                    <Input
                      id="originState"
                      value={originState}
                      onChange={(e) => setOriginState(e.target.value.toUpperCase())}
                      placeholder="Ex: FL"
                      maxLength={2}
                      autoComplete="address-level1"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="originZip">ZIP (opcional)</Label>
                    <Input
                      id="originZip"
                      value={originZip}
                      onChange={(e) => setOriginZip(e.target.value)}
                      placeholder="Ex: 32801"
                      autoComplete="postal-code"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <Button className="w-full" onClick={saveInspector} disabled={saving}>
                  {saving ? "Salvando…" : "Continuar como Inspetor"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
