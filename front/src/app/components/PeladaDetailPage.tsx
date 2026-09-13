import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  ArrowLeft,
  Users,
  Calendar,
  DollarSign,
  Trophy,
  TrendingUp,
  AlertCircle,
  Play,
  Settings,
  BarChart3,
  AlertTriangle,
  Medal,
  Shield,
  UserMinus
} from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface PeladaDetailPageProps {
  peladaId: number;
  onNavigate: (page: string, peladaId?: number) => void;
}

type MemberPapel = 'organizador' | 'membro';
type MemberStatus = 'ativo' | 'pendente' | 'inadimplente' | 'inativo';

interface PeladaMember {
  id: number;
  name: string;
  position: string;
  papel: MemberPapel;
  status: MemberStatus;
}

const statusVariant: Record<MemberStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ativo: 'default',
  pendente: 'secondary',
  inadimplente: 'destructive',
  inativo: 'outline'
};

const statusLabel: Record<MemberStatus, string> = {
  ativo: 'Ativo',
  pendente: 'Pendente',
  inadimplente: 'Inadimplente',
  inativo: 'Inativo'
};

interface NextMatch {
  date: string;
  time: string;
  location: string;
}

interface Artilheiro {
  name: string;
  gols: number;
}

interface MelhorJogador {
  name: string;
  nota: number;
}

interface MaisIndisciplinado {
  name: string;
  amarelos: number;
  vermelhos: number;
  total: number;
}

interface Destaques {
  artilheiro: Artilheiro | null;
  melhorJogador: MelhorJogador | null;
  maisIndisciplinado: MaisIndisciplinado | null;
  inadimplentes: number;
}

interface PeladaDetail {
  id: number;
  name: string;
  description: string;
  local: string;
  horario: string;
  active: boolean;
  createdAt: string;
  totalPlayers: number;
  totalMatches: number;
  balance: number;
  nextMatch: NextMatch | null;
  destaques: Destaques;
}

export function PeladaDetailPage({ peladaId, onNavigate }: PeladaDetailPageProps) {
  const [activeSection, setActiveSection] = useState<'geral' | 'admin'>('geral');

  const [pelada, setPelada] = useState<PeladaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dados editáveis da pelada na aba Administração
  const [peladaForm, setPeladaForm] = useState({
    name: "",
    description: "",
    local: "",
    horario: ""
  });

  useEffect(() => {
    carregarPelada();
  }, [peladaId]);

  async function carregarPelada() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PeladaDetail>(`/peladas/${peladaId}`);
      setPelada(data);
      setPeladaForm({
        name: data.name,
        description: data.description,
        local: data.local,
        horario: data.horario,
      });
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível carregar a pelada." : "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSalvarAdmin() {
    setSaving(true);
    try {
      await api.put(`/peladas/${peladaId}`, peladaForm);
      await carregarPelada();
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível salvar as alterações." : "Não foi possível conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  // Membros da pelada — shape derivado da antiga PeladaPage.tsx (status ativo/inadimplente),
  // enriquecido com `papel` e os status `pendente`/`inativo` do modelo final.
  const [members, setMembers] = useState<PeladaMember[]>([
    { id: 1, name: "João Silva", position: "Atacante", papel: 'organizador', status: 'ativo' },
    { id: 2, name: "Pedro Santos", position: "Meio-campo", papel: 'membro', status: 'ativo' },
    { id: 3, name: "Carlos Lima", position: "Zagueiro", papel: 'membro', status: 'inadimplente' },
    { id: 4, name: "Rafael Costa", position: "Goleiro", papel: 'membro', status: 'ativo' },
    { id: 5, name: "André Souza", position: "Lateral", papel: 'membro', status: 'pendente' },
  ]);

  function updateMemberPapel(id: number, papel: MemberPapel) {
    setMembers(members.map(m => (m.id === id ? { ...m, papel } : m)));
  }

  function updateMemberStatus(id: number, status: MemberStatus) {
    setMembers(members.map(m => (m.id === id ? { ...m, status } : m)));
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando pelada...</p>;
  }

  if (!pelada) {
    return <p className="text-destructive">{error ?? "Pelada não encontrada."}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => onNavigate('peladas-list')}
          className="flex items-center gap-2 border-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1>{pelada.name}</h1>
            {pelada.active && (
              <Badge variant="default">Ativa</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{pelada.description}</p>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-2 hover:bg-secondary hover:text-white transition-colors"
          onClick={() => setActiveSection(activeSection === 'geral' ? 'admin' : 'geral')}
        >
          <Settings className="h-4 w-4" />
          {activeSection === 'geral' ? 'Administração' : 'Voltar à Visão Geral'}
        </Button>
      </div>

      {activeSection === 'admin' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Dados da Pelada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="peladaName">Nome</Label>
                  <Input
                    id="peladaName"
                    value={peladaForm.name}
                    onChange={(e) => setPeladaForm({ ...peladaForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peladaLocal">Local</Label>
                  <Input
                    id="peladaLocal"
                    value={peladaForm.local}
                    onChange={(e) => setPeladaForm({ ...peladaForm, local: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peladaHorario">Horário</Label>
                  <Input
                    id="peladaHorario"
                    type="time"
                    value={peladaForm.horario}
                    onChange={(e) => setPeladaForm({ ...peladaForm, horario: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="peladaDescription">Descrição</Label>
                  <Textarea
                    id="peladaDescription"
                    value={peladaForm.description}
                    onChange={(e) => setPeladaForm({ ...peladaForm, description: e.target.value })}
                  />
                </div>
              </div>
              <Button
                className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
                onClick={handleSalvarAdmin}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Membros da Pelada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg flex-wrap">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.position}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Select value={member.papel} onValueChange={(value: MemberPapel) => updateMemberPapel(member.id, value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="organizador">Organizador</SelectItem>
                          <SelectItem value="membro">Membro</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={member.status} onValueChange={(value: MemberStatus) => updateMemberStatus(member.id, value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="inadimplente">Inadimplente</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant={statusVariant[member.status]}>{statusLabel[member.status]}</Badge>
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'geral' && (
      <>
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jogadores</p>
                <p className="text-3xl font-bold text-secondary">{pelada.totalPlayers}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-xl">
                <Users className="h-10 w-10 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Partidas</p>
                <p className="text-3xl font-bold text-primary">{pelada.totalMatches}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Calendar className="h-10 w-10 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-3xl font-bold text-verde-claro">R$ {pelada.balance}</p>
              </div>
              <div className="p-3 bg-verde-claro/10 rounded-xl">
                <DollarSign className="h-10 w-10 text-verde-claro" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Presença Média</p>
                <p className="text-3xl font-bold text-amarelo-escuro">—</p>
              </div>
              <div className="p-3 bg-amarelo-brasil/20 rounded-xl">
                <TrendingUp className="h-10 w-10 text-amarelo-escuro" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            className="cursor-pointer hover:shadow-lg hover:border-primary transition-all border-2"
            onClick={() => onNavigate('jogadores', peladaId)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-secondary shadow-brasil">
                  <Users className="h-6 w-6 text-white" />
                </div>
                Jogadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{pelada.totalPlayers} jogadores cadastrados</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg hover:border-primary transition-all border-2"
            onClick={() => onNavigate('partidas', peladaId)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary shadow-brasil">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                Partidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{pelada.totalMatches} partidas realizadas</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg hover:border-primary transition-all border-2"
            onClick={() => onNavigate('financas', peladaId)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-verde-claro shadow-brasil">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                Finanças
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">R$ {pelada.balance.toFixed(2)} em caixa</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg hover:border-primary transition-all border-2"
            onClick={() => onNavigate('ranking', peladaId)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amarelo-escuro shadow-brasil">
                  <Medal className="h-6 w-6 text-white" />
                </div>
                Ranking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Artilheiros, cartões e estatísticas</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Next Match & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Match */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Próxima Partida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pelada.nextMatch ? (
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Data e Hora</span>
                  </div>
                  <Badge variant="secondary">Confirmada</Badge>
                </div>
                <p className="text-lg font-semibold">
                  {new Date(pelada.nextMatch.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })} às {pelada.nextMatch.time}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  📍 {pelada.nextMatch.location}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-accent rounded-lg text-sm text-muted-foreground">
                Nenhuma partida agendada ainda.
              </div>
            )}
            <Button
              className="w-full bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
              onClick={() => onNavigate('partidas', peladaId)}
            >
              Ver Detalhes da Partida
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Destaques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pelada.destaques.artilheiro ? (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Artilheiro</p>
                    <p className="font-semibold">{pelada.destaques.artilheiro.name}</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {pelada.destaques.artilheiro.gols}⚽
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-lg">Ainda sem artilheiro definido.</p>
            )}

            {pelada.destaques.melhorJogador ? (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Melhor Jogador</p>
                    <p className="font-semibold">{pelada.destaques.melhorJogador.name}</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ⭐{pelada.destaques.melhorJogador.nota}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-lg">Ainda sem melhor jogador definido.</p>
            )}

            {pelada.destaques.maisIndisciplinado && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Jogador Mais Indisciplinado</p>
                    <p className="font-semibold">{pelada.destaques.maisIndisciplinado.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-4 bg-yellow-400 border border-yellow-600 rounded-sm"></div>
                    <span className="text-sm font-bold">{pelada.destaques.maisIndisciplinado.amarelos}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-4 bg-red-600 border border-red-800 rounded-sm"></div>
                    <span className="text-sm font-bold">{pelada.destaques.maisIndisciplinado.vermelhos}</span>
                  </div>
                  <span className="text-xl font-bold text-orange-600 ml-2">
                    {pelada.destaques.maisIndisciplinado.total}
                  </span>
                </div>
              </div>
            )}

            {pelada.destaques.inadimplentes > 0 && (
              <div className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Inadimplentes</p>
                    <p className="font-semibold">{pelada.destaques.inadimplentes} jogadores</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('financas', peladaId)}
                >
                  Ver
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Partida realizada</p>
                <p className="text-sm text-muted-foreground">Time A 5 x 3 Time B - Há 2 dias</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Novo jogador adicionado</p>
                <p className="text-sm text-muted-foreground">Carlos Silva entrou na pelada - Há 3 dias</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Pagamento recebido</p>
                <p className="text-sm text-muted-foreground">R$ 30,00 de Pedro Santos - Há 5 dias</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
