import { useNavigate, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Home, RefreshCw, Building2 } from "lucide-react";

type ErrorPageProps = {
  code?: number;
  title?: string;
  message?: string;
};

function ErrorDisplay({ code = 404, title, message }: ErrorPageProps) {
  const navigate = useNavigate();

  const defaults: Record<number, { title: string; message: string }> = {
    404: {
      title: "Página não encontrada",
      message: "O endereço que você tentou acessar não existe ou foi removido.",
    },
    500: {
      title: "Erro interno do servidor",
      message: "Algo inesperado aconteceu. Nossa equipe já foi notificada.",
    },
    502: {
      title: "Gateway inválido",
      message: "O servidor está temporariamente indisponível. Tente novamente em instantes.",
    },
    403: {
      title: "Acesso negado",
      message: "Você não tem permissão para acessar este recurso.",
    },
  };

  const resolved = defaults[code] ?? defaults[404];
  const displayTitle = title ?? resolved.title;
  const displayMessage = message ?? resolved.message;

  const codeColor =
    code >= 500
      ? "text-rose-500"
      : code === 403
      ? "text-amber-500"
      : "text-primary";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-lg w-full animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="p-2 bg-gradient-to-br from-primary to-sky-500 rounded-xl shadow-[0_4px_14px_hsl(199_89%_32%/0.3)]">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">ATA Portal</span>
        </div>

        {/* Error card */}
        <div className="glass rounded-2xl p-10 border border-border/50 shadow-xl">
          <div className="flex items-center justify-center mb-5">
            <div className={`${code >= 500 ? "bg-rose-500/10" : code === 403 ? "bg-amber-500/10" : "bg-primary/10"} p-4 rounded-2xl`}>
              <AlertTriangle className={`h-8 w-8 ${codeColor}`} />
            </div>
          </div>

          <p className={`text-6xl font-bold mb-3 ${codeColor}`}>{code}</p>
          <h1 className="text-xl font-bold text-foreground mb-2">{displayTitle}</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{displayMessage}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 bg-muted/40 text-sm font-medium text-foreground hover:bg-muted/70 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-sky-500 text-primary-foreground text-sm font-medium shadow-[0_4px_14px_hsl(199_89%_32%/0.35)] hover:shadow-[0_4px_20px_hsl(199_89%_32%/0.5)] transition-all duration-300"
            >
              <Home className="h-4 w-4" />
              Ir para o início
            </button>

            {code >= 500 && (
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border/60 bg-muted/40 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Se o problema persistir, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}

/** Usado como errorElement no React Router */
export function RouterErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <ErrorDisplay code={error.status} message={error.statusText || undefined} />;
  }

  return <ErrorDisplay code={500} />;
}

/** Rota 404 explícita para paths não encontrados */
export function NotFoundPage() {
  return <ErrorDisplay code={404} />;
}

/** Página de erro genérica para ser usada manualmente */
export default function ErrorPage({ code, title, message }: ErrorPageProps) {
  return <ErrorDisplay code={code} title={title} message={message} />;
}
