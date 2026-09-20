import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { 
  ArrowLeft, 
  Plus,
  Search,
  Edit,
  Trash2,
  Trophy,
  Calendar,
  UserPlus,
  TrendingUp
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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { POSICOES, posicaoNome, posicaoCorClasses } from './positions';
import { api, ApiError } from '../lib/api';

interface Player {
  id: number;
  name: string;
  age: number;
  /** Sigla da posição, referenciando o catálogo Posicoes (GOL/ZAG/LAT/VOL/MEI/ATA/PON) */
  position: string;
  photo?: string;
  number: number;
  stats: {
    gols: number;
    assistencias: number;
    cartoesAmarelos: number;
    cartoesVermelhos: number;
    jogos: number;
  };
}

interface JogadoresPageProps {
  peladaId: number;
  onNavigate: (page: string, peladaId?: number) => void;
}

// Formato que o back devolve (campos soltos, sem o objeto "stats" aninhado do front)
interface JogadorApi {
  id: number;
  name: string;
  age: number;
  position: string;
  number: number;
  gols: number;
  assistencias: number;
  cartoesAmarelos: number;
  cartoesVermelhos: number;
  jogos: number;
}

function jogadorApiParaPlayer(jogador: JogadorApi): Player {
  return {
    id: jogador.id,
    name: jogador.name,
    age: jogador.age,
    position: jogador.position,
    number: jogador.number,
    stats: {
      gols: jogador.gols,
      assistencias: jogador.assistencias,
      cartoesAmarelos: jogador.cartoesAmarelos,
      cartoesVermelhos: jogador.cartoesVermelhos,
      jogos: jogador.jogos,
    },
  };
}

// Função para calcular média do jogador
function calculatePlayerRating(player: Player): number {
  if (player.stats.jogos === 0) return 0;

  // Base: 5.0
  let rating = 5.0;

  // Gols aumentam a média (+0.3 por gol, máximo de +2.0)
  const golsBonus = Math.min((player.stats.gols / player.stats.jogos) * 3, 2.0);
  rating += golsBonus;

  // Cartões diminuem a média
  const totalCartoes = player.stats.cartoesAmarelos + (player.stats.cartoesVermelhos * 2);
  const cartoesPenalty = Math.min((totalCartoes / player.stats.jogos) * 1.5, 3.0);
  rating -= cartoesPenalty;

  // Garantir que a nota fique entre 0 e 10
  return Math.max(0, Math.min(10, rating));
}

interface PlayerForm {
  name: string;
  age: string;
  position: string;
  number: string;
}

const emptyPlayerForm: PlayerForm = { name: '', age: '', position: '', number: '' };

interface PlayerFieldsProps {
  idPrefix: string;
  form: PlayerForm;
  onChange: (form: PlayerForm) => void;
}

// Campos do jogador, usados nos diálogos de adicionar e editar.
function PlayerFields({ idPrefix, form, onChange }: PlayerFieldsProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Name`}>Nome Completo</Label>
        <Input
          id={`${idPrefix}Name`}
          placeholder="Ex: João da Silva"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}Age`}>Idade</Label>
          <Input
            id={`${idPrefix}Age`}
            type="number"
            placeholder="Ex: 28"
            value={form.age}
            onChange={(e) => onChange({ ...form, age: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}Number`}>Número</Label>
          <Input
            id={`${idPrefix}Number`}
            type="number"
            placeholder="Ex: 10"
            value={form.number}
            onChange={(e) => onChange({ ...form, number: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}Position`}>Posição</Label>
        <Select
          value={form.position}
          onValueChange={(value) => onChange({ ...form, position: value })}
        >
          <SelectTrigger id={`${idPrefix}Position`}>
            <SelectValue placeholder="Selecione a posição" />
          </SelectTrigger>
          <SelectContent>
            {POSICOES.map((pos) => (
              <SelectItem key={pos.sigla} value={pos.sigla}>{pos.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function formularioCompleto(form: PlayerForm): boolean {
  return form.name.trim() !== '' && form.age !== '' && form.position !== '' && form.number !== '';
}

export function JogadoresPage({ peladaId, onNavigate }: JogadoresPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Jogador que está sendo editado (null = diálogo de edição fechado)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editForm, setEditForm] = useState<PlayerForm>(emptyPlayerForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newPlayer, setNewPlayer] = useState<PlayerForm>(emptyPlayerForm);

  useEffect(() => {
    carregarJogadores();
  }, [peladaId]);

  async function carregarJogadores() {
    setLoading(true);
    setError(null);
    try {
      const jogadores = await api.get<JogadorApi[]>(`/peladas/${peladaId}/jogadores`);
      setPlayers(jogadores.map(jogadorApiParaPlayer));
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível carregar os jogadores." : "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    posicaoNome(player.position).toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleAddPlayer() {
    try {
      const jogadorCriado = await api.post<JogadorApi>(`/peladas/${peladaId}/jogadores`, {
        name: newPlayer.name,
        age: parseInt(newPlayer.age),
        position: newPlayer.position,
        number: parseInt(newPlayer.number),
      });

      setPlayers([...players, jogadorApiParaPlayer(jogadorCriado)]);
      setIsAddDialogOpen(false);
      setNewPlayer(emptyPlayerForm);
    } catch {
      setError("Não foi possível adicionar o jogador.");
    }
  }

  function abrirEdicao(player: Player) {
    setEditingPlayer(player);
    setEditError(null);
    setEditForm({
      name: player.name,
      age: String(player.age),
      position: player.position,
      number: String(player.number),
    });
  }

  async function handleSavePlayer() {
    if (!editingPlayer) return;

    setSavingEdit(true);
    setEditError(null);
    try {
      // Só manda os dados cadastrais: papel, status e estatísticas são mantidos pelo back.
      const jogadorAtualizado = await api.put<JogadorApi>(`/peladas/${peladaId}/jogadores/${editingPlayer.id}`, {
        name: editForm.name,
        age: parseInt(editForm.age),
        position: editForm.position,
        number: parseInt(editForm.number),
      });

      setPlayers(players.map(p => p.id === editingPlayer.id ? jogadorApiParaPlayer(jogadorAtualizado) : p));
      setEditingPlayer(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? "Não foi possível salvar as alterações." : "Não foi possível conectar ao servidor.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePlayer(id: number) {
    try {
      await api.delete(`/peladas/${peladaId}/jogadores/${id}`);
      setPlayers(players.filter(p => p.id !== id));
    } catch {
      setError("Não foi possível remover o jogador.");
    }
  }

  // Pega as duas primeiras iniciais do nome, ex: "João da Silva" -> "JD"
  function getInitials(name: string) {
    const partesDoNome = name.split(' ');
    let iniciais = '';
    for (const parte of partesDoNome) {
      iniciais += parte[0];
    }
    return iniciais.toUpperCase().substring(0, 2);
  }

  function getRatingColor(rating: number) {
    if (rating >= 7) return 'text-green-600';
    if (rating >= 5) return 'text-orange-600';
    return 'text-red-600';
  }

  // Função auxiliar: soma total de cartões de um jogador (usada só pra ordenar)
  function totalCartoes(player: Player) {
    return player.stats.cartoesAmarelos + player.stats.cartoesVermelhos * 2;
  }

  // Stats para o topo: pega o primeiro jogador de cada lista já ordenada
  const jogadoresPorGols = [...players].sort((a, b) => b.stats.gols - a.stats.gols);
  const topScorer = jogadoresPorGols[0];

  const jogadoresPorMedia = [...players].sort(
    (a, b) => calculatePlayerRating(b) - calculatePlayerRating(a)
  );
  const bestRating = jogadoresPorMedia[0];

  const jogadoresPorCartoes = [...players].sort(
    (a, b) => totalCartoes(b) - totalCartoes(a)
  );
  const mostCards = jogadoresPorCartoes[0];

  if (loading) {
    return <p className="text-muted-foreground">Carregando jogadores...</p>;
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
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
          <h1>Jogadores</h1>
          <p className="text-muted-foreground">
            {players.length} jogadores cadastrados
          </p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
        >
          <Plus className="h-4 w-4" />
          Adicionar Jogador
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total de Jogadores</p>
              <p className="text-3xl font-bold">{players.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Artilheiro</p>
              <p className="text-xl font-bold">
                {topScorer ? topScorer.name.split(' ')[0] : '—'}
              </p>
              <p className="text-sm text-green-600">
                {topScorer ? `${topScorer.stats.gols} gols` : 'Sem jogadores ainda'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Melhor Média</p>
              <p className="text-xl font-bold">
                {bestRating ? bestRating.name.split(' ')[0] : '—'}
              </p>
              <p className="text-sm text-blue-600">
                {bestRating ? `⭐ ${calculatePlayerRating(bestRating).toFixed(1)}` : 'Sem jogadores ainda'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Mais Cartões</p>
              <p className="text-xl font-bold">
                {mostCards ? mostCards.name.split(' ')[0] : '—'}
              </p>
              <p className="text-sm text-orange-600">
                {mostCards ? `${mostCards.stats.cartoesAmarelos + mostCards.stats.cartoesVermelhos} cartões` : 'Sem jogadores ainda'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar jogador por nome ou posição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Players Grid - Album Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredPlayers.map((player) => {
          const rating = calculatePlayerRating(player);
          
          return (
            <Card key={player.id} className="overflow-hidden hover:shadow-lg transition-all">
              <div className="relative">
                {/* Player Photo/Avatar */}
                <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={player.photo} alt={player.name} />
                    <AvatarFallback className="text-4xl">
                      {getInitials(player.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Number Badge */}
                <div className="absolute top-2 right-2">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold">{player.number}</span>
                  </div>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-2 left-2">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
                    <span className={`text-sm font-bold ${getRatingColor(rating)}`}>
                      ⭐ {rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Name and Position */}
                <div className="text-center">
                  <h3 className="font-bold truncate">{player.name}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Badge variant="secondary" className={posicaoCorClasses(player.position)}>
                      {posicaoNome(player.position)}
                    </Badge>
                    <Badge variant="outline">{player.age} anos</Badge>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">Gols</span>
                    </div>
                    <span className="font-bold text-green-600">{player.stats.gols}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-muted-foreground">Assistências</span>
                    </div>
                    <span className="font-bold text-blue-600">{player.stats.assistencias}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-3 bg-yellow-400 border border-yellow-600 rounded-sm"></div>
                        <div className="w-2 h-3 bg-red-600 border border-red-800 rounded-sm"></div>
                      </div>
                      <span className="text-sm text-muted-foreground">Cartões</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-yellow-700">{player.stats.cartoesAmarelos}</span>
                      <span className="text-xs text-red-700">{player.stats.cartoesVermelhos}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-muted-foreground">Jogos</span>
                    </div>
                    <span className="font-bold text-purple-600">{player.stats.jogos}</span>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Desempenho</span>
                    <span className={`font-bold ${getRatingColor(rating)}`}>
                      {rating.toFixed(1)}/10
                    </span>
                  </div>
                  <Progress 
                    value={(rating / 10) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => abrirEdicao(player)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeletePlayer(player.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Player Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Adicionar Novo Jogador
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do jogador
            </DialogDescription>
          </DialogHeader>

          <PlayerFields idPrefix="player" form={newPlayer} onChange={setNewPlayer} />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              className="border-2"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddPlayer}
              disabled={!formularioCompleto(newPlayer)}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              Adicionar Jogador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={editingPlayer !== null} onOpenChange={(open) => { if (!open) setEditingPlayer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Jogador
            </DialogTitle>
            <DialogDescription>
              Altere as informações do jogador
            </DialogDescription>
          </DialogHeader>

          <PlayerFields idPrefix="editPlayer" form={editForm} onChange={setEditForm} />

          {editError && <p className="text-sm text-destructive">{editError}</p>}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPlayer(null)}
              className="border-2"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSavePlayer}
              disabled={savingEdit || !formularioCompleto(editForm)}
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
