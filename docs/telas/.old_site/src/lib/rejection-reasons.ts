// Common reasons for order follow-up (can be redone by assistant)
export const FOLLOW_UP_REASONS = [
  { value: "ocupacao_insuficiente", label: "Prova de ocupação insuficiente" },
  { value: "ftv_incorreto", label: "FTV incorreto" },
  { value: "ocupacao_incoerente", label: "Ocupação incoerente (vazia/ocupada)" },
  { value: "qualidade_fotos", label: "Qualidade das fotos (reflexo/sol/enquadramento, etc.)" },
  { value: "fotos_faltando", label: "Fotos faltando ou cortando a casa (precisa aparecer completa)" },
  { value: "endereco_errado", label: "Endereço errado" },
  { value: "ilis_incorreta", label: "Porcentagem ILIS incorreta" },
  { value: "outro", label: "Outros" },
] as const;

// Common reasons for permanent rejection (returns to pool)
export const REJECTION_REASONS = [
  { value: "nao_conseguiu_followup", label: "Rejeição: não conseguiu responder ao follow-up" },
  { value: "cancelada", label: "Cancelada" },
  { value: "ordem_duplicada", label: "Ordem duplicada" },
  { value: "fraude_suspeita", label: "Suspeita de fraude" },
  { value: "outro", label: "Outros" },
] as const;

export type FollowUpReasonValue = (typeof FOLLOW_UP_REASONS)[number]["value"];
export type RejectionReasonValue = (typeof REJECTION_REASONS)[number]["value"];

export function getReasonLabel(value: string, type: "followup" | "rejection"): string {
  const reasons = type === "followup" ? FOLLOW_UP_REASONS : REJECTION_REASONS;
  const found = reasons.find((r) => r.value === value);
  return found?.label || value;
}

