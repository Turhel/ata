import { useState } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, Building2 } from "lucide-react";
import { signIn, signUp, useSession } from "../lib/auth-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get("mode") || "signin").toLowerCase();
  const isSignUp = mode === "signup";

  const { data: session, isPending: isSessionLoading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  const toggleMode = () => {
    setSearchParams({ mode: isSignUp ? "signin" : "signup" });
    setError(null);
    setEmail("");
    setPassword("");
    setName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp.email({ email, password, name });
        if (signUpError) {
          setError(signUpError.message || "Erro ao realizar cadastro.");
          return;
        }
        navigate("/");
      } else {
        const { error: signInError } = await signIn.email({ email, password });
        if (signInError) {
          setError(signInError.message || "Credenciais inválidas.");
          return;
        }
        navigate("/");
      }
    } catch {
      setError("Erro de rede ao contactar o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs — fiel ao site antigo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2.5 bg-gradient-to-br from-primary to-sky-500 rounded-xl shadow-[0_4px_14px_hsl(199_89%_32%/0.4)]">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-foreground tracking-tight">ATA Portal</span>
        </div>

        {/* Mode toggle pills */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSearchParams({ mode: "signin" })}
            className={cn(
              "px-5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
              !isSignUp
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ mode: "signup" })}
            className={cn(
              "px-5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
              isSignUp
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            Cadastrar
          </button>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-xl border border-border/50">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">
              {isSignUp ? "Criar uma conta" : "Acessar o sistema"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp
                ? "Insira seus dados para criar um acesso"
                : "Insira suas credenciais corporativas para entrar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nome completo</label>
                <Input
                  required
                  placeholder="João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-border/60 focus:border-primary/60 bg-background/80"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">E-mail corporativo</label>
              <Input
                required
                type="email"
                placeholder="joao@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-border/60 focus:border-primary/60 bg-background/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <Input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-border/60 focus:border-primary/60 bg-background/80"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-primary to-sky-500 hover:from-primary/90 hover:to-sky-500/90 shadow-[0_4px_14px_hsl(199_89%_32%/0.35)] hover:shadow-[0_4px_20px_hsl(199_89%_32%/0.5)] transition-all duration-300"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? "Cadastrar" : "Entrar"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {isSignUp ? "Já tem conta? " : "Não tem conta? "}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              {isSignUp ? "Faça login" : "Criar uma"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
