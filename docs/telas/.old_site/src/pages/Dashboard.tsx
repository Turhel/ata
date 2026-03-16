import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Zap,
  BarChart3,
  Building2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Components ---

interface Metric {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: number;
}

const baseMetrics: Metric[] = [
  {
    id: "orders",
    label: "Ordens Processadas",
    value: 2847,
    icon: FileText,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    trend: 12.5,
  },
  {
    id: "users",
    label: "Usuários Ativos",
    value: 24,
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    trend: 8.3,
  },
  {
    id: "approval",
    label: "Taxa de Aprovação",
    value: 94.2,
    suffix: "%",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    trend: 2.1,
  },
  {
    id: "pending",
    label: "Aguardando Aprovação",
    value: 18,
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    trend: -5.2,
  },
  {
    id: "efficiency",
    label: "Eficiência Média",
    value: 87.5,
    suffix: "%",
    icon: TrendingUp,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    trend: 4.7,
  },
  {
    id: "daily",
    label: "Ordens Hoje",
    value: 156,
    icon: Zap,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    trend: 15.3,
  },
];

const AnimatedNumber = ({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formattedValue = suffix === "%" ? displayValue.toFixed(1) : Math.round(displayValue).toLocaleString("pt-BR");

  return (
    <span>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(baseMetrics);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => {
          const variance = metric.suffix === "%" ? (Math.random() - 0.5) * 0.5 : Math.floor((Math.random() - 0.3) * 5);

          let newValue = metric.value + variance;

          // Keep percentages in valid range
          if (metric.suffix === "%") {
            newValue = Math.max(0, Math.min(100, newValue));
          }

          // Keep positive
          newValue = Math.max(0, newValue);

          return { ...metric, value: newValue };
        }),
      );
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-primary to-blue-600 rounded-lg">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">ATA Management</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Activity className="h-6 w-6 text-primary animate-pulse" />
              <h2 className="text-3xl font-bold">Monitoramento em Tempo Real</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Acompanhe o desempenho do sistema e da equipe com indicadores atualizados automaticamente.
            </p>

            {/* Live indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </div>
              <span className="text-sm text-muted-foreground">
                Atualizado às {lastUpdate.toLocaleTimeString("pt-BR")}
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {metrics.map((metric, index) => (
              <div
                key={metric.id}
                className={cn(
                  "relative group bg-card border border-border/50 rounded-xl p-4 h-full shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1",
                  "animate-fade-in",
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div
                  className={`${metric.bgColor} ${metric.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}
                >
                  <metric.icon className="h-5 w-5" />
                </div>

                {/* Value */}
                <div className="mb-1">
                  <span className="text-2xl font-bold text-foreground">
                    <AnimatedNumber value={metric.value} suffix={metric.suffix} prefix={metric.prefix} />
                  </span>
                </div>

                {/* Label */}
                <p className="text-xs text-muted-foreground leading-tight font-medium">{metric.label}</p>

                {/* Trend */}
                {metric.trend && (
                  <div
                    className={`flex items-center gap-1 mt-2 text-xs font-semibold ${
                      metric.trend > 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    <TrendingUp className={`h-3 w-3 ${metric.trend < 0 ? "rotate-180" : ""}`} />
                    <span>{Math.abs(metric.trend)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div
            className="mt-8 bg-card border border-border/50 rounded-xl p-6 shadow-sm animate-fade-in"
            style={{ animationDelay: "600ms" }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-lg">Resumo do Sistema</span>
              </div>

              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-muted-foreground font-medium">Operacional</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground font-medium">3 alertas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground font-medium">Uptime 99.9%</span>
                </div>
              </div>
            </div>

            {/* Progress bars */}
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">Capacidade do Sistema</span>
                  <span className="font-bold text-foreground">68%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: "68%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">Meta Mensal</span>
                  <span className="font-bold text-foreground">85%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out delay-150"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">SLA Cumprido</span>
                  <span className="font-bold text-foreground">94%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out delay-300"
                    style={{ width: "94%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground bg-muted/30 inline-block px-3 py-1 rounded-full border border-border/50">
              * Dados simulados para demonstração do painel executivo.
            </p>
          </div>

          {/* Action Button */}
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="gap-2 shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/dashboard")}
            >
              Acessar Painel do Assistente
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
