import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  ArrowLeft,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Users,
  Share2,
  Eye,
  Edit,
  Trophy,
  History,
  X,
  AlertTriangle,
  AlertCircle,
  Save,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ClipboardList
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { EscalacaoCartolaPage } from './EscalacaoCartolaPage';
import { api, ApiError } from '../lib/api';

interface GameEvent {
  id: number;
  type: 'gol' | 'amarelo' | 'vermelho';
  player: string;
  /** Jogador que deu a assistência (apenas para eventos do tipo 'gol') */
  assistPlayer?: string;
  minute: number;
  team: 1 | 2;
}

interface Presenca {
  jogadorId: number;
  nome: string;
  confirmacao: 'confirmado' | 'pendente' | 'recusado';
  /** Preenchido só depois da partida: compareceu de fato? */
  presente: boolean | null;
}

interface Match {
  id: number;
  date: string;
  time: string;
  location: string;
  status: 'agendada' | 'em_andamento' | 'finalizada';
  scoreTeam1?: number;
  scoreTeam2?: number;
  team1Players?: number;
  team2Players?: number;
  events?: GameEvent[];
  presencas?: Presenca[];
}

interface PartidasPageProps {
  peladaId: number;
  onNavigate: (page: string, peladaId?: number) => void;
}

// Elenco padrão da pelada usado para inicializar as confirmações de presença.
const ELENCO_PELADA = [
  'João Silva', 'Pedro Santos', 'Carlos Lima', 'Rafael Costa', 'André Souza',
  'Fernando Silva', 'Roberto Lima', 'Marcos Santos', 'Diego Costa', 'Luis Fernandes', 'Gabriel Rocha'
];

function defaultPresencas(): Presenca[] {
  return ELENCO_PELADA.map((nome, index) => ({
    jogadorId: index + 1,
    nome,
    confirmacao: 'pendente',
    presente: null
  }));
}

// Badge visual pro status de confirmação de presença de um jogador.
function confirmacaoBadge(status: Presenca['confirmacao']) {
  if (status === 'confirmado') {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1 w-fit">
        <CheckCircle2 className="h-3 w-3" /> Confirmado
      </Badge>
    );
  }
  if (status === 'recusado') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
        <XCircle className="h-3 w-3" /> Recusado
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
      <HelpCircle className="h-3 w-3" /> Pendente
    </Badge>
  );
}

export function PartidasPage({ peladaId, onNavigate }: PartidasPageProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showEscalacao, setShowEscalacao] = useState(false);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca as partidas reais da pelada no back-end assim que a página abre.
  useEffect(() => {
    async function carregarPartidas() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<Match[]>(`/peladas/${peladaId}/partidas`);
        setMatches(data);
      } catch (err) {
        setError(err instanceof ApiError ? 'Não foi possível carregar as partidas.' : 'Não foi possível conectar ao servidor.');
      } finally {
        setLoading(false);
      }
    }
    carregarPartidas();
  }, [peladaId]);

  const [newMatch, setNewMatch] = useState({
    date: '',
    time: '',
    location: ''
  });



  const upcomingMatches = matches.filter(m => m.status === 'agendada');
  const pastMatches = matches.filter(m => m.status === 'finalizada');

  // Soma o placar de todas as partidas já realizadas.
  let totalGolsMarcados = 0;
  for (const m of pastMatches) {
    totalGolsMarcados += (m.scoreTeam1 || 0) + (m.scoreTeam2 || 0);
  }

  async function handleCreateMatch() {
    try {
      const partidaCriada = await api.post<Match>(`/peladas/${peladaId}/partidas`, {
        date: newMatch.date,
        time: newMatch.time,
        location: newMatch.location,
      });

      const match: Match = {
        ...partidaCriada,
        events: [],
        presencas: defaultPresencas()
      };

      setMatches([...matches, match]);
      setIsCreateDialogOpen(false);
      setNewMatch({ date: '', time: '', location: '' });
    } catch (err) {
      setError(err instanceof ApiError ? 'Não foi possível agendar a partida.' : 'Não foi possível conectar ao servidor.');
    }
  }

  // Troca o status de confirmação seguindo sempre a mesma ordem.
  function nextConfirmacao(status: Presenca['confirmacao']): Presenca['confirmacao'] {
    if (status === 'pendente') return 'confirmado';
    if (status === 'confirmado') return 'recusado';
    return 'pendente';
  }

  // Cada handler abaixo faz o mesmo passo a passo: pega a lista de presença
  // atual, monta a lista nova já atualizada, e salva essa lista nos dois
  // lugares que o protótipo guarda o estado (selectedMatch e matches).
  function handleToggleConfirmacao(jogadorId: number) {
    if (!selectedMatch) return;

    const presencaAtual = selectedMatch.presencas || defaultPresencas();
    const novaPresenca = presencaAtual.map((p) => {
      if (p.jogadorId !== jogadorId) return p;
      return { ...p, confirmacao: nextConfirmacao(p.confirmacao) };
    });
    const matchAtualizada = { ...selectedMatch, presencas: novaPresenca };

    setSelectedMatch(matchAtualizada);
    setMatches(matches.map((m) => (m.id === matchAtualizada.id ? matchAtualizada : m)));
  }

  function handleTogglePresente(jogadorId: number) {
    if (!selectedMatch) return;

    const presencaAtual = selectedMatch.presencas || defaultPresencas();
    const novaPresenca = presencaAtual.map((p) => {
      if (p.jogadorId !== jogadorId) return p;
      return { ...p, presente: !p.presente };
    });
    const matchAtualizada = { ...selectedMatch, presencas: novaPresenca };

    setSelectedMatch(matchAtualizada);
    setMatches(matches.map((m) => (m.id === matchAtualizada.id ? matchAtualizada : m)));
  }

  const [newEvent, setNewEvent] = useState({
    type: 'gol' as GameEvent['type'],
    player: '',
    assistPlayer: '',
    team: '1' as '1' | '2',
    minute: ''
  });

  function handleAddEvent() {
    if (!selectedMatch) return;
    if (!newEvent.player || !newEvent.minute) return;

    let assistPlayer: string | undefined = undefined;
    if (newEvent.type === 'gol' && newEvent.assistPlayer) {
      assistPlayer = newEvent.assistPlayer;
    }

    let team: 1 | 2 = 1;
    if (newEvent.team === '2') team = 2;

    const eventosAtuais = selectedMatch.events || [];
    const novoEvento: GameEvent = {
      id: eventosAtuais.length + 1 + Math.floor(Math.random() * 1000),
      type: newEvent.type,
      player: newEvent.player,
      assistPlayer,
      minute: parseInt(newEvent.minute),
      team
    };

    const eventos = [...eventosAtuais, novoEvento].sort((a, b) => a.minute - b.minute);

    let scoreTeam1 = selectedMatch.scoreTeam1 || 0;
    let scoreTeam2 = selectedMatch.scoreTeam2 || 0;
    if (novoEvento.type === 'gol') {
      if (novoEvento.team === 1) scoreTeam1 += 1;
      else scoreTeam2 += 1;
    }

    const matchAtualizada = { ...selectedMatch, events: eventos, scoreTeam1, scoreTeam2 };
    setSelectedMatch(matchAtualizada);
    setMatches(matches.map((m) => (m.id === matchAtualizada.id ? matchAtualizada : m)));

    setNewEvent({ type: 'gol', player: '', assistPlayer: '', team: '1', minute: '' });
  }

  // Persiste no back-end a data/hora/local/status/placar atual da partida selecionada.
  async function handleSalvarPartida(match: Match) {
    try {
      await api.put(`/peladas/${peladaId}/partidas/${match.id}`, {
        date: match.date,
        time: match.time,
        location: match.location,
        status: match.status,
        scoreTeam1: match.scoreTeam1 ?? null,
        scoreTeam2: match.scoreTeam2 ?? null,
      });
    } catch (err) {
      setError(err instanceof ApiError ? 'Não foi possível salvar a partida.' : 'Não foi possível conectar ao servidor.');
    }
  }

  function getStatusBadge(status: Match['status']) {
    switch (status) {
      case 'agendada':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Agendada</Badge>;
      case 'em_andamento':
        return <Badge variant="default" className="bg-green-100 text-green-800">Em Andamento</Badge>;
      case 'finalizada':
        return <Badge variant="outline">Finalizada</Badge>;
    }
  }



  if (loading) {
    return <p className="text-muted-foreground">Carregando partidas...</p>;
  }

  if (showEscalacao && selectedMatch) {
    const presencas = selectedMatch.presencas || defaultPresencas();
    const roster = presencas.map(p => p.nome);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowEscalacao(false)}
            className="flex items-center gap-2 border-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Partidas
          </Button>
          <div className="flex-1">
            <h1>Escalação e Eventos da Partida</h1>
            <p className="text-muted-foreground">
              {new Date(selectedMatch.date).toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })} às {selectedMatch.time} - {selectedMatch.location}
            </p>
          </div>
          <Button
            className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            onClick={() => handleSalvarPartida(selectedMatch)}
          >
            <Save className="h-4 w-4" />
            Salvar Partida
          </Button>
        </div>

        {/* Match Score Summary */}
        <Card className="border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex-1 text-center">
                <h3 className="mb-2">Time 1</h3>
                <div className="text-7xl font-bold text-green-600">
                  {selectedMatch.scoreTeam1 || 0}
                </div>
              </div>
              
              <div className="text-4xl font-bold text-muted-foreground">×</div>
              
              <div className="flex-1 text-center">
                <h3 className="mb-2">Time 2</h3>
                <div className="text-7xl font-bold text-blue-600">
                  {selectedMatch.scoreTeam2 || 0}
                </div>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-3xl font-bold text-green-600">
                  {(selectedMatch.scoreTeam1 || 0) + (selectedMatch.scoreTeam2 || 0)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Gols Total</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="w-6 h-8 bg-yellow-400 border-2 border-yellow-600 rounded-sm mx-auto mb-2"></div>
                <p className="text-3xl font-bold text-yellow-700">
                  {(selectedMatch.events || []).filter(e => e.type === 'amarelo').length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Amarelos</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="w-6 h-8 bg-red-600 border-2 border-red-800 rounded-sm mx-auto mb-2"></div>
                <p className="text-3xl font-bold text-red-700">
                  {(selectedMatch.events || []).filter(e => e.type === 'vermelho').length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Vermelhos</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <strong>Dica:</strong> Use os botões rápidos "⚽ Gol" e "🟨/🟥 Cartão" ao lado de cada jogador escalado para registrar eventos durante a partida.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Presença / Escalação / Eventos */}
        <Tabs defaultValue="presenca" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="presenca" className="text-base">
              <ClipboardList className="h-4 w-4 mr-2" />
              Presença
            </TabsTrigger>
            <TabsTrigger value="escalacao" className="text-base">
              <Users className="h-4 w-4 mr-2" />
              Escalação
            </TabsTrigger>
            <TabsTrigger value="eventos" className="text-base">
              <Trophy className="h-4 w-4 mr-2" />
              Eventos
            </TabsTrigger>
          </TabsList>

          {/* Presença (RSVP) */}
          <TabsContent value="presenca" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Confirmação de Presença</span>
                  <Badge variant="outline">
                    {presencas.filter(p => p.confirmacao === 'confirmado').length}/{presencas.length} confirmados
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {presencas.map((p) => (
                    <div key={p.jogadorId} className="flex items-center justify-between p-3 border rounded-lg gap-4 flex-wrap">
                      <span className="font-medium">{p.nome}</span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleToggleConfirmacao(p.jogadorId)}
                          className="cursor-pointer"
                          title="Clique para alternar a confirmação"
                        >
                          {confirmacaoBadge(p.confirmacao)}
                        </button>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!!p.presente}
                            disabled={selectedMatch.status !== 'finalizada'}
                            onCheckedChange={() => handleTogglePresente(p.jogadorId)}
                          />
                          <Label className="text-sm text-muted-foreground">Presente</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedMatch.status !== 'finalizada' && (
                  <p className="text-xs text-muted-foreground mt-3">
                    A confirmação de presença real (compareceu) só fica disponível após a partida ser finalizada.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escalação (Cartola) */}
          <TabsContent value="escalacao" className="mt-6">
            <Tabs defaultValue="team1" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="team1" className="text-base">
                  <Users className="h-4 w-4 mr-2" />
                  Time 1
                </TabsTrigger>
                <TabsTrigger value="team2" className="text-base">
                  <Users className="h-4 w-4 mr-2" />
                  Time 2
                </TabsTrigger>
              </TabsList>

              <TabsContent value="team1" className="mt-6">
                <DndProvider backend={HTML5Backend}>
                  <EscalacaoCartolaPage onNavigate={onNavigate} />
                </DndProvider>
              </TabsContent>

              <TabsContent value="team2" className="mt-6">
                <DndProvider backend={HTML5Backend}>
                  <EscalacaoCartolaPage onNavigate={onNavigate} />
                </DndProvider>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Eventos (gol / cartões) */}
          <TabsContent value="eventos" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Evento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newEvent.type}
                      onValueChange={(value: GameEvent['type']) => setNewEvent({ ...newEvent, type: value, assistPlayer: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gol">⚽ Gol</SelectItem>
                        <SelectItem value="amarelo">🟨 Cartão Amarelo</SelectItem>
                        <SelectItem value="vermelho">🟥 Cartão Vermelho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jogador</Label>
                    <Select
                      value={newEvent.player}
                      onValueChange={(value) => setNewEvent({ ...newEvent, player: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {roster.map((nome) => (
                          <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newEvent.type === 'gol' && (
                    <div className="space-y-2">
                      <Label>Assistência (opcional)</Label>
                      <Select
                        value={newEvent.assistPlayer || 'none'}
                        onValueChange={(value) => setNewEvent({ ...newEvent, assistPlayer: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem assistência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem assistência</SelectItem>
                          {roster.filter(n => n !== newEvent.player).map((nome) => (
                            <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Select
                      value={newEvent.team}
                      onValueChange={(value: '1' | '2') => setNewEvent({ ...newEvent, team: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Time 1</SelectItem>
                        <SelectItem value="2">Time 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Minuto</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 23"
                      value={newEvent.minute}
                      onChange={(e) => setNewEvent({ ...newEvent, minute: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  className="mt-4 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
                  disabled={!newEvent.player || !newEvent.minute}
                  onClick={handleAddEvent}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Evento
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(selectedMatch.events || []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum evento registrado ainda.
                    </p>
                  )}
                  {(selectedMatch.events || []).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{event.minute}'</Badge>
                        {event.type === 'gol' && <span>⚽</span>}
                        {event.type === 'amarelo' && <div className="w-3 h-4 bg-yellow-400 border border-yellow-600 rounded-sm"></div>}
                        {event.type === 'vermelho' && <div className="w-3 h-4 bg-red-600 border border-red-800 rounded-sm"></div>}
                        <div>
                          <p className="font-medium">
                            {event.player}
                            {event.assistPlayer && (
                              <span className="text-sm text-muted-foreground"> (assist: {event.assistPlayer})</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Time {event.team}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => onNavigate('pelada-detail', peladaId)}
          className="flex items-center gap-2 border-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1>Partidas</h1>
          <p className="text-muted-foreground">
            {matches.length} partidas registradas
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
        >
          <Plus className="h-4 w-4" />
          Agendar Partida
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{upcomingMatches.length}</p>
              <p className="text-sm text-muted-foreground">Próximas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <History className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{pastMatches.length}</p>
              <p className="text-sm text-muted-foreground">Realizadas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">
                {totalGolsMarcados}
              </p>
              <p className="text-sm text-muted-foreground">Gols Marcados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">22</p>
              <p className="text-sm text-muted-foreground">Jogadores Ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <div>
          <h2 className="mb-4">Próximas Partidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      {new Date(match.date).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </CardTitle>
                    {getStatusBadge(match.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{match.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{match.location}</span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button 
                      className="flex-1 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
                      onClick={() => {
                        setSelectedMatch(match);
                        setShowEscalacao(true);
                      }}
                    >
                      Montar Escalação
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-2 hover:bg-secondary hover:text-white transition-colors"
                      onClick={() => {
                        // TODO: Implement edit functionality
                        console.log('Edit match:', match.id);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Match History */}
      {pastMatches.length > 0 && (
        <div>
          <h2 className="mb-4">Histórico de Partidas</h2>
          <div className="space-y-4">
            {pastMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center min-w-24">
                        <p className="text-sm text-muted-foreground">
                          {new Date(match.date).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-sm text-muted-foreground">{match.time}</p>
                      </div>

                      <div className="flex-1 flex items-center justify-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Time 1</p>
                          <p className="text-4xl font-bold">{match.scoreTeam1}</p>
                        </div>

                        <div className="text-2xl font-bold text-muted-foreground">×</div>

                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Time 2</p>
                          <p className="text-4xl font-bold">{match.scoreTeam2}</p>
                        </div>
                      </div>

                      <div className="text-right min-w-32">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <MapPin className="h-4 w-4" />
                          <span>{match.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-2 hover:bg-primary hover:text-white hover:border-primary transition-colors"
                        onClick={() => {
                          setSelectedMatch(match);
                          setShowEscalacao(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Match Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendar Nova Partida
            </DialogTitle>
            <DialogDescription>
              Preencha as informações da partida
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="matchDate">Data</Label>
              <Input
                id="matchDate"
                type="date"
                value={newMatch.date}
                onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchTime">Horário</Label>
              <Input
                id="matchTime"
                type="time"
                value={newMatch.time}
                onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchLocation">Local</Label>
              <Input
                id="matchLocation"
                placeholder="Ex: Arena do Bairro"
                value={newMatch.location}
                onChange={(e) => setNewMatch({ ...newMatch, location: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-2"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateMatch}
              disabled={!newMatch.date || !newMatch.time || !newMatch.location}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              Agendar Partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
