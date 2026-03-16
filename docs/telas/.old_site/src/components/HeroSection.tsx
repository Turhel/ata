import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, Zap, LayoutGrid, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import useScrollAnimation from "@/hooks/useScrollAnimation";
import constructionImg from "@/assets/construction-1.jpg";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

const HeroSection = () => {
  const { ref: textRef, isVisible: textVisible } = useScrollAnimation();
  const { ref: imageRef, isVisible: imageVisible } = useScrollAnimation();

  const features = [
    "Ordens, escopos e follow-ups no mesmo lugar",
    "Relatório diário/semana/período para assistentes",
    "Pagamentos e histórico com auditoria",
  ];

  return (
    <section id="inicio" className="pt-24 pb-16 md:pt-32 md:pb-24 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div 
            ref={textRef}
            className={`space-y-8 transition-all duration-700 ${
              textVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full">
              <span className="w-2 h-2 bg-primary rounded-full animate-glow-pulse" />
              <span className="text-sm font-medium text-foreground">Portal operacional</span>
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-foreground">Menos atrito no dia a dia.</span>{" "}
              <span className="text-gradient">Mais ordem no fluxo.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl">
              Um portal feito para assistentes, admin e master — com foco em produtividade,
              auditoria e performance (inclusive para reduzir chamadas desnecessárias ao banco).
            </p>

            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li 
                  key={index} 
                  className="flex items-center gap-3"
                  style={{ 
                    transitionDelay: `${index * 100}ms`,
                    opacity: textVisible ? 1 : 0,
                    transform: textVisible ? "translateX(0)" : "translateX(-20px)",
                    transition: "all 0.5s ease-out"
                  }}
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4">
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
                    Abrir dashboard
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </SignedIn>
              <Button variant="outline" size="lg" className="border-border/50 hover:bg-secondary" asChild>
                <a href="#produto">Ver o que tem dentro</a>
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div 
            ref={imageRef}
            className={`relative transition-all duration-700 delay-200 ${
              imageVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-3xl blur-3xl animate-gradient" />
            <div className="relative glass rounded-3xl p-2 gradient-border overflow-hidden">
              <img 
                src={constructionImg} 
                alt="Operação em campo e controle central" 
                className="relative z-0 w-full h-auto rounded-2xl object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 z-20 glass rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Escopos & itens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Pagamentos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Fluxo rápido</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-foreground">Auditoria</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
