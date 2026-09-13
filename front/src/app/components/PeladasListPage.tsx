import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Plus, 
  Users, 
  Calendar, 
  DollarSign,
  Edit,
  MoreVertical,
  Trophy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { api, ApiError } from '../lib/api';

type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

interface Pelada {
  id: number;
  name: string;
  description: string;
  daysOfWeek: DayOfWeek[];
  totalPlayers: number;
  totalMatches: number;
  balance: number;
  createdAt: string;
  active: boolean;
}

interface PeladasListPageProps {
  onNavigate: (page: string, peladaId?: number) => void;
}

// Configuração de cores e informações para cada dia da semana
const dayConfig: Record<DayOfWeek, { 
  label: string; 
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  lightBg: string;
}> = {
  segunda: {
    label: 'Segunda-feira',
    color: 'text-blue-700',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    badgeColor: 'bg-blue-500',
    lightBg: 'bg-blue-50'
  },
  terca: {
    label: 'Terça-feira',
    color: 'text-green-700',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500',
    badgeColor: 'bg-green-500',
    lightBg: 'bg-green-50'
  },
  quarta: {
    label: 'Quarta-feira',
    color: 'text-purple-700',
    bgColor: 'bg-purple-500',
    borderColor: 'border-purple-500',
    badgeColor: 'bg-purple-500',
    lightBg: 'bg-purple-50'
  },
  quinta: {
    label: 'Quinta-feira',
    color: 'text-orange-700',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-500',
    badgeColor: 'bg-orange-500',
    lightBg: 'bg-orange-50'
  },
  sexta: {
    label: 'Sexta-feira',
    color: 'text-red-700',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500',
    badgeColor: 'bg-red-500',
    lightBg: 'bg-red-50'
  },
  sabado: {
    label: 'Sábado',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-500',
    badgeColor: 'bg-yellow-500',
    lightBg: 'bg-yellow-50'
  },
  domingo: {
    label: 'Domingo',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-500',
    borderColor: 'border-cyan-500',
    badgeColor: 'bg-cyan-500',
    lightBg: 'bg-cyan-50'
  }
};

const daysOrder: DayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

export function PeladasListPage({ onNavigate }: PeladasListPageProps) {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPelada, setNewPelada] = useState({
    name: '',
    description: '',
    daysOfWeek: [] as DayOfWeek[]
  });

  useEffect(() => {
    carregarPeladas();
  }, []);

  async function carregarPeladas() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Pelada[]>('/peladas');
      setPeladas(data);
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível carregar suas peladas." : "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  // Agrupar peladas por dia da semana
  const peladasByDay: Record<string, Pelada[]> = {};
  for (const day of daysOrder) {
    const dayPeladas = peladas.filter(p => p.daysOfWeek.includes(day));
    if (dayPeladas.length > 0) {
      peladasByDay[day] = dayPeladas;
    }
  }

  // Somas usadas no painel de estatísticas do topo
  let totalJogadores = 0;
  let totalPartidas = 0;
  let saldoTotal = 0;
  for (const pelada of peladas) {
    totalJogadores += pelada.totalPlayers;
    totalPartidas += pelada.totalMatches;
    saldoTotal += pelada.balance;
  }

  async function handleCreatePelada() {
    try {
      await api.post('/peladas', {
        name: newPelada.name,
        description: newPelada.description,
        daysOfWeek: newPelada.daysOfWeek,
      });
      setIsCreateDialogOpen(false);
      setNewPelada({ name: '', description: '', daysOfWeek: [] });
      await carregarPeladas();
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível criar a pelada." : "Não foi possível conectar ao servidor.");
    }
  }

  function toggleDay(day: DayOfWeek) {
    const jaSelecionado = newPelada.daysOfWeek.includes(day);
    let novosDias: DayOfWeek[];
    if (jaSelecionado) {
      novosDias = newPelada.daysOfWeek.filter(d => d !== day);
    } else {
      novosDias = [...newPelada.daysOfWeek, day];
    }
    setNewPelada({ ...newPelada, daysOfWeek: novosDias });
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando peladas...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1>Minhas Peladas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as suas peladas em um só lugar
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
        >
          <Plus className="h-4 w-4" />
          Nova Pelada
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 hover:shadow-lg transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Peladas</p>
                <p className="text-3xl font-bold text-primary">{peladas.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Jogadores</p>
                <p className="text-3xl font-bold text-secondary">
                  {totalJogadores}
                </p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl">
                <Users className="h-8 w-8 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Partidas</p>
                <p className="text-3xl font-bold text-amarelo-escuro">
                  {totalPartidas}
                </p>
              </div>
              <div className="p-3 bg-amarelo-brasil/20 rounded-xl">
                <Calendar className="h-8 w-8 text-amarelo-escuro" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Total</p>
                <p className="text-3xl font-bold text-verde-claro">
                  R$ {saldoTotal.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-verde-claro/10 rounded-xl">
                <DollarSign className="h-8 w-8 text-verde-claro" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peladas Grouped by Day */}
      <div className="space-y-8">
        {Object.entries(peladasByDay).map(([day, dayPeladas]) => {
          const config = dayConfig[day as DayOfWeek];
          
          return (
            <div key={day} className="space-y-4">
              {/* Day Header */}
              <div className={`flex items-center gap-3 pb-3 border-b-4 ${config.borderColor}`}>
                <div className={`w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center shadow-md`}>
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className={config.color}>{config.label}</h2>
                  <p className="text-sm text-muted-foreground">
                    {dayPeladas.length} {dayPeladas.length === 1 ? 'pelada' : 'peladas'}
                  </p>
                </div>
              </div>

              {/* Peladas Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dayPeladas.map((pelada) => (
                  <Card 
                    key={`${pelada.id}-${day}`}
                    className={`hover:shadow-lg transition-all border-l-4 ${config.borderColor}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 flex-wrap">
                            {pelada.name}
                            {pelada.active && (
                              <Badge className={`${config.badgeColor} text-white text-xs border-0`}>
                                Ativa
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {pelada.description}
                          </p>
                          {/* Show all days when pelada has multiple days */}
                          {pelada.daysOfWeek.length > 1 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pelada.daysOfWeek.map(d => (
                                <Badge 
                                  key={d} 
                                  variant="outline" 
                                  className={`text-xs ${dayConfig[d].borderColor} ${dayConfig[d].color}`}
                                >
                                  {dayConfig[d].label.split('-')[0]}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Arquivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`text-center p-2 ${config.lightBg} rounded-lg`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Users className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <p className="text-xl font-bold">{pelada.totalPlayers}</p>
                          <p className="text-xs text-muted-foreground">Jogadores</p>
                        </div>

                        <div className={`text-center p-2 ${config.lightBg} rounded-lg`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Calendar className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <p className="text-xl font-bold">{pelada.totalMatches}</p>
                          <p className="text-xs text-muted-foreground">Partidas</p>
                        </div>

                        <div className={`text-center p-2 ${config.lightBg} rounded-lg`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <DollarSign className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <p className="text-xl font-bold">{pelada.balance}</p>
                          <p className="text-xs text-muted-foreground">Saldo</p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Criada em {new Date(pelada.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </CardContent>

                    <CardFooter className="flex gap-2">
                      <Button 
                        className="flex-1 bg-primary hover:bg-verde-escuro text-white transition-colors shadow-brasil"
                        onClick={() => onNavigate('pelada-detail', pelada.id)}
                      >
                        Entrar
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex items-center gap-2 border-2 hover:bg-secondary hover:text-white transition-colors"
                        onClick={() => {
                          // TODO: Implement edit functionality
                          console.log('Edit pelada:', pelada.id);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {peladas.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="mb-2">Nenhuma pelada cadastrada</h3>
            <p className="text-sm mb-4">
              Comece criando sua primeira pelada!
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Pelada
            </Button>
          </div>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Nova Pelada</DialogTitle>
            <DialogDescription>
              Preencha as informações básicas da sua pelada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Pelada *</Label>
              <Input
                id="name"
                placeholder="Ex: Pelada dos Amigos"
                value={newPelada.name}
                onChange={(e) => setNewPelada({ ...newPelada, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Futebol de sábado com a galera"
                value={newPelada.description}
                onChange={(e) => setNewPelada({ ...newPelada, description: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Dias da Semana *</Label>
              <p className="text-xs text-muted-foreground">
                Selecione um ou mais dias em que a pelada acontece
              </p>
              <div className="space-y-2 border rounded-lg p-4">
                {daysOrder.map((day) => {
                  const config = dayConfig[day];
                  const isChecked = newPelada.daysOfWeek.includes(day);
                  
                  return (
                    <div 
                      key={day} 
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isChecked 
                          ? `${config.borderColor} ${config.lightBg}` 
                          : 'border-transparent hover:bg-accent'
                      }`}
                      onClick={() => toggleDay(day)}
                    >
                      <Checkbox
                        id={day}
                        checked={isChecked}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <label
                        htmlFor={day}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <div className={`w-4 h-4 rounded-full ${config.bgColor}`}></div>
                        <span className={isChecked ? config.color : 'text-foreground'}>
                          {config.label}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
              {newPelada.daysOfWeek.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {newPelada.daysOfWeek.length} {newPelada.daysOfWeek.length === 1 ? 'dia selecionado' : 'dias selecionados'}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewPelada({ name: '', description: '', daysOfWeek: [] });
              }}
              className="border-2"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreatePelada} 
              disabled={!newPelada.name || newPelada.daysOfWeek.length === 0}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              Criar Pelada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
