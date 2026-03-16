import { useState } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2, Link as LinkIcon, Building2 } from "lucide-react";
import { signIn, signUp, useSession } from "../lib/auth-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get("mode") || "signin").toLowerCase();
  const isSignUp = mode === "signup";

  const { data: session, isPending: isSessionLoading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Only used for SignUp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/40">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Se já estiver logado, redireciona pro dashboard
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
        const { error: signUpError } = await signUp.email({
          email,
          password,
          name: name,
        });
        if (signUpError) {
          setError(signUpError.message || "Erro ao realizar cadastro.");
          return;
        }
        // Se sucesso no cadastro, redireciona ou faz login automático
        navigate("/");
      } else {
        const { error: signInError } = await signIn.email({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message || "Credenciais inválidas.");
          return;
        }
        // Se sucesso no login
        navigate("/");
      }
    } catch (err: any) {
      setError("Erro de rede ao contactar o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-50/40">
      {/* Background blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">ATA Portal</span>
          </div>
        </div>

        <Card className="border-gray-200/60 shadow-lg shadow-gray-200/40">
          <CardHeader>
            <CardTitle>{isSignUp ? "Criar  Conta" : "Acessar Sistema"}</CardTitle>
            <CardDescription>
              {isSignUp ? "Insira seus dados para criar um acesso" : "Insira suas credenciais corporativas para entrar"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                  {error}
                </div>
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nome completo</label>
                  <Input
                    required
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">E-mail corporativo</label>
                <Input
                  required
                  type="email"
                  placeholder="joao@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Senha secreta</label>
                <Input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? "Cadastrar" : "Entrar"}
              </Button>

              <div className="text-center text-sm text-gray-500">
                {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-medium text-blue-600 hover:underline underline-offset-4"
                >
                  {isSignUp ? "Faça login" : "Criar uma"}
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
