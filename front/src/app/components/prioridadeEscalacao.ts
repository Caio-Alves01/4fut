// Prioridade na escalação: quem entra primeiro quando há mais jogadores presentes que vagas.
//
// 1º  Mensalista sem pendência (mensalidade do mês paga, nada em aberto)
// 2º  Avulso sem pendência
// 3º  Quem tem alguma pendência (mensalidade atrasada, avulso ou cartão não pago)
//
// Dentro do mesmo grupo, vem primeiro quem tem mais presença nas partidas da pelada.
// Os dados vêm do back (GET /jogadores; ver Services/EstatisticasService.CalcularPrioridadeAsync).
// Na página pública esses campos não vêm, e aí todo mundo fica no mesmo grupo.

export interface DadosPrioridade {
  tipo?: string;
  /** % das partidas finalizadas em que compareceu; null = ainda sem partida para medir */
  presencaPercentual?: number | null;
  /** Só para mensalista ativo em pelada que cobra mensalidade */
  mensalidadeEmDia?: boolean | null;
  mensalidadesEmAberto?: number;
  /** Avulsos e cartões não pagos */
  outrasPendencias?: number;
}

export type GrupoPrioridade = 1 | 2 | 3;

export function temPendencia(j: DadosPrioridade): boolean {
  return (j.mensalidadesEmAberto ?? 0) > 0 || (j.outrasPendencias ?? 0) > 0 || j.mensalidadeEmDia === false;
}

export function grupoPrioridade(j: DadosPrioridade): GrupoPrioridade {
  if (temPendencia(j)) return 3;
  if (j.tipo === 'avulso') return 2;
  return 1;
}

// Quem ainda não tem partida medida entra no meio (50%), nem na frente nem atrás de todo mundo.
const PRESENCA_SEM_HISTORICO = 50;

/** Quanto maior, mais prioridade. Grupo pesa mais que qualquer diferença de presença. */
export function pontuacaoPrioridade(j: DadosPrioridade): number {
  return (4 - grupoPrioridade(j)) * 1000 + (j.presencaPercentual ?? PRESENCA_SEM_HISTORICO);
}

/** Para ordenar: mais prioridade primeiro. */
export function compararPrioridade(a: DadosPrioridade, b: DadosPrioridade): number {
  return pontuacaoPrioridade(b) - pontuacaoPrioridade(a);
}

export function descricaoPendencia(j: DadosPrioridade): string | null {
  const partes: string[] = [];
  const meses = j.mensalidadesEmAberto ?? 0;
  if (meses > 0) partes.push(meses === 1 ? '1 mensalidade em aberto' : `${meses} mensalidades em aberto`);
  const outras = j.outrasPendencias ?? 0;
  if (outras > 0) partes.push(outras === 1 ? '1 cobrança em aberto' : `${outras} cobranças em aberto`);
  return partes.length > 0 ? partes.join(' · ') : null;
}

export const ROTULO_GRUPO: Record<GrupoPrioridade, { curto: string; classes: string; explicacao: string }> = {
  1: { curto: 'Em dia', classes: 'bg-green-100 text-green-800 border-green-200', explicacao: 'Mensalista em dia' },
  2: { curto: 'Avulso', classes: 'bg-slate-100 text-slate-700 border-slate-200', explicacao: 'Avulso sem pendências' },
  3: { curto: 'Pendente', classes: 'bg-red-100 text-red-800 border-red-200', explicacao: 'Com pagamento em aberto' },
};
