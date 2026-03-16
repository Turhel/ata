import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { ArrowLeft } from "lucide-react";

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = (searchParams.get("mode") || "signin").toLowerCase();
  const isSignUp = mode === "signup";

  const toggleMode = useMemo(
    () => (isSignUp ? "signin" : "signup"),
    [isSignUp]
  );

  // Configuração de aparência para esconder o footer dos componentes do Clerk
  const clerkAppearance = {
    elements: {
      footer: "hidden", // Oculta todo o rodapé, incluindo os links de navegação
      // Se preferir ocultar apenas o link, pode usar footerAction: "hidden"
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        <div className="flex items-center justify-center gap-3 mb-6 text-sm">
          <button
            type="button"
            onClick={() => setSearchParams({ mode: "signin" })}
            className={`px-3 py-1 rounded-full border ${
              !isSignUp ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ mode: "signup" })}
            className={`px-3 py-1 rounded-full border ${
              isSignUp ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"
            }`}
          >
            Cadastrar
          </button>
        </div>

        <div className="flex justify-center">
          {isSignUp ? (
            <SignUp
              path="/auth"
              routing="path"
              signInUrl="/auth?mode=signin"
              afterSignInUrl="/dashboard"
              afterSignUpUrl="/dashboard"
              appearance={clerkAppearance}
            />
          ) : (
            <SignIn
              path="/auth"
              routing="path"
              signUpUrl="/auth?mode=signup"
              afterSignInUrl="/dashboard"
              appearance={clerkAppearance}
            />
          )}
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setSearchParams({ mode: toggleMode })}
          >
            {isSignUp ? "Entrar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
