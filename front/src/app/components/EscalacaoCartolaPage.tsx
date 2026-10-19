import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Trophy,
  Users,
  Shuffle,
  AlertCircle,
  UserPlus,
  X,
  Footprints,
  LayoutGrid,
  List,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ArrowLeftRight,
  Scale
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { sortearTimes, desempenhoDoJogador, desempenhoMedioDoTime } from './sorteioTimes';
import { ScrollArea } from './ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { posicaoNome, posicaoCorClasses } from './positions';

// Jogador da pelada (vem de GET /peladas/{id}/jogadores).
export interface EscalacaoJogador {
  id: number;
  name: string;
  position: string;
  number: number;
  /** Nota de desempenho (0 a 10) calculada pelas partidas; equilibra o sorteio dos times */
  nota: number;
  /** Partidas finalizadas que o jogador jogou (sem nenhuma, ainda não tem nota) */
  jogos: number;
}

// Evento da partida (vem de GET /partidas/{id}/detalhes).
export interface EscalacaoEvento {
  tipo: 'gol' | 'amarelo' | 'vermelho' | 'substituicao';
  /** Na substituição, quem saiu */
  jogadorId: number;
  assistJogadorId: number | null;
  /** Só na substituição: quem entrou */
  entraJogadorId: number | null;
  time: 1 | 2;
}

export type TipoEvento = EscalacaoEvento['tipo'];

type NumeroTime = 1 | 2;

// Escalação de um time como o back guarda (GET detalhes / PUT escalacao).
export interface EscalacaoTime {
  time: NumeroTime;
  esquema: string;
  jogadores: (number | null)[];
}

interface MatchStats {
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
}

interface FormationSlot {
  x: number;
  y: number;
  position: string;
}

interface FormationPosition extends FormationSlot {
  playerId: number | null;
}

interface EscalacaoCartolaPageProps {
  /** Jogadores que podem ser escalados (só os marcados como presentes). */
  jogadores: EscalacaoJogador[];
  eventos: EscalacaoEvento[];
  /** Escalação salva no back (carregada junto com os detalhes da partida). */
  escalacaoSalva: EscalacaoTime[];
  /** Salva a escalação no back. Devolve true se deu certo. */
  onSalvarEscalacao: (escalacao: EscalacaoTime[]) => Promise<boolean>;
  /** Registra o evento no back. Devolve true se deu certo. */
  onRegistrarEvento: (evento: {
    tipo: TipoEvento;
    jogadorId: number;
    assistJogadorId: number | null;
    entraJogadorId?: number | null;
    time: NumeroTime;
  }) => Promise<boolean>;
}

const ITEM_TYPE = 'PLAYER';

// Nota de desempenho para mostrar; sem partida finalizada ainda não há nota.
function formatarNota(jogador: { nota: number; jogos: number }): string {
  return jogador.jogos > 0 ? jogador.nota.toFixed(1) : '—';
}

// Esquemas táticos com 11 posições cada (x/y em % do campo). A ordem é sempre
// goleiro → defesa → meio → ataque, assim ao trocar de esquema cada jogador
// continua no mesmo "índice" e cai numa posição parecida.
const FORMACOES = {
  '4-4-2': [
    { x: 50, y: 90, position: 'GOL' },
    { x: 15, y: 72, position: 'LAT' },
    { x: 38, y: 74, position: 'ZAG' },
    { x: 62, y: 74, position: 'ZAG' },
    { x: 85, y: 72, position: 'LAT' },
    { x: 15, y: 48, position: 'MEI' },
    { x: 38, y: 52, position: 'VOL' },
    { x: 62, y: 52, position: 'VOL' },
    { x: 85, y: 48, position: 'MEI' },
    { x: 35, y: 22, position: 'ATA' },
    { x: 65, y: 22, position: 'ATA' },
  ],
  '4-3-3': [
    { x: 50, y: 90, position: 'GOL' },
    { x: 15, y: 72, position: 'LAT' },
    { x: 38, y: 74, position: 'ZAG' },
    { x: 62, y: 74, position: 'ZAG' },
    { x: 85, y: 72, position: 'LAT' },
    { x: 25, y: 48, position: 'MEI' },
    { x: 50, y: 54, position: 'VOL' },
    { x: 75, y: 48, position: 'MEI' },
    { x: 18, y: 25, position: 'PON' },
    { x: 50, y: 18, position: 'ATA' },
    { x: 82, y: 25, position: 'PON' },
  ],
  '3-5-2': [
    { x: 50, y: 90, position: 'GOL' },
    { x: 25, y: 74, position: 'ZAG' },
    { x: 50, y: 76, position: 'ZAG' },
    { x: 75, y: 74, position: 'ZAG' },
    { x: 12, y: 50, position: 'LAT' },
    { x: 33, y: 56, position: 'VOL' },
    { x: 50, y: 44, position: 'MEI' },
    { x: 67, y: 56, position: 'VOL' },
    { x: 88, y: 50, position: 'LAT' },
    { x: 35, y: 22, position: 'ATA' },
    { x: 65, y: 22, position: 'ATA' },
  ],
  '4-2-3-1': [
    { x: 50, y: 90, position: 'GOL' },
    { x: 15, y: 74, position: 'LAT' },
    { x: 38, y: 76, position: 'ZAG' },
    { x: 62, y: 76, position: 'ZAG' },
    { x: 85, y: 74, position: 'LAT' },
    { x: 35, y: 58, position: 'VOL' },
    { x: 65, y: 58, position: 'VOL' },
    { x: 18, y: 38, position: 'PON' },
    { x: 50, y: 38, position: 'MEI' },
    { x: 82, y: 38, position: 'PON' },
    { x: 50, y: 17, position: 'ATA' },
  ],
} satisfies Record<string, FormationSlot[]>;

type Esquema = keyof typeof FORMACOES;

const ESQUEMAS = Object.keys(FORMACOES) as Esquema[];
const TOTAL_POSICOES = 11;
const SEM_JOGADORES: (number | null)[] = Array(TOTAL_POSICOES).fill(null);
const TIMES: NumeroTime[] = [1, 2];

const SEM_STATS: MatchStats = { gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0 };

// Tempo sem mexer na escalação antes de salvar no back.
const ATRASO_SALVAR_MS = 600;

function ehEsquema(valor: string): valor is Esquema {
  return valor in FORMACOES;
}

// Converte o que veio do back no estado da tela (esquema e as 11 posições de cada time).
function estadoInicial(salva: EscalacaoTime[]) {
  const esquemas: Record<NumeroTime, Esquema> = { 1: '4-4-2', 2: '4-4-2' };
  const escalados: Record<NumeroTime, (number | null)[]> = { 1: SEM_JOGADORES, 2: SEM_JOGADORES };
  for (const t of salva) {
    if (ehEsquema(t.esquema)) esquemas[t.time] = t.esquema;
    escalados[t.time] = SEM_JOGADORES.map((_, i) => t.jogadores[i] ?? null);
  }
  return { esquemas, escalados };
}

function paraEscalacao(esquemas: Record<NumeroTime, Esquema>, escalados: Record<NumeroTime, (number | null)[]>): EscalacaoTime[] {
  return TIMES.map((time) => ({ time, esquema: esquemas[time], jogadores: escalados[time] }));
}

// Cor do círculo do jogador de acordo com a posição. Usada tanto na lista
// de disponíveis quanto nas posições do campo, por isso fica fora dos
// componentes (uma função só, sem duplicar a mesma lógica duas vezes).
function getPositionColor(position: string): string {
  if (position === 'GOL') {
    return 'bg-yellow-500';
  }
  if (position === 'ZAG' || position === 'LAT') {
    return 'bg-blue-500';
  }
  if (position === 'VOL' || position === 'MEI') {
    return 'bg-green-500';
  }
  return 'bg-red-500';
}

function DraggablePlayer({ player }: { player: EscalacaoJogador }) {
  // useDrag conecta este elemento à API de arrastar-e-soltar do react-dnd.
  // `drag` é a ref que precisa ser colocada na div que pode ser arrastada.
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { playerId: player.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player.id]);

  return (
    <div
      ref={drag}
      className={`cursor-move ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${getPositionColor(player.position)} flex items-center justify-center text-white text-xs font-bold`}>
            {player.number}
          </div>
          <div>
            <p className="text-sm font-medium">{player.name}</p>
            <p className="text-xs text-muted-foreground">{posicaoNome(player.position)}</p>
          </div>
        </div>
        <span className="text-sm font-bold text-primary" title="Nota de desempenho">{formatarNota(player)}</span>
      </div>
    </div>
  );
}

type NovoEvento = { tipo: TipoEvento; jogadorId: number; assistJogadorId: number | null; entraJogadorId?: number | null };

// Menu de lances de um jogador do campo. Cartões registram com um toque; gol e assistência
// pedem o companheiro na mesma janelinha (assistência = gol do companheiro com este jogador
// como assistente, que é como o back guarda).
function MenuDeLances({
  player,
  time,
  companheiros,
  reservas,
  onRegistrar,
  onSubstituir,
  children,
}: {
  player: EscalacaoJogador;
  time: NumeroTime;
  companheiros: EscalacaoJogador[];
  /** Jogadores presentes que não estão em nenhum dos dois times (podem entrar no lugar deste). */
  reservas: EscalacaoJogador[];
  onRegistrar: (evento: NovoEvento) => Promise<boolean>;
  /** Registra a substituição e coloca o reserva escolhido na mesma posição. Devolve true se deu certo. */
  onSubstituir: (entraId: number) => Promise<boolean>;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<'menu' | 'gol' | 'assistencia' | 'substituir'>('menu');
  const [salvando, setSalvando] = useState(false);

  async function registrar(evento: NovoEvento) {
    setSalvando(true);
    const ok = await onRegistrar(evento);
    setSalvando(false);
    if (ok) setAberto(false);
  }

  async function substituir(entraId: number) {
    setSalvando(true);
    const ok = await onSubstituir(entraId);
    setSalvando(false);
    if (ok) setAberto(false);
  }

  const acao = 'flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs font-medium transition-colors disabled:opacity-50';
  const companheiro = 'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50';

  return (
    <Popover
      open={aberto}
      onOpenChange={(open) => {
        if (salvando) return;
        setAberto(open);
        if (open) setEtapa('menu');
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-2" side="top">
        <div className="flex items-center gap-1 px-1 pb-2 mb-2 border-b">
          {etapa !== 'menu' && (
            <button type="button" className="rounded p-0.5 hover:bg-accent" aria-label="Voltar" onClick={() => setEtapa('menu')}>
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{player.name}</p>
            <p className="text-xs text-muted-foreground">
              {etapa === 'menu' && `Time ${time} · registrar lance`}
              {etapa === 'gol' && 'Gol · quem deu a assistência?'}
              {etapa === 'assistencia' && 'Assistência · quem fez o gol?'}
              {etapa === 'substituir' && 'Substituição · quem entra?'}
            </p>
          </div>
        </div>

        {etapa === 'menu' && (
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" disabled={salvando} className={`${acao} border-green-200 text-green-700 hover:bg-green-50`} onClick={() => setEtapa('gol')}>
              <Trophy className="h-4 w-4" /> Gol
            </button>
            <button type="button" disabled={salvando} className={`${acao} border-blue-200 text-blue-700 hover:bg-blue-50`} onClick={() => setEtapa('assistencia')}>
              <Footprints className="h-4 w-4" /> Assistência
            </button>
            <button
              type="button"
              disabled={salvando}
              className={`${acao} border-yellow-200 text-yellow-800 hover:bg-yellow-50`}
              onClick={() => registrar({ tipo: 'amarelo', jogadorId: player.id, assistJogadorId: null })}
            >
              <span className="w-3 h-4 rounded-sm border bg-yellow-400 border-yellow-600"></span> Amarelo
            </button>
            <button
              type="button"
              disabled={salvando}
              className={`${acao} border-red-200 text-red-700 hover:bg-red-50`}
              onClick={() => registrar({ tipo: 'vermelho', jogadorId: player.id, assistJogadorId: null })}
            >
              <span className="w-3 h-4 rounded-sm border bg-red-600 border-red-800"></span> Vermelho
            </button>
            <button
              type="button"
              disabled={salvando}
              className={`${acao} col-span-2 flex-row border-slate-200 text-slate-700 hover:bg-slate-50`}
              onClick={() => setEtapa('substituir')}
            >
              <ArrowLeftRight className="h-4 w-4" /> Substituir
            </button>
          </div>
        )}

        {etapa === 'substituir' && (
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {/* Quem joga na mesma posição aparece primeiro; depois, pela avaliação. */}
            {[...reservas]
              .sort((a, b) =>
                Number(b.position === player.position) - Number(a.position === player.position)
                || desempenhoDoJogador(b) - desempenhoDoJogador(a)
                || a.name.localeCompare(b.name))
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={salvando}
                  className={companheiro}
                  onClick={() => substituir(r.id)}
                >
                  <span className={`w-6 h-6 shrink-0 rounded-full ${getPositionColor(r.position)} text-white text-[10px] font-bold flex items-center justify-center`}>
                    {r.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{r.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{posicaoNome(r.position)}</span>
                  </span>
                  <span className="text-xs font-bold text-primary" title="Nota de desempenho">{formatarNota(r)}</span>
                </button>
              ))}
            {reservas.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">
                Nenhum reserva disponível. Marque mais jogadores como presentes na aba Presença
                (quem já foi substituído não pode voltar).
              </p>
            )}
          </div>
        )}

        {(etapa === 'gol' || etapa === 'assistencia') && (
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {etapa === 'gol' && (
              <button
                type="button"
                disabled={salvando}
                className={`${companheiro} font-medium text-green-700`}
                onClick={() => registrar({ tipo: 'gol', jogadorId: player.id, assistJogadorId: null })}
              >
                <Trophy className="h-4 w-4" /> Sem assistência
              </button>
            )}
            {companheiros.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={salvando}
                className={companheiro}
                onClick={() => registrar(etapa === 'gol'
                  ? { tipo: 'gol', jogadorId: player.id, assistJogadorId: c.id }
                  : { tipo: 'gol', jogadorId: c.id, assistJogadorId: player.id })}
              >
                <span className={`w-6 h-6 shrink-0 rounded-full ${getPositionColor(c.position)} text-white text-[10px] font-bold flex items-center justify-center`}>
                  {c.number}
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            {companheiros.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">Escale outros jogadores no Time {time} para escolher aqui.</p>
            )}
          </div>
        )}

        {salvando && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground px-1 pt-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Registrando...
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function FieldPosition({
  position,
  onDrop,
  player,
  stats,
  time,
  companheiros,
  reservas,
  onRemove,
  onRegistrar,
  onSubstituir,
  entrouNaPartida
}: {
  position: FormationPosition;
  onDrop: (playerId: number) => void;
  player: EscalacaoJogador | null;
  stats: MatchStats;
  time: NumeroTime;
  companheiros: EscalacaoJogador[];
  reservas: EscalacaoJogador[];
  onRemove: () => void;
  onRegistrar: (evento: NovoEvento) => Promise<boolean>;
  onSubstituir: (entraId: number) => Promise<boolean>;
  /** Entrou no lugar de alguém nesta partida (mostra o selo de substituição) */
  entrouNaPartida: boolean;
}) {
  // useDrop marca este elemento como um alvo onde um jogador arrastado pode
  // ser solto. `drop` é a ref que precisa ser colocada na div alvo.
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { playerId: number }) => onDrop(item.playerId),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [onDrop]);

  if (!player) {
    return (
      <div
        ref={drop}
        className={`absolute ${isOver ? 'scale-110' : ''}`}
        style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/50 bg-white/10 flex items-center justify-center backdrop-blur-sm">
          <UserPlus className="h-5 w-5 text-white/70" />
        </div>
        <p className="text-xs text-white text-center mt-1 font-medium">{position.position}</p>
      </div>
    );
  }

  // Jogador fora da posição dele (ex: meia improvisado no ataque): mostra a vaga em que está.
  const improvisado = player.position !== position.position;

  return (
    <div
      className="absolute"
      style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="relative group">
          <MenuDeLances
            player={player}
            time={time}
            companheiros={companheiros}
            reservas={reservas}
            onRegistrar={onRegistrar}
            onSubstituir={onSubstituir}
          >
            <button
              type="button"
              className={`w-12 h-12 rounded-full ${getPositionColor(player.position)} flex items-center justify-center text-white font-bold shadow-lg cursor-pointer hover:scale-105 hover:ring-2 hover:ring-white transition-transform`}
              title={`${player.name} · toque para registrar gol, assistência, cartão ou substituir`}
            >
              {player.number}
            </button>
          </MenuDeLances>

          {entrouNaPartida && (
            <div
              className="absolute top-1/2 -left-3 -translate-y-1/2 w-5 h-5 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-500"
              title="Entrou na partida (substituição)"
            >
              <ArrowLeftRight className="h-3 w-3" />
            </div>
          )}

          {/* Gols, assistências e cartões registrados na partida */}
          {stats.assistencias > 0 && (
            <div className="absolute -bottom-1 -left-1 h-5 min-w-5 px-0.5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md border-2 border-white" title="Assistências">
              {stats.assistencias}A
            </div>
          )}
          {stats.gols > 0 && (
            <div className="absolute -top-1 -right-1 h-5 min-w-5 px-0.5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md border-2 border-white" title="Gols">
              {stats.gols}⚽
            </div>
          )}
          {(stats.amarelos > 0 || stats.vermelhos > 0) && (
            <div className="absolute -bottom-1 -right-1 flex gap-0.5">
              {stats.amarelos > 0 && (
                <div className="w-4 h-5 bg-yellow-400 border border-yellow-600 rounded-sm flex items-center justify-center text-xs font-bold" title="Cartões amarelos">
                  {stats.amarelos}
                </div>
              )}
              {stats.vermelhos > 0 && (
                <div className="w-4 h-5 bg-red-600 border border-red-800 rounded-sm flex items-center justify-center text-white text-xs font-bold" title="Cartões vermelhos">
                  {stats.vermelhos}
                </div>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
            aria-label="Tirar do campo"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-md shadow-lg px-1.5 py-0.5 max-w-[96px] flex items-center gap-1">
          <span className="text-[10px] font-bold text-primary" title="Nota de desempenho">{formatarNota(player)}</span>
          <p className="text-[11px] font-medium truncate" title={player.name}>{player.name}</p>
        </div>
        {improvisado && (
          <span className="text-[9px] font-semibold uppercase text-white/90 bg-black/30 rounded px-1" title={`${posicaoNome(player.position)} jogando de ${posicaoNome(position.position)}`}>
            de {position.position}
          </span>
        )}
      </div>
    </div>
  );
}

// Gols, assistências e cartões de cada jogador nesta partida, separados por time.
function statsDoTime(eventos: EscalacaoEvento[], time: NumeroTime) {
  const porJogador = new Map<number, MatchStats>();
  const total = { ...SEM_STATS };
  const doJogador = (id: number) => {
    const atual = porJogador.get(id) ?? { ...SEM_STATS };
    porJogador.set(id, atual);
    return atual;
  };
  for (const evento of eventos) {
    if (evento.time !== time) continue;
    const atual = doJogador(evento.jogadorId);
    if (evento.tipo === 'gol') { atual.gols++; total.gols++; }
    if (evento.tipo === 'amarelo') { atual.amarelos++; total.amarelos++; }
    if (evento.tipo === 'vermelho') { atual.vermelhos++; total.vermelhos++; }
    if (evento.tipo === 'gol' && evento.assistJogadorId !== null) {
      doJogador(evento.assistJogadorId).assistencias++;
      total.assistencias++;
    }
  }
  return { porJogador, total };
}

export function EscalacaoCartolaPage({ jogadores, eventos, escalacaoSalva, onSalvarEscalacao, onRegistrarEvento }: EscalacaoCartolaPageProps) {
  const [view, setView] = useState<'campo' | 'lista'>('campo');
  const [inicial] = useState(() => estadoInicial(escalacaoSalva));
  const [esquemas, setEsquemas] = useState<Record<NumeroTime, Esquema>>(inicial.esquemas);
  // Jogador de cada uma das 11 posições de cada time (mesmo índice do esquema escolhido).
  const [escalados, setEscalados] = useState<Record<NumeroTime, (number | null)[]>>(inicial.escalados);

  // Salvamento automático: cada mudança é salva no back depois de um instante sem mexer.
  // Se a tela for fechada antes disso (troca de aba/página), salva na hora.
  const [salvamento, setSalvamento] = useState<'salvo' | 'salvando' | 'erro'>('salvo');
  const atual = useRef(paraEscalacao(esquemas, escalados));
  atual.current = paraEscalacao(esquemas, escalados);
  const ultimoSalvo = useRef(JSON.stringify(atual.current));
  const onSalvarRef = useRef(onSalvarEscalacao);
  onSalvarRef.current = onSalvarEscalacao;

  async function salvarSeMudou() {
    const escalacao = atual.current;
    const json = JSON.stringify(escalacao);
    if (json === ultimoSalvo.current) return;

    ultimoSalvo.current = json;
    setSalvamento('salvando');
    const ok = await onSalvarRef.current(escalacao);
    if (!ok) {
      ultimoSalvo.current = ''; // tenta de novo na próxima mudança
    }
    // Só mostra "salvo" se nada mudou enquanto o pedido estava indo.
    if (ultimoSalvo.current === JSON.stringify(atual.current) || !ok) {
      setSalvamento(ok ? 'salvo' : 'erro');
    }
  }

  useEffect(() => {
    if (JSON.stringify(atual.current) === ultimoSalvo.current) return;
    setSalvamento('salvando');
    const timer = setTimeout(salvarSeMudou, ATRASO_SALVAR_MS);
    return () => clearTimeout(timer);
  }, [esquemas, escalados]);

  useEffect(() => () => { salvarSeMudou(); }, []);

  // Substituições da partida: quem saiu não volta (some do campo e dos disponíveis);
  // quem entrou ganha o selo de substituição no campo.
  const sairam = new Set(eventos.filter((e) => e.tipo === 'substituicao').map((e) => e.jogadorId));
  const entraram = new Set(
    eventos.filter((e) => e.tipo === 'substituicao' && e.entraJogadorId !== null).map((e) => e.entraJogadorId as number),
  );
  const disponiveisParaJogar = jogadores.filter((j) => !sairam.has(j.id));

  const jogadorPorId = new Map(disponiveisParaJogar.map((j) => [j.id, j]));

  function formacaoDoTime(time: NumeroTime): FormationPosition[] {
    return FORMACOES[esquemas[time]].map((slot, i) => ({ ...slot, playerId: escalados[time][i] }));
  }

  // Jogador da posição; some do campo se deixou de estar disponível (ex: deixou de estar presente).
  function jogadorDaPosicao(pos: FormationPosition): EscalacaoJogador | null {
    return pos.playerId === null ? null : jogadorPorId.get(pos.playerId) ?? null;
  }

  function titularesDoTime(time: NumeroTime): EscalacaoJogador[] {
    const titulares: EscalacaoJogador[] = [];
    for (const pos of formacaoDoTime(time)) {
      const jogador = jogadorDaPosicao(pos);
      if (jogador) {
        titulares.push(jogador);
      }
    }
    return titulares;
  }

  const titulares: Record<NumeroTime, EscalacaoJogador[]> = { 1: titularesDoTime(1), 2: titularesDoTime(2) };
  const idsEscalados = new Set([...titulares[1], ...titulares[2]].map((j) => j.id));
  const reservas = disponiveisParaJogar.filter((j) => !idsEscalados.has(j.id));

  // Um jogador só pode estar em um dos dois times.
  const handleDrop = (time: NumeroTime, index: number, playerId: number) => {
    if (sairam.has(playerId)) return;
    setEscalados((atual) => {
      if (atual[1].includes(playerId) || atual[2].includes(playerId)) {
        return atual;
      }
      const doTime = [...atual[time]];
      doTime[index] = playerId;
      return { ...atual, [time]: doTime };
    });
  };

  const handleRemove = (time: NumeroTime, index: number) => {
    setEscalados((atual) => {
      const doTime = [...atual[time]];
      doTime[index] = null;
      return { ...atual, [time]: doTime };
    });
  };

  // Sorteia os dois times de uma vez: cada jogador na sua posição e desempenho equilibrado
  // (ver sorteioTimes.ts).
  const shufflePlayers = () => {
    const vagas = (time: NumeroTime) => FORMACOES[esquemas[time]].map((slot) => slot.position);
    const participantes = disponiveisParaJogar.map((j) => ({ id: j.id, position: j.position, desempenho: desempenhoDoJogador(j) }));
    const { time1, time2 } = sortearTimes(participantes, vagas(1), vagas(2));
    setEscalados({ 1: time1, 2: time2 });
  };

  const nivel: Record<NumeroTime, number> = { 1: desempenhoMedioDoTime(titulares[1]), 2: desempenhoMedioDoTime(titulares[2]) };
  const diferencaNivel = Math.round(Math.abs(nivel[1] - nivel[2]) * 10) / 10;

  const clearFormation = () => {
    setEscalados({ 1: SEM_JOGADORES, 2: SEM_JOGADORES });
  };


  function tabelaJogadores(lista: EscalacaoJogador[], vazio: string, corNumero: string) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Posição</TableHead>
            <TableHead className="text-right">Nota</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((player) => (
            <TableRow key={player.id}>
              <TableCell>
                <div className={`w-7 h-7 rounded-full ${corNumero} flex items-center justify-center text-xs font-bold`}>
                  {player.number}
                </div>
              </TableCell>
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={posicaoCorClasses(player.position)}>
                  {posicaoNome(player.position)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-bold">{formatarNota(player)}</TableCell>
            </TableRow>
          ))}
          {lista.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                {vazio}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }

  function campoDoTime(time: NumeroTime) {
    const formacao = formacaoDoTime(time);
    const { porJogador, total } = statsDoTime(eventos, time);

    return (
      <Card key={time}>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Time {time}
              <Badge variant="secondary">{titulares[time].length}/{TOTAL_POSICOES}</Badge>
              <Badge className="bg-primary text-primary-foreground" title="Desempenho médio dos escalados">
                ⭐ {titulares[time].length > 0 ? nivel[time].toFixed(1) : '—'}
              </Badge>
            </span>
            <span className="flex items-center gap-3 text-sm font-normal">
              <span className="flex items-center gap-1" title="Gols">⚽ {total.gols}</span>
              <span className="flex items-center gap-1" title="Assistências">
                <Footprints className="h-4 w-4 text-blue-600" /> {total.assistencias}
              </span>
              <span className="flex items-center gap-1" title="Cartões amarelos">
                <span className="w-2.5 h-3.5 bg-yellow-400 border border-yellow-600 rounded-sm"></span> {total.amarelos}
              </span>
              <span className="flex items-center gap-1" title="Cartões vermelhos">
                <span className="w-2.5 h-3.5 bg-red-600 border border-red-800 rounded-sm"></span> {total.vermelhos}
              </span>
            </span>
          </CardTitle>
          <div className="inline-flex flex-wrap w-fit rounded-lg border-2 p-1 bg-muted/40" role="group" aria-label={`Esquema tático do Time ${time}`}>
            {ESQUEMAS.map((e) => (
              <Button
                key={e}
                variant={esquemas[time] === e ? 'default' : 'ghost'}
                size="sm"
                aria-pressed={esquemas[time] === e}
                onClick={() => setEsquemas({ ...esquemas, [time]: e })}
              >
                {e}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-green-600 to-green-700 rounded-lg overflow-hidden">
            {/* Field lines */}
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-white/30"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/30 rounded-full"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-14 border-2 border-t-0 border-white/30"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-14 border-2 border-b-0 border-white/30"></div>
            </div>

            {/* Formation Positions */}
            {formacao.map((pos, index) => {
              const jogador = jogadorDaPosicao(pos);
              return (
                <FieldPosition
                  key={index}
                  position={pos}
                  player={jogador}
                  stats={(jogador && porJogador.get(jogador.id)) || SEM_STATS}
                  onDrop={(playerId) => handleDrop(time, index, playerId)}
                  onRemove={() => handleRemove(time, index)}
                  time={time}
                  companheiros={jogador ? titulares[time].filter((j) => j.id !== jogador.id) : []}
                  onRegistrar={(evento) => onRegistrarEvento({ ...evento, time })}
                  reservas={reservas}
                  entrouNaPartida={jogador !== null && entraram.has(jogador.id)}
                  onSubstituir={async (entraId) => {
                    if (!jogador) return false;
                    // Primeiro registra o lance; só se der certo troca na escalação.
                    const ok = await onRegistrarEvento({
                      tipo: 'substituicao',
                      jogadorId: jogador.id,
                      assistJogadorId: null,
                      entraJogadorId: entraId,
                      time,
                    });
                    if (ok) {
                      setEscalados((atual) => {
                        const doTime = [...atual[time]];
                        doTime[index] = entraId;
                        return { ...atual, [time]: doTime };
                      });
                    }
                    return ok;
                  }}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ações dos dois times + View Toggle */}
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={shufflePlayers} disabled={disponiveisParaJogar.length === 0}>
            <Shuffle className="h-4 w-4 mr-2" />
            Sortear Times
          </Button>
          <Button variant="outline" size="sm" onClick={clearFormation}>
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          <span className="flex items-center gap-1 text-sm text-muted-foreground" aria-live="polite">
            {salvamento === 'salvando' && (<><Loader2 className="h-4 w-4 animate-spin" /> Salvando escalação...</>)}
            {salvamento === 'salvo' && (<><CheckCircle2 className="h-4 w-4 text-green-600" /> Escalação salva</>)}
            {salvamento === 'erro' && (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Não foi possível salvar a escalação
                <Button variant="link" size="sm" className="h-auto p-0" onClick={salvarSeMudou}>Tentar de novo</Button>
              </span>
            )}
          </span>
        </div>
        <div className="inline-flex rounded-lg border-2 p-1 bg-muted/40">
          <Button
            variant={view === 'campo' ? 'default' : 'ghost'}
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setView('campo')}
          >
            <LayoutGrid className="h-4 w-4" />
            Campo
          </Button>
          <Button
            variant={view === 'lista' ? 'default' : 'ghost'}
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setView('lista')}
          >
            <List className="h-4 w-4" />
            Lista
          </Button>
        </div>
      </div>

      {/* Equilíbrio entre os times (desempenho médio dos escalados) */}
      {(titulares[1].length > 0 || titulares[2].length > 0) && (
        <div className="flex items-center justify-center gap-4 p-3 border rounded-lg bg-muted/30 flex-wrap">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Time 1</p>
            <p className="text-2xl font-bold">{titulares[1].length > 0 ? nivel[1].toFixed(1) : '—'}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Scale className="h-5 w-5 text-muted-foreground" />
            <Badge
              variant="secondary"
              className={diferencaNivel <= 0.3 ? 'bg-green-100 text-green-800' : diferencaNivel <= 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
            >
              {diferencaNivel <= 0.3 ? 'Equilibrado' : `Diferença de ${diferencaNivel.toFixed(1)}`}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Time 2</p>
            <p className="text-2xl font-bold">{titulares[2].length > 0 ? nivel[2].toFixed(1) : '—'}</p>
          </div>
          <p className="w-full text-center text-xs text-muted-foreground">Desempenho médio dos escalados (quem ainda não jogou conta como 5,0)</p>
        </div>
      )}

      {view === 'lista' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TIMES.map((time) => (
            <Card key={time}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Time {time}</span>
                  <span className="flex gap-2">
                    <Badge variant="secondary">{titulares[time].length}/{TOTAL_POSICOES}</Badge>
                    <Badge variant="default">⭐ {titulares[time].length > 0 ? nivel[time].toFixed(1) : '—'}</Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tabelaJogadores(titulares[time], 'Nenhum jogador escalado ainda', 'bg-primary text-primary-foreground')}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Reservas</span>
                <Badge variant="secondary">{reservas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tabelaJogadores(
                reservas,
                jogadores.length === 0 ? 'Nenhum jogador presente' : 'Todos os jogadores foram escalados',
                'bg-secondary text-secondary-foreground',
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'campo' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_260px] gap-4">
            {TIMES.map((time) => campoDoTime(time))}

            {/* Jogadores disponíveis (servem para os dois times) */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Disponíveis ({reservas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {reservas.map((player) => (
                      <DraggablePlayer key={player.id} player={player} />
                    ))}
                    {reservas.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {jogadores.length === 0
                            ? 'Nenhum jogador presente. Marque os jogadores como presentes na aba Presença.'
                            : 'Todos os jogadores foram escalados'}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="p-3 bg-accent rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Arraste jogadores da lista de disponíveis para o campo de cada time, ou use Sortear Times. Toque em um jogador
              escalado para registrar gol, assistência, cartão ou fazer uma substituição. A escalação é salva automaticamente.
            </p>
          </div>
        </>
      )}

    </div>
  );
}
