import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useScrollAnimation from "@/hooks/useScrollAnimation";
import { CheckCircle2, ClipboardList, FileText, LayoutGrid, Shield, Upload, Wallet } from "lucide-react";
import constructionImg2 from "@/assets/construction-2.jpg";
import constructionImg3 from "@/assets/construction-3.jpg";

const steps = [
  {
    icon: Upload,
    title: "Importa / valida",
    desc: "Pool-import e checagens antes de espalhar erro pela operação.",
  },
  {
    icon: ClipboardList,
    title: "Distribui / executa",
    desc: "Assistente processa ordens e resolve exceções sem perder contexto.",
  },
  {
    icon: LayoutGrid,
    title: "Gera escopos",
    desc: "Categorias e itens do jeito do campo, com PDF e lookup por WORDER.",
  },
  {
    icon: FileText,
    title: "Relata o dia",
    desc: "Resumo por inspetor + notas de rota (parou em / pulados).",
  },
  {
    icon: Wallet,
    title: "Fecha pagamentos",
    desc: "Open balance e batches com rastreabilidade e compatibilidade.",
  },
  {
    icon: Shield,
    title: "Audita",
    desc: "Mudanças importantes geram histórico (HOT/COLD) sem egress descontrolado.",
  },
] as const;

const principles = [
  "Cache agressivo no client para reduzir GET",
  "RBAC no backend: browser sem Supabase",
  "Compat quando necessário (sem quebrar fluxo)",
] as const;

const AboutSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: imagesRef, isVisible: imagesVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section id="fluxo" className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div
          ref={headerRef}
          className={`max-w-3xl mx-auto text-center mb-12 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-4">
            <span className="w-2 h-2 bg-accent rounded-full" />
            <span className="text-sm font-medium text-foreground">Fluxo operacional</span>
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-foreground">Do pool ao pagamento,</span>{" "}
            <span className="text-gradient">sem perder rastreio</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Um caminho único, simples de entender e difícil de quebrar — para o assistente trabalhar rápido e para
            admin/master enxergar o que está acontecendo.
          </p>
        </div>

        <div
          ref={gridRef}
          className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-700 ${
            gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {steps.map((s, idx) => (
            <Card key={s.title} className="glass border-border/30 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-foreground">{s.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">Etapa {idx + 1}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {idx + 1}/6
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div
          id="relatorios"
          ref={imagesRef}
          className={`grid lg:grid-cols-2 gap-6 mt-12 transition-all duration-700 ${
            imagesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="relative overflow-hidden rounded-2xl gradient-border">
            <img src={constructionImg2} alt="Operação e controles" className="w-full h-64 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="font-semibold text-foreground">Relatório do dia</p>
              <p className="text-sm text-muted-foreground">
                Parou em, pulados com motivo e resumo por inspetor — pronto para copiar/baixar.
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl gradient-border">
            <img src={constructionImg3} alt="Qualidade e entrega" className="w-full h-64 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="font-semibold text-foreground">Escopos e PDFs</p>
              <p className="text-sm text-muted-foreground">Estrutura “Categoria e Itens” para reduzir erro humano.</p>
            </div>
          </div>
        </div>

        <div id="seguranca" className="mt-12 max-w-4xl mx-auto">
          <div className="glass rounded-2xl border border-border/30 p-6 md:p-8">
            <h3 className="text-xl font-semibold text-foreground mb-3">Princípios do portal</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {principles.map((p) => (
                <div key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

