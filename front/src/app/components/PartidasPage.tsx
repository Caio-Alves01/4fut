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
  CheckCircle2,
  HelpCircle,
  XCircle,
  ClipboardList,
  Trash2,
  Flag
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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { EscalacaoCartolaPage } from './EscalacaoCartolaPage';
import { api, ApiError } from '../lib/api';

// Formatos devolvidos por GET /partidas/{id}/detalhes (presença e eventos ficam salvos no back).
interface GameEvent {
  id: number;
  tipo: 'gol' | 'amarelo' | 'vermelho';
  jogadorId: number;
  jogadorNome: string;
  /** Jogador que deu a assistência (apenas para eventos do tipo 'gol') */
  assistJogadorId: number | null;
  assistJogadorNome: string | null;
  minuto: number;
  time: 1 | 2;
}

interface Presenca {
  jogadorId: number;
  nome: string;
  tipoJogador: string; // mensalista | avulso
  confirmacao: 'confirmado' | 'pendente' | 'recusado';
  /** Só pode ser marcado depois da partida finalizada: compareceu de fato? */
  presente: boolean;
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
}

interface PartidaDetalhes {
  partida: Match;
  presencas: Presenca[];
  eventos: GameEvent[];
}

interface PartidasPageProps {
  peladaId: number;
  onNavigate: (page: string, peladaId?: number) => void;
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

interface MatchForm {
  date: string;
  time: string;
  location: string;
}

const emptyMatchForm: MatchForm = { date: '', time: '', location: '' };

// Data de hoje no formato do <input type="date"> (AAAA-MM-DD), no fuso do usuário.
function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Data e horário informados já passaram? (usa o relógio do usuário)
function dataHoraNoPassado(date: string, time: string): boolean {
  if (!date) return false;
  if (date < hojeISO()) return true;
  if (date === hojeISO() && time) {
    const [hora, minuto] = time.split(':').map(Number);
    const agora = new Date();
    return hora * 60 + minuto < agora.getHours() * 60 + agora.getMinutes();
  }
  return false;
}

// Mensagem de erro do formulário de partida (null = tudo certo para salvar).
function erroDoFormulario(form: MatchForm): string | null {
  if (dataHoraNoPassado(form.date, form.time)) {
    return 'Não é possível marcar uma partida em data ou horário que já passaram.';
  }
  return null;
}

interface MatchFieldsProps {
  idPrefix: string;
  form: MatchForm;
  onChange: (form: MatchForm) => void;
  error?: string | null;
}

// Campos da partida, usados nos diálogos de agendar e editar.
function MatchFields({ idPrefix, form, onChange, error }: MatchFieldsProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Date`}>Data</Label>
        <Input
          id={`${idPrefix}Date`}
          type="date"
          min={hojeISO()}
          value={form.date}
          onChange={(e) => onChange({ ...form, date: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Time`}>Horário</Label>
        <Input
          id={`${idPrefix}Time`}
          type="time"
          value={form.time}
          onChange={(e) => onChange({ ...form, time: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Location`}>Local</Label>
        <Input
          id={`${idPrefix}Location`}
          placeholder="Ex: Arena do Bairro"
          value={form.location}
          onChange={(e) => onChange({ ...form, location: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function PartidasPage({ peladaId, onNavigate }: PartidasPageProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showEscalacao, setShowEscalacao] = useState(false);

  // Partida que está sendo editada (null = diálogo de edição fechado)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editForm, setEditForm] = useState<MatchForm>(emptyMatchForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [jogadoresAtivos, setJogadoresAtivos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca as partidas e os jogadores reais da pelada no back-end assim que a página abre.
  useEffect(() => {
    async function carregarPartidas() {
      setLoading(true);
      setError(null);
      try {
        const [data, jogadores] = await Promise.all([
          api.get<Match[]>(`/peladas/${peladaId}/partidas`),
          api.get<{ status: string }[]>(`/peladas/${peladaId}/jogadores`),
        ]);
        setMatches(data);
        setJogadoresAtivos(jogadores.filter(j => j.status === 'ativo').length);
      } catch (err) {
        setError(err instanceof ApiError ? 'Não foi possível carregar as partidas.' : 'Não foi possível conectar ao servidor.');
      } finally {
        setLoading(false);
      }
    }
    carregarPartidas();
  }, [peladaId]);

  const [newMatch, setNewMatch] = useState<MatchForm>(emptyMatchForm);

  // Presença e eventos da partida aberta (carregados do back ao abrir a partida).
  const [detalhes, setDetalhes] = useState<PartidaDetalhes | null>(null);
  const [detalhesError, setDetalhesError] = useState<string | null>(null);
  const [confirmarFinalizacao, setConfirmarFinalizacao] = useState(false);
  const [finalizando, setFinalizando] = useState(false);


  // Erros de data no passado. Na edição só vale se o usuário mudou data ou horário
  // (uma partida antiga ainda agendada pode ter o local corrigido sem mexer na data).
  const erroNovaPartida = erroDoFormulario(newMatch);
  const mudouDataHora = editingMatch !== null &&
    (editForm.date !== editingMatch.date.slice(0, 10) || editForm.time !== editingMatch.time);
  const erroEdicao = mudouDataHora ? erroDoFormulario(editForm) : null;

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

      setMatches([...matches, partidaCriada]);
      setIsCreateDialogOpen(false);
      setNewMatch(emptyMatchForm);
    } catch (err) {
      setError(err instanceof ApiError ? 'Não foi possível agendar a partida.' : 'Não foi possível conectar ao servidor.');
    }
  }

  function abrirEdicao(match: Match) {
    setEditingMatch(match);
    setEditError(null);
    setEditForm({
      // A API devolve a data como "2026-09-25T00:00:00"; o input de data quer só "2026-09-25".
      date: match.date.slice(0, 10),
      time: match.time,
      location: match.location,
    });
  }

  async function handleSalvarEdicao() {
    if (!editingMatch) return;

    setSavingEdit(true);
    setEditError(null);
    try {
      // Status e placar seguem os atuais da partida; a edição só muda data, horário e local.
      const partidaAtualizada = await api.put<Match>(`/peladas/${peladaId}/partidas/${editingMatch.id}`, {
        date: editForm.date,
        time: editForm.time,
        location: editForm.location,
        status: editingMatch.status,
        scoreTeam1: editingMatch.scoreTeam1 ?? null,
        scoreTeam2: editingMatch.scoreTeam2 ?? null,
      });

      setMatches(matches.map(m => m.id === editingMatch.id ? partidaAtualizada : m));
      setEditingMatch(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? 'Não foi possível salvar as alterações.' : 'Não foi possível conectar ao servidor.');
    } finally {
      setSavingEdit(false);
    }
  }

  // Troca o status de confirmação seguindo sempre a mesma ordem.
  function nextConfirmacao(status: Presenca['confirmacao']): Presenca['confirmacao'] {
    if (status === 'pendente') return 'confirmado';
    if (status === 'confirmado') return 'recusado';
    return 'pendente';
  }

  // Mensagem do back (400 com texto) ou uma genérica.
  function mensagemDeErro(err: unknown, padrao: string): string {
    if (!(err instanceof ApiError)) return 'Não foi possível conectar ao servidor.';
    return err.status === 400 && err.message && !err.message.startsWith('{') ? err.message : padrao;
  }

  // Atualiza a partida na tela de detalhes e na lista (placar e status vêm do back).
  function aplicarPartida(partida: Match) {
    setSelectedMatch(partida);
    setMatches((atuais) => atuais.map((m) => (m.id === partida.id ? partida : m)));
  }

  async function carregarDetalhes(partidaId: number) {
    setDetalhesError(null);
    try {
      const dados = await api.get<PartidaDetalhes>(`/peladas/${peladaId}/partidas/${partidaId}/detalhes`);
      setDetalhes(dados);
      aplicarPartida(dados.partida);
    } catch (err) {
      setDetalhesError(mensagemDeErro(err, 'Não foi possível carregar a presença e os eventos da partida.'));
    }
  }

  function abrirPartida(match: Match) {
    setSelectedMatch(match);
    setDetalhes(null);
    setShowEscalacao(true);
    carregarDetalhes(match.id);
  }

  // Salva a presença de um jogador. Avulso marcado como presente gera cobrança no financeiro.
  async function salvarPresenca(presenca: Presenca, mudanca: Partial<Pick<Presenca, 'confirmacao' | 'presente'>>) {
    if (!selectedMatch || !detalhes) return;

    const nova = { ...presenca, ...mudanca };
    setDetalhesError(null);
    try {
      const salva = await api.put<Presenca>(
        `/peladas/${peladaId}/partidas/${selectedMatch.id}/presencas/${presenca.jogadorId}`,
        { confirmacao: nova.confirmacao, presente: nova.presente },
      );
      setDetalhes({
        ...detalhes,
        presencas: detalhes.presencas.map((p) => (p.jogadorId === salva.jogadorId ? salva : p)),
      });
    } catch (err) {
      setDetalhesError(mensagemDeErro(err, 'Não foi possível salvar a presença.'));
    }
  }

  function handleToggleConfirmacao(presenca: Presenca) {
    salvarPresenca(presenca, { confirmacao: nextConfirmacao(presenca.confirmacao) });
  }

  function handleTogglePresente(presenca: Presenca) {
    salvarPresenca(presenca, { presente: !presenca.presente });
  }

  // Ids guardados como string porque é o que o <Select> trabalha.
  const [newEvent, setNewEvent] = useState({
    tipo: 'gol' as GameEvent['tipo'],
    jogadorId: '',
    assistJogadorId: '',
    time: '1' as '1' | '2',
    minuto: ''
  });

  // Registra o evento no back; cartão gera multa no financeiro e gol atualiza o placar.
  async function handleAddEvent() {
    if (!selectedMatch) return;
    if (!newEvent.jogadorId || !newEvent.minuto) return;

    setDetalhesError(null);
    try {
      await api.post(`/peladas/${peladaId}/partidas/${selectedMatch.id}/eventos`, {
        tipo: newEvent.tipo,
        jogadorId: Number(newEvent.jogadorId),
        assistJogadorId: newEvent.tipo === 'gol' && newEvent.assistJogadorId ? Number(newEvent.assistJogadorId) : null,
        minuto: parseInt(newEvent.minuto),
        time: Number(newEvent.time),
      });
      setNewEvent({ tipo: 'gol', jogadorId: '', assistJogadorId: '', time: '1', minuto: '' });
      await carregarDetalhes(selectedMatch.id);
    } catch (err) {
      setDetalhesError(mensagemDeErro(err, 'Não foi possível registrar o evento.'));
    }
  }

  async function handleRemoverEvento(eventoId: number) {
    if (!selectedMatch) return;

    setDetalhesError(null);
    try {
      await api.delete(`/peladas/${peladaId}/partidas/${selectedMatch.id}/eventos/${eventoId}`);
      await carregarDetalhes(selectedMatch.id);
    } catch (err) {
      setDetalhesError(mensagemDeErro(err, 'Não foi possível remover o evento.'));
    }
  }

  // Finalizar libera a marcação de quem compareceu (e com ela a cobrança dos avulsos).
  async function handleFinalizarPartida() {
    if (!selectedMatch) return;

    setFinalizando(true);
    setDetalhesError(null);
    try {
      await api.put<Match>(`/peladas/${peladaId}/partidas/${selectedMatch.id}`, {
        date: selectedMatch.date,
        time: selectedMatch.time,
        location: selectedMatch.location,
        status: 'finalizada',
        scoreTeam1: selectedMatch.scoreTeam1 ?? null,
        scoreTeam2: selectedMatch.scoreTeam2 ?? null,
      });
      setConfirmarFinalizacao(false);
      await carregarDetalhes(selectedMatch.id);
    } catch (err) {
      setDetalhesError(mensagemDeErro(err, 'Não foi possível finalizar a partida.'));
    } finally {
      setFinalizando(false);
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
    const presencas = detalhes?.presencas ?? [];
    const eventos = detalhes?.eventos ?? [];

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
          {selectedMatch.status !== 'finalizada' ? (
            <Button
              className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
              onClick={() => setConfirmarFinalizacao(true)}
            >
              <Flag className="h-4 w-4" />
              Finalizar Partida
            </Button>
          ) : (
            getStatusBadge(selectedMatch.status)
          )}
        </div>

        {detalhesError && <p className="text-sm text-destructive">{detalhesError}</p>}
        {!detalhes && !detalhesError && <p className="text-muted-foreground">Carregando presença e eventos...</p>}

        <AlertDialog open={confirmarFinalizacao} onOpenChange={(open) => { if (!finalizando) setConfirmarFinalizacao(open); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalizar partida?</AlertDialogTitle>
              <AlertDialogDescription>
                Depois de finalizar, marque na aba Presença quem compareceu. Avulsos marcados como presentes
                geram cobrança automaticamente no financeiro.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={finalizando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleFinalizarPartida(); }}
                disabled={finalizando}
              >
                {finalizando ? 'Finalizando...' : 'Finalizar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                  {eventos.filter(e => e.tipo === 'amarelo').length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Amarelos</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="w-6 h-8 bg-red-600 border-2 border-red-800 rounded-sm mx-auto mb-2"></div>
                <p className="text-3xl font-bold text-red-700">
                  {eventos.filter(e => e.tipo === 'vermelho').length}
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
                  {detalhes && presencas.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum jogador ativo nesta pelada. Cadastre jogadores na aba Jogadores.
                    </p>
                  )}
                  {presencas.map((p) => (
                    <div key={p.jogadorId} className="flex items-center justify-between p-3 border rounded-lg gap-4 flex-wrap">
                      <span className="font-medium flex items-center gap-2">
                        {p.nome}
                        {p.tipoJogador === 'avulso' && <Badge variant="outline">Avulso</Badge>}
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleToggleConfirmacao(p)}
                          className="cursor-pointer"
                          title="Clique para alternar a confirmação"
                        >
                          {confirmacaoBadge(p.confirmacao)}
                        </button>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={p.presente}
                            disabled={selectedMatch.status !== 'finalizada'}
                            onCheckedChange={() => handleTogglePresente(p)}
                          />
                          <Label className="text-sm text-muted-foreground">Presente</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedMatch.status !== 'finalizada' ? (
                  <p className="text-xs text-muted-foreground mt-3">
                    A confirmação de presença real (compareceu) só fica disponível após a partida ser finalizada.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3">
                    Avulsos marcados como presentes geram cobrança na aba "A receber" das finanças.
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
                      value={newEvent.tipo}
                      onValueChange={(value: GameEvent['tipo']) => setNewEvent({ ...newEvent, tipo: value, assistJogadorId: '' })}
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
                      value={newEvent.jogadorId}
                      onValueChange={(value) => setNewEvent({ ...newEvent, jogadorId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {presencas.map((p) => (
                          <SelectItem key={p.jogadorId} value={String(p.jogadorId)}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newEvent.tipo === 'gol' && (
                    <div className="space-y-2">
                      <Label>Assistência (opcional)</Label>
                      <Select
                        value={newEvent.assistJogadorId || 'none'}
                        onValueChange={(value) => setNewEvent({ ...newEvent, assistJogadorId: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem assistência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem assistência</SelectItem>
                          {presencas.filter(p => String(p.jogadorId) !== newEvent.jogadorId).map((p) => (
                            <SelectItem key={p.jogadorId} value={String(p.jogadorId)}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Select
                      value={newEvent.time}
                      onValueChange={(value: '1' | '2') => setNewEvent({ ...newEvent, time: value })}
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
                      min={0}
                      placeholder="Ex: 23"
                      value={newEvent.minuto}
                      onChange={(e) => setNewEvent({ ...newEvent, minuto: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  className="mt-4 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
                  disabled={!detalhes || !newEvent.jogadorId || !newEvent.minuto}
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
                  {eventos.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum evento registrado ainda.
                    </p>
                  )}
                  {eventos.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{event.minuto}'</Badge>
                        {event.tipo === 'gol' && <span>⚽</span>}
                        {event.tipo === 'amarelo' && <div className="w-3 h-4 bg-yellow-400 border border-yellow-600 rounded-sm"></div>}
                        {event.tipo === 'vermelho' && <div className="w-3 h-4 bg-red-600 border border-red-800 rounded-sm"></div>}
                        <div>
                          <p className="font-medium">
                            {event.jogadorNome}
                            {event.assistJogadorNome && (
                              <span className="text-sm text-muted-foreground"> (assist: {event.assistJogadorNome})</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Time {event.time}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          aria-label="Remover evento"
                          title="Remover evento (cancela a multa do cartão, se ainda não foi paga)"
                          onClick={() => handleRemoverEvento(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
              <p className="text-2xl font-bold">{jogadoresAtivos}</p>
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
                      onClick={() => abrirPartida(match)}
                    >
                      Montar Escalação
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-2 hover:bg-secondary hover:text-white transition-colors"
                      aria-label="Editar partida"
                      onClick={() => abrirEdicao(match)}
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
                        onClick={() => abrirPartida(match)}
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

          <MatchFields idPrefix="match" form={newMatch} onChange={setNewMatch} error={erroNovaPartida} />

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
              disabled={!newMatch.date || !newMatch.time || !newMatch.location.trim() || erroNovaPartida !== null}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              Agendar Partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={editingMatch !== null} onOpenChange={(open) => { if (!open) setEditingMatch(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Partida
            </DialogTitle>
            <DialogDescription>
              Altere a data, o horário ou o local da partida
            </DialogDescription>
          </DialogHeader>

          <MatchFields idPrefix="editMatch" form={editForm} onChange={setEditForm} error={erroEdicao ?? editError} />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingMatch(null)}
              className="border-2"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarEdicao}
              disabled={savingEdit || !editForm.date || !editForm.time || !editForm.location.trim() || erroEdicao !== null}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
