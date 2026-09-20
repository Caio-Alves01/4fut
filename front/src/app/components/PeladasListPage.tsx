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
  Trophy
} from 'lucide-react';
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
  local: string;
  horario: string;
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

const novaPeladaVazia = {
  name: '',
  description: '',
  local: '',
  horario: '',
  daysOfWeek: [] as DayOfWeek[]
};

// Máscara de horário 24h: aceita só números e monta "HH:MM" enquanto digita.
// Corrige valores impossíveis (ex: "3" vira "03", "29" vira "23", "12:75" vira "12:59").
function aplicarMascaraHorario(valor: string): string {
  let digitos = valor.replace(/\D/g, '');

  if (digitos.length > 0 && digitos[0] > '2') {
    digitos = '0' + digitos;
  }
  digitos = digitos.slice(0, 4);

  if (digitos.length >= 2 && Number(digitos.slice(0, 2)) > 23) {
    digitos = '23' + digitos.slice(2);
  }
  if (digitos.length === 4 && Number(digitos.slice(2)) > 59) {
    digitos = digitos.slice(0, 2) + '59';
  }

  if (digitos.length <= 2) return digitos;
  return `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

// Horário é opcional: vazio é válido, mas se digitou algo precisa estar completo (HH:MM).
function horarioValido(horario: string): boolean {
  return horario === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(horario);
}

interface TimeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

function TimeInput({ id, value, onChange }: TimeInputProps) {
  return (
    <div className="space-y-1">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="00:00"
        maxLength={5}
        value={value}
        onChange={(e) => onChange(aplicarMascaraHorario(e.target.value))}
      />
      {!horarioValido(value) && (
        <p className="text-xs text-destructive">Digite o horário completo, ex: 20:00</p>
      )}
    </div>
  );
}

interface DayPickerProps {
  selected: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
}

// Lista de dias da semana com checkbox, usada nos diálogos de criar e editar pelada.
function DayPicker({ selected, onChange }: DayPickerProps) {
  function toggleDay(day: DayOfWeek) {
    if (selected.includes(day)) {
      onChange(selected.filter(d => d !== day));
    } else {
      onChange([...selected, day]);
    }
  }

  return (
    <div className="space-y-3">
      <Label>Dias da Semana *</Label>
      <p className="text-xs text-muted-foreground">
        Selecione um ou mais dias em que a pelada acontece
      </p>
      <div className="space-y-2 border rounded-lg p-4">
        {daysOrder.map((day) => {
          const config = dayConfig[day];
          const isChecked = selected.includes(day);

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
                id={`day-${day}`}
                checked={isChecked}
                onCheckedChange={() => toggleDay(day)}
                onClick={(e) => e.stopPropagation()}
              />
              <label
                htmlFor={`day-${day}`}
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
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
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} {selected.length === 1 ? 'dia selecionado' : 'dias selecionados'}
        </p>
      )}
    </div>
  );
}

export function PeladasListPage({ onNavigate }: PeladasListPageProps) {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPelada, setNewPelada] = useState(novaPeladaVazia);

  // Pelada que está sendo editada (null = diálogo de edição fechado)
  const [editingPelada, setEditingPelada] = useState<Pelada | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    local: '',
    horario: '',
    daysOfWeek: [] as DayOfWeek[]
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
      await api.post('/peladas', newPelada);
      setIsCreateDialogOpen(false);
      setNewPelada(novaPeladaVazia);
      await carregarPeladas();
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível criar a pelada." : "Não foi possível conectar ao servidor.");
    }
  }

  function abrirEdicao(pelada: Pelada) {
    setEditingPelada(pelada);
    setEditError(null);
    setEditForm({
      name: pelada.name,
      description: pelada.description,
      local: pelada.local ?? '',
      horario: pelada.horario ?? '',
      daysOfWeek: pelada.daysOfWeek
    });
  }

  async function handleSalvarEdicao() {
    if (!editingPelada) return;

    setSavingEdit(true);
    setEditError(null);
    try {
      await api.put(`/peladas/${editingPelada.id}`, editForm);
      setEditingPelada(null);
      await carregarPeladas();
    } catch (err) {
      setEditError(err instanceof ApiError ? "Não foi possível salvar as alterações." : "Não foi possível conectar ao servidor.");
    } finally {
      setSavingEdit(false);
    }
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
                        aria-label="Editar pelada"
                        onClick={() => abrirEdicao(pelada)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="local">Local</Label>
                <Input
                  id="local"
                  placeholder="Ex: Quadra do bairro"
                  value={newPelada.local}
                  onChange={(e) => setNewPelada({ ...newPelada, local: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horario">Horário</Label>
                <TimeInput
                  id="horario"
                  value={newPelada.horario}
                  onChange={(horario) => setNewPelada({ ...newPelada, horario })}
                />
              </div>
            </div>

            <DayPicker
              selected={newPelada.daysOfWeek}
              onChange={(days) => setNewPelada({ ...newPelada, daysOfWeek: days })}
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewPelada(novaPeladaVazia);
              }}
              className="border-2"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreatePelada} 
              disabled={!newPelada.name || newPelada.daysOfWeek.length === 0 || !horarioValido(newPelada.horario)}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              Criar Pelada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editingPelada !== null} onOpenChange={(open) => { if (!open) setEditingPelada(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pelada</DialogTitle>
            <DialogDescription>
              Altere as informações da sua pelada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Pelada *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-local">Local</Label>
                <Input
                  id="edit-local"
                  placeholder="Ex: Quadra do bairro"
                  value={editForm.local}
                  onChange={(e) => setEditForm({ ...editForm, local: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-horario">Horário</Label>
                <TimeInput
                  id="edit-horario"
                  value={editForm.horario}
                  onChange={(horario) => setEditForm({ ...editForm, horario })}
                />
              </div>
            </div>

            <DayPicker
              selected={editForm.daysOfWeek}
              onChange={(days) => setEditForm({ ...editForm, daysOfWeek: days })}
            />

            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPelada(null)}
              className="border-2"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarEdicao}
              disabled={savingEdit || !editForm.name.trim() || editForm.daysOfWeek.length === 0 || !horarioValido(editForm.horario)}
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
