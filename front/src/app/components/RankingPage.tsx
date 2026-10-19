import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import {
  Trophy,
  Target,
  AlertTriangle,
  Users,
  Calendar,
  DollarSign,
  Medal,
  TrendingUp,
  ArrowLeft,
  Footprints,
  Star
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import { posicaoNome } from "./positions";

interface RankingPageProps {
  peladaId: number;
  onNavigate: (page: string, peladaId?: number) => void;
}

// GET /peladas/{id}/jogadores: gols, cartões, jogos e nota já vêm calculados das partidas
// (ver Services/EstatisticasService.cs no back).
interface Jogador {
  id: number;
  name: string;
  position: string;
  status: string;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  jogos: number;
  nota: number;
}

interface Partida {
  id: number;
  status: string;
}

// GET /peladas/{id}/financeiro/a-receber: só o que importa para saber quem está com pendência.
interface ItemAReceber {
  jogadorId: number;
}

function totalCartoes(j: Jogador) {
  return j.cartoesAmarelos + j.cartoesVermelhos;
}

function getMedalColor(position: number) {
  switch (position) {
    case 1: return "text-yellow-500";
    case 2: return "text-gray-400";
    case 3: return "text-orange-600";
    default: return "text-muted-foreground";
  }
}

// Pega as duas primeiras iniciais do nome, ex: "João da Silva" -> "JD"
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function formatarMedia(valor: number) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function SemDados({ texto }: { texto: string }) {
  return <p className="text-sm text-muted-foreground text-center py-8">{texto}</p>;
}

export function RankingPage({ peladaId, onNavigate }: RankingPageProps) {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [partidasJogadas, setPartidasJogadas] = useState(0);
  // null = não deu para carregar o financeiro (a aba individual mostra "—" no pagamento).
  const [comPendencia, setComPendencia] = useState<Set<number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setError(null);
      try {
        const [listaJogadores, partidas] = await Promise.all([
          api.get<Jogador[]>(`/peladas/${peladaId}/jogadores`),
          api.get<Partida[]>(`/peladas/${peladaId}/partidas`),
        ]);
        setJogadores(listaJogadores);
        setPartidasJogadas(partidas.filter((p) => p.status === 'finalizada').length);
      } catch (err) {
        setError(err instanceof ApiError ? 'Não foi possível carregar o ranking.' : 'Não foi possível conectar ao servidor.');
      } finally {
        setLoading(false);
      }

      try {
        const aReceber = await api.get<ItemAReceber[]>(`/peladas/${peladaId}/financeiro/a-receber`);
        setComPendencia(new Set(aReceber.map((i) => i.jogadorId)));
      } catch {
        setComPendencia(null);
      }
    }
    carregar();
  }, [peladaId]);

  if (loading) {
    return <p className="text-muted-foreground">Carregando ranking...</p>;
  }

  const totalGols = jogadores.reduce((soma, j) => soma + j.gols, 0);
  const jogadoresAtivos = jogadores.filter((j) => j.status === 'ativo').length;
  const mediaGolsPorJogo = partidasJogadas > 0 ? totalGols / partidasJogadas : 0;

  // Empates: no artilheiro/assistências fica na frente quem tem menos jogos (melhor aproveitamento).
  const artilheiros = jogadores
    .filter((j) => j.gols > 0)
    .sort((a, b) => b.gols - a.gols || a.jogos - b.jogos || a.name.localeCompare(b.name));

  const garcons = jogadores
    .filter((j) => j.assistencias > 0)
    .sort((a, b) => b.assistencias - a.assistencias || a.jogos - b.jogos || a.name.localeCompare(b.name));

  const cartoes = jogadores
    .filter((j) => totalCartoes(j) > 0)
    .sort((a, b) => totalCartoes(b) - totalCartoes(a) || a.name.localeCompare(b.name));

  const individuais = [...jogadores].sort((a, b) => a.name.localeCompare(b.name));

  function linhaRanking(jogador: Jogador, index: number, detalhe: string, valor: number, unidade: string, corValor: string) {
    return (
      <div key={jogador.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="flex items-center space-x-2">
            <Medal className={`h-6 w-6 ${getMedalColor(index + 1)}`} />
            <span className="text-lg font-semibold">#{index + 1}</span>
          </div>
          <Avatar>
            <AvatarFallback>{getInitials(jogador.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h4 className="truncate">{jogador.name}</h4>
            <p className="text-sm text-muted-foreground">{detalhe}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-semibold ${corValor}`}>{valor}</p>
          <p className="text-sm text-muted-foreground">{unidade}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => onNavigate('pelada-detail', peladaId)}
            className="flex items-center gap-2 border-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1>Ranking e Estatísticas</h1>
            <p className="text-muted-foreground">Artilheiros, cartões e desempenho dos jogadores desta pelada</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Gols</p>
                <p className="text-xl font-semibold">{totalGols}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Jogadores Ativos</p>
                <p className="text-xl font-semibold">{jogadoresAtivos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Partidas Jogadas</p>
                <p className="text-xl font-semibold">{partidasJogadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Média Gols/Jogo</p>
                <p className="text-xl font-semibold">{formatarMedia(mediaGolsPorJogo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="artilheiros" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="artilheiros">Artilheiros</TabsTrigger>
          <TabsTrigger value="assistencias">Assistências</TabsTrigger>
          <TabsTrigger value="cartoes">Cartões</TabsTrigger>
          <TabsTrigger value="individual">Estatísticas Individuais</TabsTrigger>
        </TabsList>

        <TabsContent value="artilheiros" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking de Artilheiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {artilheiros.length === 0 && <SemDados texto="Nenhum gol registrado ainda." />}
                {artilheiros.map((jogador, index) =>
                  linhaRanking(
                    jogador,
                    index,
                    jogador.jogos > 0
                      ? `${jogador.jogos} jogos • Média: ${formatarMedia(jogador.gols / jogador.jogos)} gols/jogo`
                      : 'Nenhuma partida finalizada',
                    jogador.gols,
                    jogador.gols === 1 ? 'gol' : 'gols',
                    'text-primary',
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assistencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Footprints className="h-5 w-5 text-blue-500" />
                Ranking de Assistências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {garcons.length === 0 && <SemDados texto="Nenhuma assistência registrada ainda." />}
                {garcons.map((jogador, index) =>
                  linhaRanking(
                    jogador,
                    index,
                    `${jogador.jogos} jogos • ${jogador.gols} ${jogador.gols === 1 ? 'gol' : 'gols'}`,
                    jogador.assistencias,
                    jogador.assistencias === 1 ? 'assistência' : 'assistências',
                    'text-blue-600',
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cartoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Ranking de Cartões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartoes.length === 0 && <SemDados texto="Nenhum cartão registrado ainda." />}
                {cartoes.map((jogador, index) => (
                  <div key={jogador.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                    <div className="flex items-center space-x-4 min-w-0">
                      <span className="text-lg font-semibold">#{index + 1}</span>
                      <Avatar>
                        <AvatarFallback>{getInitials(jogador.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="truncate">{jogador.name}</h4>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1" title="Cartões amarelos">
                            <div className="w-3 h-4 bg-yellow-400 border border-yellow-600 rounded-sm"></div>
                            <span>{jogador.cartoesAmarelos}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Cartões vermelhos">
                            <div className="w-3 h-4 bg-red-600 border border-red-800 rounded-sm"></div>
                            <span>{jogador.cartoesVermelhos}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-red-600">{totalCartoes(jogador)}</p>
                      <p className="text-sm text-muted-foreground">{totalCartoes(jogador) === 1 ? 'cartão' : 'cartões'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas Individuais por Jogador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {individuais.length === 0 && <SemDados texto="Nenhum jogador cadastrado nesta pelada." />}
                {individuais.map((jogador) => {
                  // Presença: em quantas das partidas finalizadas o jogador jogou.
                  const presenca = partidasJogadas > 0 ? Math.min(100, Math.round((jogador.jogos / partidasJogadas) * 100)) : 0;
                  const pendente = comPendencia?.has(jogador.id) ?? false;
                  const pagamento = comPendencia === null ? '—' : pendente ? 'Pendente' : 'Em dia';
                  return (
                    <div key={jogador.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4 gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <Avatar>
                            <AvatarFallback>{getInitials(jogador.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="truncate">{jogador.name}</h4>
                            <p className="text-sm text-muted-foreground">{posicaoNome(jogador.position)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {jogador.jogos > 0 ? jogador.nota.toFixed(1) : '—'}
                          </Badge>
                          {comPendencia !== null && (
                            <Badge variant={pendente ? 'destructive' : 'default'}>{pagamento}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Gols</span>
                            <span className="font-semibold">{jogador.gols}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Artilharia</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Assistências</span>
                            <span className="font-semibold">{jogador.assistencias}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Footprints className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">Garçom</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Presença</span>
                            <span className="font-semibold">{presenca}%</span>
                          </div>
                          <Progress value={presenca} className="h-2" />
                          <p className="text-xs text-muted-foreground">{jogador.jogos} de {partidasJogadas} partidas</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Cartões</span>
                            <span className="font-semibold">{totalCartoes(jogador)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-4 bg-yellow-400 border border-yellow-600 rounded-sm"></div>
                            <span>{jogador.cartoesAmarelos}</span>
                            <div className="w-3 h-4 bg-red-600 border border-red-800 rounded-sm ml-1"></div>
                            <span>{jogador.cartoesVermelhos}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Pagamentos</span>
                            <span className={`font-semibold ${comPendencia === null ? '' : pendente ? 'text-red-600' : 'text-green-600'}`}>
                              {pagamento}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className={`h-4 w-4 ${pendente ? 'text-red-500' : 'text-green-500'}`} />
                            <span className="text-sm">Financeiro</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
