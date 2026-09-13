import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  ArrowLeft,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Share2,
  Download,
  QrCode,
  Check,
  X,
  Calendar,
  Phone,
  Mail,
  MessageCircle,
  History,
  Send
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface Transaction {
  id: number;
  type: 'entrada' | 'saida';
  description: string;
  amount: number;
  date: string;
  category: string;
  paidBy?: string;
}

type CobrancaCanal = 'ligacao' | 'email' | 'whatsapp';
type DebtorStatus = 'pendente' | 'contatado' | 'negociacao' | 'pago';

interface CobrancaHistorico {
  id: number;
  canal: CobrancaCanal;
  observacao: string;
  data: string; // timestamp formatado para exibição
}

interface Debtor {
  id: number;
  name: string;
  email: string;
  amount: number;
  dueDate: string;
  monthsOverdue: number;
  ultimoContato: string;
  status: DebtorStatus;
  historico: CobrancaHistorico[];
}

const canalLabel: { ligacao: string; email: string; whatsapp: string } = {
  ligacao: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp'
};

const debtorStatusLabel: { pendente: string; contatado: string; negociacao: string; pago: string } = {
  pendente: 'Pendente',
  contatado: 'Contatado',
  negociacao: 'Em Negociação',
  pago: 'Pago'
};

const debtorStatusVariant: {
  pendente: 'default' | 'secondary' | 'destructive' | 'outline';
  contatado: 'default' | 'secondary' | 'destructive' | 'outline';
  negociacao: 'default' | 'secondary' | 'destructive' | 'outline';
  pago: 'default' | 'secondary' | 'destructive' | 'outline';
} = {
  pendente: 'destructive',
  contatado: 'secondary',
  negociacao: 'default',
  pago: 'outline'
};

interface FinancasPageProps {
  peladaId: number;
  onNavigate: (page: string, peladaId?: number) => void;
}

export function FinancasPage({ peladaId, onNavigate }: FinancasPageProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  // Busca os lançamentos reais dessa pelada no back-end quando a página abre.
  useEffect(() => {
    carregarTransacoes();
  }, [peladaId]);

  function carregarTransacoes() {
    setLoadingTransactions(true);
    setTransactionsError(null);
    api
      .get<Transaction[]>(`/peladas/${peladaId}/transacoes`)
      .then((dados) => setTransactions(dados))
      .catch(() => setTransactionsError('Não foi possível carregar os lançamentos.'))
      .finally(() => setLoadingTransactions(false));
  }

  const [debtors, setDebtors] = useState<Debtor[]>([
    {
      id: 1,
      name: 'Carlos Silva',
      email: 'carlos.silva@email.com',
      amount: 90,
      dueDate: '2025-01-01',
      monthsOverdue: 3,
      ultimoContato: '15/08/2025',
      status: 'pendente',
      historico: [
        { id: 1, canal: 'ligacao', observacao: 'Prometeu quitar até sexta-feira', data: '15/08/2025 14:30' }
      ]
    },
    {
      id: 2,
      name: 'Ricardo Alves',
      email: 'ricardo.alves@email.com',
      amount: 60,
      dueDate: '2025-02-01',
      monthsOverdue: 2,
      ultimoContato: '01/09/2025',
      status: 'contatado',
      historico: [
        { id: 1, canal: 'email', observacao: 'Cobrança da mensalidade de agosto enviada', data: '01/09/2025 09:15' }
      ]
    },
    {
      id: 3,
      name: 'Paulo Henrique',
      email: 'paulo.henrique@email.com',
      amount: 30,
      dueDate: '2025-03-01',
      monthsOverdue: 1,
      ultimoContato: '-',
      status: 'pendente',
      historico: []
    }
  ]);

  const [isHistoricoDialogOpen, setIsHistoricoDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [historicoDebtorId, setHistoricoDebtorId] = useState<number | null>(null);
  const [newCobranca, setNewCobranca] = useState<{ canal: CobrancaCanal; observacao: string }>({
    canal: 'ligacao',
    observacao: ''
  });
  const [bulkCanal, setBulkCanal] = useState<CobrancaCanal>('whatsapp');

  const historicoDebtor = debtors.find(d => d.id === historicoDebtorId) || null;

  // Formata a data/hora atual no padrão brasileiro, pra guardar junto do histórico de cobrança
  function nowStamp() {
    return new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function registrarCobranca(debtorId: number, canal: CobrancaCanal, observacao: string) {
    const novaListaDeDevedores: Debtor[] = [];

    for (const devedor of debtors) {
      if (devedor.id !== debtorId) {
        novaListaDeDevedores.push(devedor);
        continue;
      }

      const novoRegistro: CobrancaHistorico = {
        id: devedor.historico.length + 1,
        canal,
        observacao: observacao || `Cobrança registrada via ${canalLabel[canal].toLowerCase()}`,
        data: nowStamp()
      };

      let novoStatus = devedor.status;
      if (devedor.status === 'pendente') {
        novoStatus = 'contatado';
      }

      novaListaDeDevedores.push({
        ...devedor,
        historico: [novoRegistro, ...devedor.historico],
        ultimoContato: nowStamp(),
        status: novoStatus
      });
    }

    setDebtors(novaListaDeDevedores);
  }

  function handleAddCobranca() {
    if (historicoDebtorId === null) return;
    registrarCobranca(historicoDebtorId, newCobranca.canal, newCobranca.observacao);
    setNewCobranca({ canal: 'ligacao', observacao: '' });
  }

  function handleCobrancaEmMassa() {
    const devedoresNaoPagos = debtors.filter(d => d.status !== 'pago');
    for (const devedor of devedoresNaoPagos) {
      registrarCobranca(devedor.id, bulkCanal, `Cobrança em massa via ${canalLabel[bulkCanal].toLowerCase()}`);
    }
    setIsBulkDialogOpen(false);
  }

  const [newTransaction, setNewTransaction] = useState({
    type: 'entrada' as 'entrada' | 'saida',
    description: '',
    amount: '',
    date: '',
    category: ''
  });

  let totalEntradas = 0;
  let totalSaidas = 0;
  for (const transacao of transactions) {
    if (transacao.type === 'entrada') {
      totalEntradas += transacao.amount;
    } else {
      totalSaidas += transacao.amount;
    }
  }

  const saldo = totalEntradas - totalSaidas;

  let totalDebt = 0;
  for (const devedor of debtors) {
    totalDebt += devedor.amount;
  }

  async function handleAddTransaction() {
    try {
      await api.post(`/peladas/${peladaId}/transacoes`, {
        type: newTransaction.type,
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount),
        category: newTransaction.category,
      });
      carregarTransacoes();
    } catch {
      setTransactionsError('Não foi possível salvar o lançamento.');
    }

    setIsAddDialogOpen(false);
    setNewTransaction({
      type: 'entrada',
      description: '',
      amount: '',
      date: '',
      category: ''
    });
  }

  function handleGeneratePixLink(debtor: Debtor) {
    setSelectedDebtor(debtor);
    setIsPixDialogOpen(true);
  }

  async function handlePaymentReceived(debtorId: number) {
    const debtor = debtors.find(d => d.id === debtorId);
    if (!debtor) return;

    try {
      await api.post(`/peladas/${peladaId}/transacoes`, {
        type: 'entrada',
        description: `Pagamento PIX - ${debtor.name}`,
        amount: debtor.amount,
        category: 'mensalidade',
        paidBy: debtor.name,
      });
      carregarTransacoes();
    } catch {
      setTransactionsError('Não foi possível registrar o pagamento.');
    }

    setDebtors(debtors.filter(d => d.id !== debtorId));
    setIsPixDialogOpen(false);
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
          <h1>Gestão Financeira</h1>
          <p className="text-muted-foreground">
            Controle de receitas e despesas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="flex items-center gap-2 border-2 hover:bg-secondary hover:text-white transition-colors"
            onClick={() => {
              // TODO: Implement share functionality
              console.log('Share financial report');
            }}
          >
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
          >
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {saldo.toFixed(2)}
                </p>
              </div>
              <Wallet className={`h-12 w-12 ${saldo >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-3xl font-bold text-green-600">
                  R$ {totalEntradas.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Saídas</p>
                <p className="text-3xl font-bold text-red-600">
                  R$ {totalSaidas.toFixed(2)}
                </p>
              </div>
              <TrendingDown className="h-12 w-12 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-3xl font-bold text-orange-600">
                  R$ {totalDebt.toFixed(2)}
                </p>
              </div>
              <AlertCircle className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Lançamentos</TabsTrigger>
          <TabsTrigger value="debtors">
            Inadimplentes ({debtors.length})
          </TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Lançamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions && <p className="text-muted-foreground">Carregando lançamentos...</p>}
              {transactionsError && <p className="text-sm text-destructive mb-2">{transactionsError}</p>}
              {!loadingTransactions && <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.paidBy || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'entrada' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debtors Tab */}
        <TabsContent value="debtors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Jogadores Inadimplentes
                </span>
                <Button
                  size="sm"
                  onClick={() => setIsBulkDialogOpen(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
                >
                  <Send className="h-4 w-4" />
                  Cobrança em Massa
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {debtors.map((debtor) => (
                  <div key={debtor.id} className="flex items-center justify-between p-4 border rounded-lg flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{debtor.name}</p>
                        <p className="text-xs text-muted-foreground">{debtor.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Vencimento: {new Date(debtor.dueDate).toLocaleDateString('pt-BR')}</span>
                          <Badge variant="destructive">
                            {debtor.monthsOverdue} {debtor.monthsOverdue === 1 ? 'mês' : 'meses'} atrasado
                          </Badge>
                          <Badge variant={debtorStatusVariant[debtor.status]}>
                            {debtorStatusLabel[debtor.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Último contato: {debtor.ultimoContato}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600">
                          R$ {debtor.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          title="Registrar ligação"
                          onClick={() => registrarCobranca(debtor.id, 'ligacao', '')}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Registrar e-mail"
                          onClick={() => registrarCobranca(debtor.id, 'email', '')}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Registrar WhatsApp"
                          onClick={() => registrarCobranca(debtor.id, 'whatsapp', '')}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => {
                            setHistoricoDebtorId(debtor.id);
                            setIsHistoricoDialogOpen(true);
                          }}
                        >
                          <History className="h-4 w-4" />
                          Histórico ({debtor.historico.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePixLink(debtor)}
                          className="flex items-center gap-2"
                        >
                          <QrCode className="h-4 w-4" />
                          Gerar PIX
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePaymentReceived(debtor.id)}
                          className="flex items-center gap-2 text-green-600 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {debtors.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum jogador inadimplente nesta pelada. 🎉
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Receitas vs Despesas (Últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Gráfico de barras comparativo</p>
                    <p className="text-sm mt-1">Receitas vs Despesas mensais</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Gráfico de pizza</p>
                    <p className="text-sm mt-1">Despesas por categoria</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Gráfico de linha</p>
                    <p className="text-sm mt-1">Evolução do saldo ao longo do tempo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Novo Lançamento
            </DialogTitle>
            <DialogDescription>
              Registre uma entrada ou saída financeira
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newTransaction.type}
                onValueChange={(value: 'entrada' | 'saida') => 
                  setNewTransaction({ ...newTransaction, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Mensalidade Janeiro"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={newTransaction.category}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensalidade">Mensalidade</SelectItem>
                  <SelectItem value="aluguel">Aluguel de Campo</SelectItem>
                  <SelectItem value="equipamento">Equipamento</SelectItem>
                  <SelectItem value="arbitragem">Arbitragem</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              className="border-2"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddTransaction}
              disabled={!newTransaction.description || !newTransaction.amount || !newTransaction.date || !newTransaction.category}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIX Dialog */}
      <Dialog open={isPixDialogOpen} onOpenChange={setIsPixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Link de Pagamento PIX
            </DialogTitle>
            <DialogDescription>
              {selectedDebtor && `Cobrança para ${selectedDebtor.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-accent p-6 rounded-lg text-center">
              <div className="w-48 h-48 mx-auto bg-white border-2 rounded-lg flex items-center justify-center mb-4">
                <QrCode className="h-24 w-24 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">QR Code PIX</p>
              {selectedDebtor && (
                <p className="text-2xl font-bold">R$ {selectedDebtor.amount.toFixed(2)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Link de Pagamento</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value="https://pix.example.com/pay/abc123def456"
                  className="font-mono text-sm"
                />
                <Button variant="outline">
                  Copiar
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Quando o pagamento for confirmado, clique em "Confirmar Pagamento" 
                para registrar automaticamente a entrada no sistema.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPixDialogOpen(false)}
              className="border-2"
            >
              Fechar
            </Button>
            <Button 
              onClick={() => selectedDebtor && handlePaymentReceived(selectedDebtor.id)}
              className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              <Check className="h-4 w-4" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico de Cobranças Dialog */}
      <Dialog open={isHistoricoDialogOpen} onOpenChange={setIsHistoricoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Cobranças
            </DialogTitle>
            <DialogDescription>
              {historicoDebtor && `Registro de contatos com ${historicoDebtor.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {historicoDebtor && historicoDebtor.historico.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum contato registrado ainda.
                </p>
              )}
              {historicoDebtor?.historico.map((entry) => (
                <div key={entry.id} className="flex justify-between items-start p-3 border rounded-lg gap-3">
                  <div>
                    <p className="text-sm">
                      <strong>{canalLabel[entry.canal]}</strong>
                      {entry.observacao && <span className="text-muted-foreground"> — {entry.observacao}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{entry.data}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>Registrar novo contato</Label>
              <div className="flex gap-2">
                <Select
                  value={newCobranca.canal}
                  onValueChange={(value: CobrancaCanal) => setNewCobranca({ ...newCobranca, canal: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ligacao">Ligação</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Observação (opcional)"
                  value={newCobranca.observacao}
                  onChange={(e) => setNewCobranca({ ...newCobranca, observacao: e.target.value })}
                />
              </div>
              <Button onClick={handleAddCobranca} className="w-full bg-primary hover:bg-verde-escuro transition-colors shadow-brasil">
                Registrar Contato
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoricoDialogOpen(false)} className="border-2">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cobrança em Massa Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Cobrança em Massa
            </DialogTitle>
            <DialogDescription>
              Envia uma cobrança para todos os {debtors.filter(d => d.status !== 'pago').length} jogadores inadimplentes desta pelada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Canal de Cobrança</Label>
              <Select value={bulkCanal} onValueChange={(value: CobrancaCanal) => setBulkCanal(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              {debtors.filter(d => d.status !== 'pago').map(d => (
                <p key={d.id} className="text-sm text-muted-foreground">• {d.name} — R$ {d.amount.toFixed(2)}</p>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)} className="border-2">
              Cancelar
            </Button>
            <Button onClick={handleCobrancaEmMassa} className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil">
              <Send className="h-4 w-4 mr-2" />
              Enviar Cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
