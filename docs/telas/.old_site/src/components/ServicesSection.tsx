import { ClipboardList, Upload, LayoutGrid, FileText, Wallet, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useScrollAnimation from "@/hooks/useScrollAnimation";

const services = [
  {
    icon: Upload,
    title: "Pool & Importação",
    description: "Importe lotes, trate duplicadas e mantenha rastreabilidade sem depender de planilhas."
  },
  {
    icon: ClipboardList,
    title: "Ordens (assistente)",
    description: "Fluxo rápido para criar, corrigir, devolver ao pool e acompanhar o status real da operação."
  },
  {
    icon: LayoutGrid,
    title: "Escopos",
    description: "Categorias e itens com geração de PDF e lookup por WORDER — pensado para reduzir egress."
  },
  {
    icon: FileText,
    title: "Relatórios",
    description: "Diário, semanal e por período — com resumo por inspetor e notas de rota no fim do dia."
  },
  {
    icon: Wallet,
    title: "Pagamentos",
    description: "Open balance, batches e histórico com compatibilidade e auditoria quando necessário."
  },
  {
    icon: Shield,
    title: "Segurança & Controle",
    description: "Acesso via Clerk + RBAC no backend. Browser não fala com Supabase diretamente."
  }
];

const ServicesSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section id="produto" className="py-16 md:py-24 relative">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-4">
            <span className="w-2 h-2 bg-primary rounded-full" />
            <span className="text-sm font-medium text-foreground">O que o portal resolve</span>
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-foreground">Um fluxo completo para </span>
            <span className="text-gradient">operar sem fricção</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Não é “site institucional”. É painel de operação: ordens, escopos, relatórios, pagamentos e auditoria — com foco em performance.
          </p>
        </div>

        <div ref={cardsRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className={`group glass border-border/30 hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 ${
                cardsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-accent group-hover:scale-110 transition-all duration-300">
                  <service.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <CardTitle className="text-foreground">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground text-base">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
