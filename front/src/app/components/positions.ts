// Catálogo padronizado de posições (tabela `Posicoes` do modelo lógico final).
// Compartilhado entre JogadoresPage e EscalacaoCartolaPage para que o campo
// `posicao` use sempre a mesma sigla (GOL/ZAG/LAT/VOL/MEI/ATA/PON), mesmo que
// a UI continue exibindo o nome por extenso.

export interface Posicao {
  sigla: string;
  nome: string;
  ordem: number;
}

export const POSICOES: Posicao[] = [
  { sigla: 'GOL', nome: 'Goleiro', ordem: 1 },
  { sigla: 'ZAG', nome: 'Zagueiro', ordem: 2 },
  { sigla: 'LAT', nome: 'Lateral', ordem: 3 },
  { sigla: 'VOL', nome: 'Volante', ordem: 4 },
  { sigla: 'MEI', nome: 'Meio-campo', ordem: 5 },
  { sigla: 'ATA', nome: 'Atacante', ordem: 6 },
  { sigla: 'PON', nome: 'Ponta', ordem: 7 },
];

export function posicaoNome(sigla: string): string {
  return POSICOES.find((p) => p.sigla === sigla)?.nome ?? sigla;
}

export function posicaoCorClasses(sigla: string): string {
  if (sigla === 'GOL') return 'bg-yellow-100 text-yellow-800';
  if (sigla === 'ZAG' || sigla === 'LAT') return 'bg-blue-100 text-blue-800';
  if (sigla === 'VOL' || sigla === 'MEI') return 'bg-green-100 text-green-800';
  return 'bg-red-100 text-red-800';
}
