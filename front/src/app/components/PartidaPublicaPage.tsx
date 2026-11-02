import { useEffect } from 'react';
import { Calendar, Clock, MapPin, ShieldCheck, Trophy, Footprints } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  EscalacaoEvento,
  EscalacaoSomenteLeitura,
  EscalacaoTime,
  JogadorSomenteLeitura,
  eventosDeExpulsaoPorAmarelos,
} from './EscalacaoCartolaPage';
import { Arbitro } from './ArbitrosPartida';
import { LayoutPublico, useDadosPublicos } from './LayoutPublico';

// Formato de GET /api/publico/partida/{token}.
interface PartidaPublica {
  peladaNome: string;
  partida: {
    date: string;
    time: string;
    location: string;
    status: 'agendada' | 'em_andamento' | 'finalizada';
    scoreTeam1: number | null;
    scoreTeam2: number | null;
  };
  escalacao: EscalacaoTime[];
  eventos: EscalacaoEvento[];
  jogadores: JogadorSomenteLeitura[];
  arbitros: Arbitro[];
}

const STATUS: Record<PartidaPublica['partida']['status'], { nome: string; classes: string }> = {
  agendada: { nome: 'Agendada', classes: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  em_andamento: { nome: 'Em andamento', classes: 'bg-green-100 text-green-800 hover:bg-green-100' },
  finalizada: { nome: 'Finalizada', classes: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
};

const FUNCAO_ARBITRO: Record<Arbitro['funcao'], string> = {
  principal: 'Juiz principal',
  assistente: 'Assistente',
  quarto: 'Quarto árbitro',
};

// Partida aberta por link, sem login e somente leitura: indicadores e escalação.
export function PartidaPublicaPage({ token }: { token: string }) {
  const { dados, erro } = useDadosPublicos<PartidaPublica>(`/publico/partida/${encodeURIComponent(token)}`);

  useEffect(() => {
    if (dados) document.title = `${dados.peladaNome} · Partida · 4Fut`;
  }, [dados]);

  return (
    <LayoutPublico erro={erro} carregando={!dados}>
      {dados && <ConteudoPartida dados={dados} />}
    </LayoutPublico>
  );
}

function ConteudoPartida({ dados }: { dados: PartidaPublica }) {
  const { partida, eventos } = dados;
  const status = STATUS[partida.status];

  // 2º amarelo conta como vermelho (o jogador foi expulso), igual à tela da partida.
  const expulsoesPorAmarelos = eventosDeExpulsaoPorAmarelos(eventos);
  const indicadores = [
    { nome: 'Gols', valor: eventos.filter((e) => e.tipo === 'gol').length, icone: <Trophy className="h-5 w-5 text-green-600" /> },
    { nome: 'Assistências', valor: eventos.filter((e) => e.tipo === 'gol' && e.assistJogadorId !== null).length, icone: <Footprints className="h-5 w-5 text-blue-600" /> },
    { nome: 'Amarelos', valor: eventos.filter((e) => e.tipo === 'amarelo').length, icone: <span className="w-4 h-5 bg-yellow-400 border border-yellow-600 rounded-sm" /> },
    {
      nome: expulsoesPorAmarelos.size > 0 ? `Vermelhos (${expulsoesPorAmarelos.size} por 2 amarelos)` : 'Vermelhos',
      valor: eventos.filter((e) => e.tipo === 'vermelho').length + expulsoesPorAmarelos.size,
      icone: <span className="w-4 h-5 bg-red-600 border border-red-800 rounded-sm" />,
    },
    { nome: 'Substituições', valor: eventos.filter((e) => e.tipo === 'substituicao').length, icone: <span className="text-base">⇄</span> },
  ];

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1>{dados.peladaNome}</h1>
          <div className="flex items-center gap-4 text-muted-foreground flex-wrap mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(partida.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {partida.time}</span>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {partida.location}</span>
          </div>
        </div>
        <Badge className={status.classes}>{status.nome}</Badge>
      </div>

      {/* Placar e indicadores */}
      <Card className="border-2 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="flex-1 text-center">
              <h3 className="mb-2">Time 1</h3>
              <div className="text-6xl sm:text-7xl font-bold text-green-600">{partida.scoreTeam1 ?? 0}</div>
            </div>
            <div className="text-4xl font-bold text-muted-foreground">×</div>
            <div className="flex-1 text-center">
              <h3 className="mb-2">Time 2</h3>
              <div className="text-6xl sm:text-7xl font-bold text-blue-600">{partida.scoreTeam2 ?? 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 border-t">
            {indicadores.map((i) => (
              <div key={i.nome} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                {i.icone}
                <div>
                  <p className="text-2xl font-bold leading-tight">{i.valor}</p>
                  <p className="text-xs text-muted-foreground">{i.nome}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Escalação */}
      <div className="space-y-3">
        <h2>Escalação</h2>
        {dados.escalacao.every((t) => t.jogadores.every((j) => j === null)) ? (
          <p className="text-muted-foreground">A escalação ainda não foi montada.</p>
        ) : (
          <EscalacaoSomenteLeitura escalacao={dados.escalacao} eventos={eventos} jogadores={dados.jogadores} />
        )}
      </div>

      {dados.arbitros.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Arbitragem
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {dados.arbitros.map((a, i) => (
              <div key={`${a.funcao}-${a.nome}-${i}`} className="flex items-center gap-2 p-2 pr-3 border rounded-lg">
                <Badge variant="secondary">{FUNCAO_ARBITRO[a.funcao]}</Badge>
                <span className="font-medium">{a.nome}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
