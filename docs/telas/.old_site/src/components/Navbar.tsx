import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import ThemeToggle from "./ThemeToggle";
import logoBlackFull from "@/assets/logo-black-full.png";
import logoWhiteFull from "@/assets/logo-white-full.png";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const isLanding = location.pathname === "/";

  const logo = resolvedTheme === "dark" ? logoWhiteFull : logoBlackFull;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className={`flex items-center justify-between ${isLanding ? "h-[72px]" : "h-16"}`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="ATA Management" className={isLanding ? "h-12 w-auto" : "h-10 w-auto"} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#produto" className="text-muted-foreground hover:text-foreground transition-colors">
              Produto
            </a>
            <a href="#fluxo" className="text-muted-foreground hover:text-foreground transition-colors">
              Fluxo
            </a>
            <a href="#relatorios" className="text-muted-foreground hover:text-foreground transition-colors">
              Relatórios
            </a>
            <a href="#seguranca" className="text-muted-foreground hover:text-foreground transition-colors">
              Segurança
            </a>
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <SignedOut>
              <Button size="sm" className="glow" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button size="sm" className="glow" asChild>
                <Link to="/dashboard">Abrir Dashboard</Link>
              </Button>
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/30 animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-4">
              <a href="#produto" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Produto
              </a>
              <a href="#fluxo" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Fluxo
              </a>
              <a href="#relatorios" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Relatórios
              </a>
              <a href="#seguranca" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                Segurança
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border/30">
                <SignedOut>
                  <Button className="w-full glow" asChild>
                    <Link to="/auth">Entrar</Link>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button className="w-full glow" asChild>
                    <Link to="/dashboard">Abrir Dashboard</Link>
                  </Button>
                </SignedIn>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
