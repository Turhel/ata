import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import useScrollAnimation from "@/hooks/useScrollAnimation";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

const CTASection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div 
          ref={ref}
          className={`max-w-3xl mx-auto text-center space-y-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            <span className="text-foreground">Pronto para </span>
            <span className="text-gradient">operar sem fricção?</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Acesso restrito a colaboradores. Entre para ver suas ordens, relatórios e ferramentas do dia a dia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignedOut>
              <Button size="lg" className="group glow" asChild>
                <Link to="/auth">
                  Entrar
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button size="lg" className="group glow" asChild>
                <Link to="/dashboard">
                  Abrir Dashboard
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </SignedIn>
            <Button size="lg" variant="outline" className="border-border/50 hover:bg-muted/30" asChild>
              <a href="#fluxo">Ver o fluxo</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
