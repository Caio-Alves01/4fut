// Sorteio de dois times equilibrados, com cada jogador na posição dele.
//
// 1. Se houver mais jogadores que vagas, sorteia quem fica de fora (goleiros têm prioridade
//    para as vagas de goleiro).
// 2. Encaixa os jogadores nas vagas dos dois esquemas ao mesmo tempo, sempre pela vaga que mais
//    combina com a posição de cada um (posição exata > parecida > improvisado), mantendo os
//    dois times com a mesma quantidade de jogadores.
// 3. Equilibra: troca jogadores entre os times enquanto isso aproximar o desempenho dos dois,
//    mas só trocas que não colocam ninguém numa posição pior do que antes.
//
// Um pouco de aleatoriedade no encaixe faz cada clique em "Sortear" gerar times diferentes,
// sem perder o equilíbrio.

export interface JogadorSorteio {
  id: number;
  position: string;
  /** Nota de desempenho (0 a 10) usada para equilibrar; ver desempenhoDoJogador */
  desempenho: number;
}

export interface SorteioResultado {
  time1: (number | null)[];
  time2: (number | null)[];
}

const SETOR: Record<string, string> = {
  GOL: 'GOL',
  ZAG: 'DEF',
  LAT: 'DEF',
  VOL: 'MEI',
  MEI: 'MEI',
  PON: 'ATA',
  ATA: 'ATA',
};

// Posições onde cada jogador rende bem fora da sua (ex: zagueiro joga de lateral ou volante).
const PARECIDAS: Record<string, string[]> = {
  ZAG: ['LAT', 'VOL'],
  LAT: ['ZAG', 'VOL', 'PON'],
  VOL: ['MEI', 'ZAG'],
  MEI: ['VOL', 'PON', 'ATA'],
  PON: ['ATA', 'MEI', 'LAT'],
  ATA: ['PON', 'MEI'],
};

// Quanto "custa" colocar um jogador numa vaga: 0 = posição dele, 1 = parecida, 3 = improvisado,
// 10 = goleiro na linha ou jogador de linha no gol (só em último caso).
function custoVaga(posicaoJogador: string, posicaoVaga: string): number {
  if (posicaoJogador === posicaoVaga) return 0;
  if (posicaoJogador === 'GOL' || posicaoVaga === 'GOL') return 10;
  if (PARECIDAS[posicaoJogador]?.includes(posicaoVaga)) return 1;
  if (SETOR[posicaoJogador] === SETOR[posicaoVaga]) return 1;
  return 3;
}

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[k]] = [copia[k], copia[i]];
  }
  return copia;
}

// Quem ainda não tem partida finalizada entra com a nota inicial do cálculo de desempenho
// (5,0, a mesma base de Services/EstatisticasService.cs no back).
export const NOTA_INICIAL = 5;

export function desempenhoDoJogador(jogador: { nota: number; jogos: number }): number {
  return jogador.jogos > 0 ? jogador.nota : NOTA_INICIAL;
}

// Desempenho médio do time (uma casa decimal). Time vazio = 0.
export function desempenhoMedioDoTime(jogadores: { nota: number; jogos: number }[]): number {
  if (jogadores.length === 0) return 0;
  const media = jogadores.reduce((total, j) => total + desempenhoDoJogador(j), 0) / jogadores.length;
  return Math.round(media * 10) / 10;
}

function escolherParticipantes(jogadores: JogadorSorteio[], vagas: string[]): JogadorSorteio[] {
  if (jogadores.length <= vagas.length) return jogadores;

  const vagasDeGoleiro = vagas.filter((v) => v === 'GOL').length;
  const embaralhados = embaralhar(jogadores);
  const goleiros = embaralhados.filter((j) => j.position === 'GOL').slice(0, vagasDeGoleiro);
  const resto = embaralhados.filter((j) => !goleiros.includes(j));
  return [...goleiros, ...resto.slice(0, vagas.length - goleiros.length)];
}

interface Vaga {
  time: 0 | 1;
  posicao: string;
  jogador: JogadorSorteio | null;
}

export function sortearTimes(jogadores: JogadorSorteio[], vagasTime1: string[], vagasTime2: string[]): SorteioResultado {
  const participantes = escolherParticipantes(jogadores, [...vagasTime1, ...vagasTime2]);

  // Com número ímpar de jogadores, um time (sorteado) fica com um a mais.
  const total = participantes.length;
  const extraNoTime1 = total % 2 === 1 && Math.random() < 0.5 ? 1 : 0;
  const capacidade1 = Math.min(vagasTime1.length, Math.floor(total / 2) + extraNoTime1);
  const capacidade = [capacidade1, Math.min(vagasTime2.length, total - capacidade1)];

  const vagas: Vaga[] = [
    ...vagasTime1.map((posicao) => ({ time: 0 as const, posicao, jogador: null })),
    ...vagasTime2.map((posicao) => ({ time: 1 as const, posicao, jogador: null })),
  ];

  // Encaixe: pares (jogador, vaga) do mais adequado para o menos; entre iguais, o melhor jogador
  // escolhe primeiro, com um ruído para variar a cada sorteio.
  const ruido = new Map(participantes.map((j) => [j.id, Math.random() * 0.8]));
  const pares: { jogador: JogadorSorteio; vaga: Vaga; custo: number }[] = [];
  for (const jogador of participantes) {
    for (const vaga of vagas) {
      pares.push({ jogador, vaga, custo: custoVaga(jogador.position, vaga.posicao) });
    }
  }
  pares.sort((a, b) =>
    a.custo - b.custo
    || (b.jogador.desempenho + ruido.get(b.jogador.id)!) - (a.jogador.desempenho + ruido.get(a.jogador.id)!)
    || Math.random() - 0.5);

  const noTime = [0, 0];
  const encaixados = new Set<number>();
  for (const { jogador, vaga } of pares) {
    if (vaga.jogador || encaixados.has(jogador.id) || noTime[vaga.time] >= capacidade[vaga.time]) continue;
    vaga.jogador = jogador;
    encaixados.add(jogador.id);
    noTime[vaga.time]++;
  }

  // Equilíbrio: troca o par de jogadores (um de cada time) que mais aproxima o desempenho,
  // desde que a troca não piore o encaixe nas posições. Repete até não ter mais melhora.
  const ocupadas = (time: 0 | 1) => vagas.filter((v) => v.time === time && v.jogador);
  const somaDo = (time: 0 | 1) => ocupadas(time).reduce((s, v) => s + v.jogador!.desempenho, 0);

  for (let rodada = 0; rodada < 100; rodada++) {
    const somaA = somaDo(0);
    const somaB = somaDo(1);
    let melhorDiferenca = Math.abs(somaA - somaB);
    let melhor: [Vaga, Vaga] | null = null;

    for (const va of ocupadas(0)) {
      for (const vb of ocupadas(1)) {
        const a = va.jogador!;
        const b = vb.jogador!;
        const custoAntes = custoVaga(a.position, va.posicao) + custoVaga(b.position, vb.posicao);
        const custoDepois = custoVaga(b.position, va.posicao) + custoVaga(a.position, vb.posicao);
        if (custoDepois > custoAntes) continue;

        const diferenca = Math.abs((somaA - a.desempenho + b.desempenho) - (somaB - b.desempenho + a.desempenho));
        if (diferenca < melhorDiferenca) {
          melhorDiferenca = diferenca;
          melhor = [va, vb];
        }
      }
    }

    if (melhor === null) break;
    const [va, vb] = melhor;
    [va.jogador, vb.jogador] = [vb.jogador, va.jogador];
  }

  const ids = (time: 0 | 1) => vagas.filter((v) => v.time === time).map((v) => v.jogador?.id ?? null);
  return { time1: ids(0), time2: ids(1) };
}
