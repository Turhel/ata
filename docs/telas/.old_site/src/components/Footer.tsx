import { useTheme } from "next-themes";
import logoBlackFull from "@/assets/logo-black-full.png";
import logoWhiteFull from "@/assets/logo-white-full.png";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

const Footer = () => {
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === "dark" ? logoWhiteFull : logoBlackFull;

  return (
    <footer className="glass border-t border-border/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-3">
            <img src={logo} alt="ATA Management" className="h-12 w-auto" />
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
              Portal interno de operação para inspeções: ordens, escopos, relatórios e pagamentos.
              Acesso restrito a colaboradores.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#produto" className="text-muted-foreground hover:text-primary transition-colors">
                  Produto
                </a>
              </li>
              <li>
                <a href="#fluxo" className="text-muted-foreground hover:text-primary transition-colors">
                  Fluxo
                </a>
              </li>
              <li>
                <a href="#relatorios" className="text-muted-foreground hover:text-primary transition-colors">
                  Relatórios
                </a>
              </li>
              <li>
                <a href="#seguranca" className="text-muted-foreground hover:text-primary transition-colors">
                  Segurança
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Acesso</h3>
            <div className="flex flex-col gap-2 text-sm">
              <SignedOut>
                <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                  Entrar
                </Link>
                <span className="text-muted-foreground/70">Manuais (após login)</span>
              </SignedOut>
              <SignedIn>
                <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Abrir dashboard
                </Link>
                <Link to="/dashboard/manuals" className="text-muted-foreground hover:text-primary transition-colors">
                  Manuais
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 mt-12 pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} ATA Management. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
