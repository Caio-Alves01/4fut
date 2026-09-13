import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
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
  ArrowLeft
} from "lucide-react";

interface RankingPageProps {
  peladaId: number;
  onNavigate: (page: string, peladaId?: number) => void;
}

export function RankingPage({ peladaId, onNavigate }: RankingPageProps) {
  const artilheiros = [
    { id: 1, name: "João Silva", gols: 12, jogos: 8, media: 1.5 },
    { id: 2, name: "Pedro Santos", gols: 9, jogos: 7, media: 1.3 },
    { id: 3, name: "Carlos Lima", gols: 7, jogos: 6, media: 1.2 },
    { id: 4, name: "Rafael Costa", gols: 6, jogos: 8, media: 0.8 },
    { id: 5, name: "André Souza", gols: 5, jogos: 5, media: 1.0 },
  ];

  const cartoes = [
    { id: 1, name: "Fernando Silva", amarelos: 5, vermelhos: 1, total: 6 },
    { id: 2, name: "Roberto Lima", amarelos: 4, vermelhos: 0, total: 4 },
    { id: 3, name: "Marcos Santos", amarelos: 3, vermelhos: 1, total: 4 },
    { id: 4, name: "Diego Costa", amarelos: 3, vermelhos: 0, total: 3 },
    { id: 5, name: "Luis Fernandes", amarelos: 2, vermelhos: 0, total: 2 },
  ];

  const estatisticasIndividuais = [
    { 
      id: 1, 
      name: "João Silva", 
      gols: 12, 
      presenca: 95, 
      faltas: 3, 
      pagamentos: "Em dia",
      position: "Atacante"
    },
    { 
      id: 2, 
      name: "Pedro Santos", 
      gols: 9, 
      presenca: 85, 
      faltas: 1, 
      pagamentos: "Em dia",
      position: "Meio-campo"
    },
    { 
      id: 3, 
      name: "Carlos Lima", 
      gols: 7, 
      presenca: 75, 
      faltas: 2, 
      pagamentos: "Atrasado",
      position: "Zagueiro"
    },
    { 
      id: 4, 
      name: "Rafael Costa", 
      gols: 6, 
      presenca: 90, 
      faltas: 0, 
      pagamentos: "Em dia",
      position: "Goleiro"
    },
  ];

  function getMedalColor(position: number) {
    switch (position) {
      case 1: return "text-yellow-500";
      case 2: return "text-gray-400";
      case 3: return "text-orange-600";
      default: return "text-muted-foreground";
    }
  }

  // Pega as iniciais do nome, ex: "João Silva" -> "JS"
  function getInitials(name: string) {
    const partesDoNome = name.split(' ');
    let iniciais = '';
    for (const parte of partesDoNome) {
      iniciais += parte[0];
    }
    return iniciais;
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

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Gols</p>
                <p className="text-xl font-semibold">47</p>
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
                <p className="text-xl font-semibold">24</p>
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
                <p className="text-xl font-semibold">12</p>
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
                <p className="text-xl font-semibold">3.9</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="artilheiros" className="w-full">
        <TabsList>
          <TabsTrigger value="artilheiros">Artilheiros</TabsTrigger>
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
                {artilheiros.map((jogador, index) => (
                  <div key={jogador.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Medal className={`h-6 w-6 ${getMedalColor(index + 1)}`} />
                        <span className="text-lg font-semibold">#{index + 1}</span>
                      </div>
                      <Avatar>
                        <AvatarImage src={`/avatar-${jogador.id}.jpg`} />
                        <AvatarFallback>{getInitials(jogador.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4>{jogador.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {jogador.jogos} jogos • Média: {jogador.media} gols/jogo
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-primary">{jogador.gols}</p>
                      <p className="text-sm text-muted-foreground">gols</p>
                    </div>
                  </div>
                ))}
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
                {cartoes.map((jogador, index) => (
                  <div key={jogador.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-semibold">#{index + 1}</span>
                      <Avatar>
                        <AvatarImage src={`/avatar-${jogador.id}.jpg`} />
                        <AvatarFallback>{getInitials(jogador.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4>{jogador.name}</h4>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                            <span>{jogador.amarelos}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>{jogador.vermelhos}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-red-600">{jogador.total}</p>
                      <p className="text-sm text-muted-foreground">cartões</p>
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
                {estatisticasIndividuais.map((jogador) => {
                  const pagamentoEmDia = jogador.pagamentos === 'Em dia';
                  return (
                  <div key={jogador.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={`/avatar-${jogador.id}.jpg`} />
                          <AvatarFallback>{getInitials(jogador.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4>{jogador.name}</h4>
                          <p className="text-sm text-muted-foreground">{jogador.position}</p>
                        </div>
                      </div>
                      <Badge variant={pagamentoEmDia ? 'default' : 'destructive'}>
                        {jogador.pagamentos}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Gols</span>
                          <span className="font-semibold">{jogador.gols}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Artilheiro</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Presença</span>
                          <span className="font-semibold">{jogador.presenca}%</span>
                        </div>
                        <Progress value={jogador.presenca} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Faltas</span>
                          <span className="font-semibold">{jogador.faltas}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">Disciplina</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Pagamentos</span>
                          <span className={`font-semibold ${pagamentoEmDia ? 'text-green-600' : 'text-red-600'}`}>
                            {jogador.pagamentos}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className={`h-4 w-4 ${pagamentoEmDia ? 'text-green-500' : 'text-red-500'}`} />
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