import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Trophy,
  Users,
  Shuffle,
  Save,
  AlertCircle,
  TrendingUp,
  BarChart3,
  UserPlus,
  X,
  AlertTriangle,
  Plus,
  Minus,
  LayoutGrid,
  List
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { posicaoNome, posicaoCorClasses } from './positions';

interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  photo?: string;
  stats: {
    gols: number;
    jogos: number;
    cartoes_amarelos: number;
    cartoes_vermelhos: number;
    nota_media: number;
  };
  matchStats?: {
    gols: number;
    amarelos: number;
    vermelhos: number;
  };
}

interface FormationPosition {
  x: number;
  y: number;
  position: string;
  player: Player | null;
}

interface EscalacaoCartolaPageProps {
  onNavigate: (page: string) => void;
}

const mockPlayers: Player[] = [
  {
    id: 1,
    name: "João Silva",
    position: "GOL",
    number: 1,
    stats: { gols: 0, jogos: 15, cartoes_amarelos: 1, cartoes_vermelhos: 0, nota_media: 7.2 },
    matchStats: { gols: 0, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 2,
    name: "Pedro Santos",
    position: "ZAG",
    number: 2,
    stats: { gols: 3, jogos: 15, cartoes_amarelos: 4, cartoes_vermelhos: 1, nota_media: 6.8 },
    matchStats: { gols: 0, amarelos: 1, vermelhos: 0 }
  },
  {
    id: 3,
    name: "Carlos Lima",
    position: "ZAG",
    number: 3,
    stats: { gols: 1, jogos: 14, cartoes_amarelos: 3, cartoes_vermelhos: 0, nota_media: 7.0 },
    matchStats: { gols: 0, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 4,
    name: "Rafael Costa",
    position: "LAT",
    number: 4,
    stats: { gols: 2, jogos: 15, cartoes_amarelos: 2, cartoes_vermelhos: 0, nota_media: 7.5 },
    matchStats: { gols: 0, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 5,
    name: "André Souza",
    position: "LAT",
    number: 5,
    stats: { gols: 1, jogos: 13, cartoes_amarelos: 1, cartoes_vermelhos: 0, nota_media: 7.1 },
    matchStats: { gols: 0, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 6,
    name: "Fernando Silva",
    position: "VOL",
    number: 6,
    stats: { gols: 0, jogos: 15, cartoes_amarelos: 5, cartoes_vermelhos: 0, nota_media: 6.9 },
    matchStats: { gols: 0, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 7,
    name: "Roberto Lima",
    position: "MEI",
    number: 7,
    stats: { gols: 4, jogos: 15, cartoes_amarelos: 2, cartoes_vermelhos: 0, nota_media: 8.1 },
    matchStats: { gols: 1, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 8,
    name: "Marcos Santos",
    position: "MEI",
    number: 8,
    stats: { gols: 5, jogos: 14, cartoes_amarelos: 1, cartoes_vermelhos: 0, nota_media: 7.8 },
    matchStats: { gols: 0, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 9,
    name: "Diego Costa",
    position: "ATA",
    number: 9,
    stats: { gols: 18, jogos: 15, cartoes_amarelos: 3, cartoes_vermelhos: 0, nota_media: 8.5 },
    matchStats: { gols: 2, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 10,
    name: "Luis Fernandes",
    position: "ATA",
    number: 10,
    stats: { gols: 15, jogos: 15, cartoes_amarelos: 2, cartoes_vermelhos: 0, nota_media: 8.3 },
    matchStats: { gols: 2, amarelos: 0, vermelhos: 0 }
  },
  {
    id: 11,
    name: "Gabriel Rocha",
    position: "PON",
    number: 11,
    stats: { gols: 6, jogos: 12, cartoes_amarelos: 0, cartoes_vermelhos: 0, nota_media: 7.4 },
    matchStats: { gols: 0, amarelos: 0, vermelhos: 0 }
  }
];

const ITEM_TYPE = 'PLAYER';

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

// Junta a mudança de um jogador (gol ou cartão) com os dados que ele já tinha,
// devolvendo um novo objeto Player (React não deixa alterar o objeto antigo
// diretamente, por isso sempre criamos um novo com os dados atualizados).
function applyMatchStatsChange(
  player: Player,
  changes: { gols?: number; amarelos?: number; vermelhos?: number }
): Player {
  if (!player.matchStats) {
    return player;
  }
  const novasStats = {
    gols: player.matchStats.gols + (changes.gols || 0),
    amarelos: player.matchStats.amarelos + (changes.amarelos || 0),
    vermelhos: player.matchStats.vermelhos + (changes.vermelhos || 0)
  };
  return { ...player, matchStats: novasStats };
}

function DraggablePlayer({ player, onRemove }: { player: Player; onRemove?: () => void }) {
  // useDrag conecta este elemento à API de arrastar-e-soltar do react-dnd.
  // `drag` é a ref que precisa ser colocada na div que pode ser arrastada.
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { player },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

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
        {onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FieldPosition({
  position,
  onDrop,
  player,
  onRemove,
  onAddGol,
  onAddCard
}: {
  position: FormationPosition;
  onDrop: (player: Player) => void;
  player: Player | null;
  onRemove: () => void;
  onAddGol: (playerId: number) => void;
  onAddCard: (playerId: number, type: 'amarelo' | 'vermelho') => void;
}) {
  // useDrop marca este elemento como um alvo onde um jogador arrastado pode
  // ser solto. `drop` é a ref que precisa ser colocada na div alvo.
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    drop: (item: { player: Player }) => onDrop(item.player),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  if (!player) {
    return (
      <div
        ref={drop}
        className={`absolute ${isOver ? 'scale-110' : ''}`}
        style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/50 bg-white/10 flex items-center justify-center backdrop-blur-sm">
          <UserPlus className="h-6 w-6 text-white/70" />
        </div>
        <p className="text-xs text-white text-center mt-1 font-medium">{position.position}</p>
      </div>
    );
  }

  return (
    <div
      className="absolute"
      style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="relative group">
          <div className={`w-16 h-16 rounded-full ${getPositionColor(player.position)} flex items-center justify-center text-white font-bold shadow-lg cursor-pointer hover:scale-105 transition-transform`}>
            {player.number}
          </div>

          {/* Match Stats Badges */}
          {player.matchStats && player.matchStats.gols > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md border-2 border-white">
              {player.matchStats.gols}⚽
            </div>
          )}
          {player.matchStats && (player.matchStats.amarelos > 0 || player.matchStats.vermelhos > 0) && (
            <div className="absolute -bottom-1 -right-1 flex gap-0.5">
              {player.matchStats.amarelos > 0 && (
                <div className="w-4 h-5 bg-yellow-400 border border-yellow-600 rounded-sm flex items-center justify-center text-xs font-bold">
                  {player.matchStats.amarelos}
                </div>
              )}
              {player.matchStats.vermelhos > 0 && (
                <div className="w-4 h-5 bg-red-600 border border-red-800 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                  {player.matchStats.vermelhos}
                </div>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-2 py-1">
          <p className="text-xs font-medium text-center whitespace-nowrap">{player.name}</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-1 mt-1">
          <Button
            size="sm"
            className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onAddGol(player.id)}
          >
            <Trophy className="h-3 w-3 mr-1" />
            Gol
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-7 px-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Cartão
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onAddCard(player.id, 'amarelo')}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-4 bg-yellow-400 border border-yellow-600 rounded-sm"></div>
                  Cartão Amarelo
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddCard(player.id, 'vermelho')}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-4 bg-red-600 border border-red-800 rounded-sm"></div>
                  Cartão Vermelho
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function EscalacaoCartolaPage({ onNavigate }: EscalacaoCartolaPageProps) {
  const [view, setView] = useState<'campo' | 'lista'>('campo');
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(mockPlayers);
  const [formation, setFormation] = useState<FormationPosition[]>([
    { x: 50, y: 90, position: 'GOL', player: null },
    { x: 25, y: 70, position: 'ZAG', player: null },
    { x: 50, y: 70, position: 'ZAG', player: null },
    { x: 75, y: 70, position: 'ZAG', player: null },
    { x: 20, y: 50, position: 'MEI', player: null },
    { x: 50, y: 50, position: 'MEI', player: null },
    { x: 80, y: 50, position: 'MEI', player: null },
    { x: 30, y: 25, position: 'ATA', player: null },
    { x: 50, y: 20, position: 'ATA', player: null },
    { x: 70, y: 25, position: 'ATA', player: null },
  ]);

  const handleDrop = (index: number, player: Player) => {
    let jaEstaEscalado = false;
    for (const pos of formation) {
      if (pos.player?.id === player.id) {
        jaEstaEscalado = true;
      }
    }
    if (jaEstaEscalado) {
      return;
    }

    const newFormation = [...formation];
    newFormation[index] = { ...newFormation[index], player };
    setFormation(newFormation);

    const novosDisponiveis: Player[] = [];
    for (const p of availablePlayers) {
      if (p.id !== player.id) {
        novosDisponiveis.push(p);
      }
    }
    setAvailablePlayers(novosDisponiveis);
  };

  const handleRemove = (index: number) => {
    const player = formation[index].player;
    if (player) {
      setAvailablePlayers([...availablePlayers, player]);
      const newFormation = [...formation];
      newFormation[index] = { ...newFormation[index], player: null };
      setFormation(newFormation);
    }
  };

  const handleAddGol = (playerId: number) => {
    const novosDisponiveis: Player[] = [];
    for (const player of availablePlayers) {
      if (player.id === playerId) {
        novosDisponiveis.push(applyMatchStatsChange(player, { gols: 1 }));
      } else {
        novosDisponiveis.push(player);
      }
    }
    setAvailablePlayers(novosDisponiveis);

    const novaFormacao: FormationPosition[] = [];
    for (const pos of formation) {
      if (pos.player?.id === playerId) {
        const jogadorAtualizado = applyMatchStatsChange(pos.player, { gols: 1 });
        novaFormacao.push({ ...pos, player: jogadorAtualizado });
      } else {
        novaFormacao.push(pos);
      }
    }
    setFormation(novaFormacao);
  };

  const handleAddCard = (playerId: number, type: 'amarelo' | 'vermelho') => {
    const mudanca = type === 'amarelo' ? { amarelos: 1 } : { vermelhos: 1 };

    const novosDisponiveis: Player[] = [];
    for (const player of availablePlayers) {
      if (player.id === playerId) {
        novosDisponiveis.push(applyMatchStatsChange(player, mudanca));
      } else {
        novosDisponiveis.push(player);
      }
    }
    setAvailablePlayers(novosDisponiveis);

    const novaFormacao: FormationPosition[] = [];
    for (const pos of formation) {
      if (pos.player?.id === playerId) {
        const jogadorAtualizado = applyMatchStatsChange(pos.player, mudanca);
        novaFormacao.push({ ...pos, player: jogadorAtualizado });
      } else {
        novaFormacao.push(pos);
      }
    }
    setFormation(novaFormacao);
  };

  const shufflePlayers = () => {
    const escalados: Player[] = [];
    for (const pos of formation) {
      if (pos.player !== null) {
        escalados.push(pos.player);
      }
    }
    const todosJogadores = [...availablePlayers, ...escalados];

    // Embaralha a lista sorteando uma ordem aleatória (truque comum, mas
    // simples: dá um "empate" aleatório entre -0.5 e 0.5 pra cada comparação).
    const embaralhados = [...todosJogadores].sort(() => Math.random() - 0.5);

    const novaFormacao: FormationPosition[] = [];
    for (let i = 0; i < formation.length; i++) {
      novaFormacao.push({ ...formation[i], player: embaralhados[i] || null });
    }

    setFormation(novaFormacao);
    setAvailablePlayers(embaralhados.slice(formation.length));
  };

  const clearFormation = () => {
    const escalados: Player[] = [];
    for (const pos of formation) {
      if (pos.player !== null) {
        escalados.push(pos.player);
      }
    }
    setAvailablePlayers([...availablePlayers, ...escalados]);

    const novaFormacao: FormationPosition[] = [];
    for (const pos of formation) {
      novaFormacao.push({ ...pos, player: null });
    }
    setFormation(novaFormacao);
  };

  const scaledPlayers: Player[] = [];
  for (const pos of formation) {
    if (pos.player !== null) {
      scaledPlayers.push(pos.player);
    }
  }

  // Soma gols, amarelos e vermelhos de todos os jogadores escalados.
  let totalGols = 0;
  let totalAmarelos = 0;
  let totalVermelhos = 0;
  for (const player of scaledPlayers) {
    totalGols += player.matchStats?.gols || 0;
    totalAmarelos += player.matchStats?.amarelos || 0;
    totalVermelhos += player.matchStats?.vermelhos || 0;
  }

  // Nota do time: começa em 5.0, gols aumentam a nota e cartões diminuem.
  function calculateTeamRating(): number {
    if (scaledPlayers.length === 0) {
      return 0;
    }

    let rating = 5.0;
    rating += (totalGols / scaledPlayers.length) * 2;
    rating -= ((totalAmarelos + totalVermelhos * 2) / scaledPlayers.length) * 1;

    if (rating > 10) {
      return 10;
    }
    if (rating < 0) {
      return 0;
    }
    return rating;
  }

  const teamRating = calculateTeamRating();

  const titulares = scaledPlayers;
  const reservas = availablePlayers;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end">
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

      {/* Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gols Marcados</p>
                <p className="text-3xl font-bold text-green-600">{totalGols}</p>
              </div>
              <Trophy className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cartões Amarelos</p>
                <p className="text-3xl font-bold text-yellow-600">{totalAmarelos}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cartões Vermelhos</p>
                <p className="text-3xl font-bold text-red-600">{totalVermelhos}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média do Time</p>
                <p className="text-3xl font-bold text-blue-600">{teamRating.toFixed(1)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {view === 'lista' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Titulares</span>
                <Badge variant="default">{titulares.length}/11</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Posição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {titulares.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {player.number}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={posicaoCorClasses(player.position)}>
                          {posicaoNome(player.position)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {titulares.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        Nenhum jogador escalado ainda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Reservas</span>
                <Badge variant="secondary">{reservas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Posição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservas.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                          {player.number}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={posicaoCorClasses(player.position)}>
                          {posicaoNome(player.position)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reservas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        Todos os jogadores foram escalados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'campo' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Football Field */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Campo Tático - {scaledPlayers.length}/11 jogadores
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={shufflePlayers}>
                    <Shuffle className="h-4 w-4 mr-2" />
                    Sortear
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearFormation}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                  <Button size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-green-600 to-green-700 rounded-lg overflow-hidden">
                {/* Field lines */}
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-white/30"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 border-2 border-b-0 border-white/30"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 border-2 border-t-0 border-white/30"></div>
                </div>

                {/* Formation Positions */}
                {formation.map((pos, index) => (
                  <FieldPosition
                    key={index}
                    position={pos}
                    player={pos.player}
                    onDrop={(player) => handleDrop(index, player)}
                    onRemove={() => handleRemove(index)}
                    onAddGol={handleAddGol}
                    onAddCard={handleAddCard}
                  />
                ))}
              </div>

              <div className="mt-4 p-3 bg-accent rounded-lg">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Arraste jogadores da lista ao lado para o campo. Use os botões rápidos para registrar gols e cartões.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Players */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Jogadores Disponíveis ({availablePlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {availablePlayers.map((player) => (
                    <DraggablePlayer key={player.id} player={player} />
                  ))}
                  {availablePlayers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Todos os jogadores foram escalados</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
