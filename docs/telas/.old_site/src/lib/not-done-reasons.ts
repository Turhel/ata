// Reasons why an order was not completed (não feita)
export const NOT_DONE_REASONS = [
  { value: 'morador_ausente', label: 'Morador não estava/recusou' },
  { value: 'acesso_bloqueado', label: 'Acesso bloqueado' },
  { value: 'imovel_nao_encontrado', label: 'Imóvel não encontrado' },
  { value: 'endereco_incorreto', label: 'Endereço incorreto' },
  { value: 'area_risco', label: 'Área de risco' },
  { value: 'portao_fechado', label: 'Portão fechado sem resposta' },
  { value: 'cachorro_solto', label: 'Cachorro solto' },
  { value: 'chuva_intensa', label: 'Chuva intensa' },
  { value: 'horario_limite', label: 'Passou do horário limite' },
  { value: 'outro', label: 'Outro motivo' },
] as const;

export type NotDoneReasonValue = typeof NOT_DONE_REASONS[number]['value'];

export function getNotDoneReasonLabel(value: string): string {
  const found = NOT_DONE_REASONS.find(r => r.value === value);
  return found?.label || value;
}
