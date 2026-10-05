import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
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
  Check,
  Settings,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
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

// ---------- Formatos da API ----------

interface Transaction {
  id: number;
  type: 'entrada' | 'saida';
  description: string;
  amount: number;
  date: string;
  category: string;
  paidBy?: string | null;
}

interface ConfigFinanceira {
  valorMensalidade: number;
  valorAvulso: number;
  valorCartaoAmarelo: number;
  valorCartaoVermelho: number;
}

interface PagamentoMensalidade {
  id: number;
  ano: number;
  mes: number;
  valor: number;
  pagoEm: string; // "yyyy-MM-dd"
}

interface Mensalista {
  jogadorId: number;
  nome: string;
  status: string; // ativo | licenca | inativo
  inicioAno: number;
  inicioMes: number;
  pagamentos: PagamentoMensalidade[];
}

interface MensalidadesResponse {
  valorMensalidade: number;
  anoAtual: number;
  mesAtual: number;
  mensalistas: Mensalista[];
}

type TipoAReceber = 'mensalidade' | 'avulso' | 'cartao_amarelo' | 'cartao_vermelho';

interface ItemAReceber {
  tipo: TipoAReceber;
  jogadorId: number;
  jogadorNome: string;
  descricao: string;
  valor: number;
  data: string;
  cobrancaId: number | null; // null = mensalidade em aberto (paga pelo endpoint de mensalidades)
  ano: number | null;
  mes: number | null;
}

// ---------- Constantes e helpers ----------

// Categorias que podem ser lançadas à mão. Precisa bater com o back (Models/CategoriasLancamento.cs).
const CATEGORIAS_MANUAIS = [
  { valor: 'aluguel', nome: 'Aluguel de campo' },
  { valor: 'equipamento', nome: 'Bola e equipamentos' },
  { valor: 'festa', nome: 'Festas e confraternizações' },
  { valor: 'arbitragem', nome: 'Arbitragem' },
  { valor: 'uniforme', nome: 'Uniforme' },
  { valor: 'outros', nome: 'Outros' },
];

// Categorias criadas sozinhas quando um pagamento é registrado.
const CATEGORIAS_AUTOMATICAS: Record<string, string> = {
  mensalidade: 'Mensalidade',
  avulso: 'Avulso',
  multa_cartao: 'Multa de cartão',
};

const TIPOS_A_RECEBER: Record<TipoAReceber, { nome: string; classes: string }> = {
  mensalidade: { nome: 'Mensalidade', classes: 'bg-blue-100 text-blue-800' },
  avulso: { nome: 'Avulso', classes: 'bg-purple-100 text-purple-800' },
  cartao_amarelo: { nome: 'Cartão amarelo', classes: 'bg-yellow-100 text-yellow-800' },
  cartao_vermelho: { nome: 'Cartão vermelho', classes: 'bg-red-100 text-red-800' },
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function nomeCategoria(categoria: string): string {
  return CATEGORIAS_MANUAIS.find((c) => c.valor === categoria)?.nome ?? CATEGORIAS_AUTOMATICAS[categoria] ?? categoria;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// "2026-10-04" ou "2026-10-04T12:00:00" -> "04/10/2026", sem passar por Date (evita mudar de dia por fuso).
function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarMesAno(ano: number, mes: number): string {
  return `${String(mes).padStart(2, '0')}/${ano}`;
}

function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

// Compara meses como número único (2026*12 + 10) para facilitar "antes/depois".
function chaveMes(ano: number, mes: number): number {
  return ano * 12 + mes;
}

function mensagemDeErro(err: unknown, padrao: string): string {
  if (!(err instanceof ApiError)) return 'Não foi possível conectar ao servidor.';
  return (err.status === 400 || err.status === 409) && err.message && !err.message.startsWith('{') ? err.message : padrao;
}

// Pagamento a confirmar no diálogo "Registrar pagamento" (vem da grade de mensalidades ou da aba A receber).
type PagamentoPendente =
  | { tipo: 'mensalidade'; jogadorId: number; jogadorNome: string; ano: number; mes: number; valor: string }
  | { tipo: 'cobranca'; cobrancaId: number; jogadorNome: string; descricao: string; valor: number };

interface FinancasPageProps {
  peladaId: number;
  onNavigate: (page: string, peladaId?: number) => void;
}

export function FinancasPage({ peladaId, onNavigate }: FinancasPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [config, setConfig] = useState<ConfigFinanceira | null>(null);
  const [mensalidades, setMensalidades] = useState<MensalidadesResponse | null>(null);
  const [aReceber, setAReceber] = useState<ItemAReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Novo lançamento
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'saida' as 'entrada' | 'saida',
    description: '',
    amount: '',
    date: hojeISO(),
    category: '',
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [salvandoLancamento, setSalvandoLancamento] = useState(false);

  // Exclusão de lançamento
  const [lancamentoParaExcluir, setLancamentoParaExcluir] = useState<Transaction | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [excluirError, setExcluirError] = useState<string | null>(null);

  // Configuração de valores
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({ valorMensalidade: '', valorAvulso: '', valorCartaoAmarelo: '', valorCartaoVermelho: '' });
  const [configError, setConfigError] = useState<string | null>(null);
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Mensalidades
  const [anoGrade, setAnoGrade] = useState<number | null>(null);
  const [pagamentoDetalhe, setPagamentoDetalhe] = useState<{ mensalista: Mensalista; pagamento: PagamentoMensalidade } | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);
  const [desfazerError, setDesfazerError] = useState<string | null>(null);

  // Registrar pagamento (mensalidade ou cobrança)
  const [pagamentoPendente, setPagamentoPendente] = useState<PagamentoPendente | null>(null);
  const [pagoEm, setPagoEm] = useState(hojeISO());
  const [registrando, setRegistrando] = useState(false);
  const [registrarError, setRegistrarError] = useState<string | null>(null);

  // A receber
  const [filtroAReceber, setFiltroAReceber] = useState<'todos' | 'mensalidade' | 'avulso' | 'cartao'>('todos');

  useEffect(() => {
    carregarTudo();
  }, [peladaId]);

  // Recarrega as quatro fontes juntas: todo pagamento mexe em mais de uma (caixa, mensalidades e a receber).
  async function carregarTudo() {
    setError(null);
    try {
      const [transacoes, cfg, mens, receber] = await Promise.all([
        api.get<Transaction[]>(`/peladas/${peladaId}/transacoes`),
        api.get<ConfigFinanceira>(`/peladas/${peladaId}/financeiro/config`),
        api.get<MensalidadesResponse>(`/peladas/${peladaId}/financeiro/mensalidades`),
        api.get<ItemAReceber[]>(`/peladas/${peladaId}/financeiro/a-receber`),
      ]);
      setTransactions(transacoes);
      setConfig(cfg);
      setMensalidades(mens);
      setAnoGrade((atual) => atual ?? mens.anoAtual);
      setAReceber(receber);
    } catch (err) {
      setError(mensagemDeErro(err, 'Não foi possível carregar as finanças.'));
    } finally {
      setLoading(false);
    }
  }

  // ---------- Totais ----------

  let totalEntradas = 0;
  let totalSaidas = 0;
  for (const transacao of transactions) {
    if (transacao.type === 'entrada') totalEntradas += transacao.amount;
    else totalSaidas += transacao.amount;
  }
  const saldo = totalEntradas - totalSaidas;

  const totalAReceber = aReceber.reduce((soma, item) => soma + item.valor, 0);

  // ---------- Lançamentos ----------

  async function handleAddTransaction() {
    setSalvandoLancamento(true);
    setAddError(null);
    try {
      await api.post(`/peladas/${peladaId}/transacoes`, {
        type: newTransaction.type,
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount),
        category: newTransaction.category,
        date: newTransaction.date,
      });
      setIsAddDialogOpen(false);
      setNewTransaction({ type: 'saida', description: '', amount: '', date: hojeISO(), category: '' });
      await carregarTudo();
    } catch (err) {
      setAddError(mensagemDeErro(err, 'Não foi possível salvar o lançamento.'));
    } finally {
      setSalvandoLancamento(false);
    }
  }

  async function handleExcluirLancamento() {
    if (!lancamentoParaExcluir) return;

    setExcluindo(true);
    setExcluirError(null);
    try {
      await api.delete(`/peladas/${peladaId}/transacoes/${lancamentoParaExcluir.id}`);
      setLancamentoParaExcluir(null);
      await carregarTudo();
    } catch (err) {
      setExcluirError(mensagemDeErro(err, 'Não foi possível excluir o lançamento.'));
    } finally {
      setExcluindo(false);
    }
  }

  const valorLancamento = parseFloat(newTransaction.amount);
  const erroLancamento =
    newTransaction.amount && !(valorLancamento > 0) ? 'O valor precisa ser maior que zero.' :
    newTransaction.date > hojeISO() ? 'A data não pode estar no futuro.' :
    null;
  const lancamentoCompleto =
    newTransaction.description.trim() !== '' && newTransaction.amount !== '' &&
    newTransaction.date !== '' && newTransaction.category !== '' && erroLancamento === null;

  // ---------- Configuração ----------

  function abrirConfig() {
    if (config) {
      setConfigForm({
        valorMensalidade: String(config.valorMensalidade),
        valorAvulso: String(config.valorAvulso),
        valorCartaoAmarelo: String(config.valorCartaoAmarelo),
        valorCartaoVermelho: String(config.valorCartaoVermelho),
      });
    }
    setConfigError(null);
    setIsConfigOpen(true);
  }

  async function handleSalvarConfig() {
    const valores = {
      valorMensalidade: parseFloat(configForm.valorMensalidade || '0'),
      valorAvulso: parseFloat(configForm.valorAvulso || '0'),
      valorCartaoAmarelo: parseFloat(configForm.valorCartaoAmarelo || '0'),
      valorCartaoVermelho: parseFloat(configForm.valorCartaoVermelho || '0'),
    };
    if (Object.values(valores).some((v) => Number.isNaN(v) || v < 0)) {
      setConfigError('Informe valores iguais ou maiores que zero.');
      return;
    }

    setSalvandoConfig(true);
    setConfigError(null);
    try {
      await api.put(`/peladas/${peladaId}/financeiro/config`, valores);
      setIsConfigOpen(false);
      await carregarTudo();
    } catch (err) {
      setConfigError(mensagemDeErro(err, 'Não foi possível salvar os valores.'));
    } finally {
      setSalvandoConfig(false);
    }
  }

  // ---------- Pagamentos ----------

  function abrirPagamentoMensalidade(mensalista: Mensalista, ano: number, mes: number) {
    setPagamentoPendente({
      tipo: 'mensalidade',
      jogadorId: mensalista.jogadorId,
      jogadorNome: mensalista.nome,
      ano,
      mes,
      valor: config && config.valorMensalidade > 0 ? String(config.valorMensalidade) : '',
    });
    setPagoEm(hojeISO());
    setRegistrarError(null);
  }

  function abrirPagamentoItem(item: ItemAReceber) {
    if (item.cobrancaId === null && item.ano !== null && item.mes !== null) {
      setPagamentoPendente({
        tipo: 'mensalidade',
        jogadorId: item.jogadorId,
        jogadorNome: item.jogadorNome,
        ano: item.ano,
        mes: item.mes,
        valor: String(item.valor),
      });
    } else if (item.cobrancaId !== null) {
      setPagamentoPendente({
        tipo: 'cobranca',
        cobrancaId: item.cobrancaId,
        jogadorNome: item.jogadorNome,
        descricao: item.descricao,
        valor: item.valor,
      });
    }
    setPagoEm(hojeISO());
    setRegistrarError(null);
  }

  async function handleRegistrarPagamento() {
    if (!pagamentoPendente) return;

    setRegistrando(true);
    setRegistrarError(null);
    try {
      if (pagamentoPendente.tipo === 'mensalidade') {
        await api.post(`/peladas/${peladaId}/financeiro/mensalidades`, {
          jogadorId: pagamentoPendente.jogadorId,
          ano: pagamentoPendente.ano,
          mes: pagamentoPendente.mes,
          valor: parseFloat(pagamentoPendente.valor),
          pagoEm,
        });
      } else {
        await api.post(`/peladas/${peladaId}/financeiro/cobrancas/${pagamentoPendente.cobrancaId}/pagar`, { pagoEm });
      }
      setPagamentoPendente(null);
      await carregarTudo();
    } catch (err) {
      setRegistrarError(mensagemDeErro(err, 'Não foi possível registrar o pagamento.'));
    } finally {
      setRegistrando(false);
    }
  }

  async function handleDesfazerMensalidade() {
    if (!pagamentoDetalhe) return;

    setDesfazendo(true);
    setDesfazerError(null);
    try {
      await api.delete(`/peladas/${peladaId}/financeiro/mensalidades/${pagamentoDetalhe.pagamento.id}`);
      setPagamentoDetalhe(null);
      await carregarTudo();
    } catch (err) {
      setDesfazerError(mensagemDeErro(err, 'Não foi possível desfazer o pagamento.'));
    } finally {
      setDesfazendo(false);
    }
  }

  const valorPagamentoInvalido =
    pagamentoPendente?.tipo === 'mensalidade' && !(parseFloat(pagamentoPendente.valor) > 0);
  const dataPagamentoInvalida = !pagoEm || pagoEm > hojeISO();

  // ---------- Mensalidades: dados da grade ----------

  const mesAtualChave = mensalidades ? chaveMes(mensalidades.anoAtual, mensalidades.mesAtual) : 0;

  function mesesEmAberto(m: Mensalista): number {
    // Só mensalista ativo gera mensalidade em aberto (mesma regra do back, aba A receber).
    if (!mensalidades || m.status !== 'ativo') return 0;
    const pagos = new Set(m.pagamentos.map((p) => chaveMes(p.ano, p.mes)));
    let abertos = 0;
    for (let chave = chaveMes(m.inicioAno, m.inicioMes); chave <= mesAtualChave; chave++) {
      if (!pagos.has(chave)) abertos++;
    }
    return abertos;
  }

  function ultimoPagamento(m: Mensalista): PagamentoMensalidade | null {
    if (m.pagamentos.length === 0) return null;
    return m.pagamentos.reduce((maior, p) => (chaveMes(p.ano, p.mes) > chaveMes(maior.ano, maior.mes) ? p : maior));
  }

  // ---------- A receber: filtro ----------

  const itensFiltrados = aReceber.filter((item) => {
    if (filtroAReceber === 'todos') return true;
    if (filtroAReceber === 'cartao') return item.tipo === 'cartao_amarelo' || item.tipo === 'cartao_vermelho';
    return item.tipo === filtroAReceber;
  });

  function totalPorTipo(tipos: TipoAReceber[]): number {
    return aReceber.filter((i) => tipos.includes(i.tipo)).reduce((soma, i) => soma + i.valor, 0);
  }

  const semValoresConfigurados = config !== null &&
    config.valorMensalidade === 0 && config.valorAvulso === 0 &&
    config.valorCartaoAmarelo === 0 && config.valorCartaoVermelho === 0;

  if (loading) {
    return <p className="text-muted-foreground">Carregando finanças...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
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
            Caixa, mensalidades e contas a receber
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
            variant="outline"
            className="flex items-center gap-2 border-2"
            onClick={abrirConfig}
          >
            <Settings className="h-4 w-4" />
            Valores
          </Button>
          <Button
            onClick={() => { setAddError(null); setIsAddDialogOpen(true); }}
            className="flex items-center gap-2 bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
          >
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {semValoresConfigurados && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-blue-800">
            <strong>Configure os valores da pelada</strong> (mensalidade, avulso e multas de cartão) para que as
            cobranças sejam geradas automaticamente.
          </p>
          <Button size="sm" variant="outline" onClick={abrirConfig}>Configurar valores</Button>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatarMoeda(saldo)}
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
                <p className="text-3xl font-bold text-green-600">{formatarMoeda(totalEntradas)}</p>
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
                <p className="text-3xl font-bold text-red-600">{formatarMoeda(totalSaidas)}</p>
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
                <p className="text-3xl font-bold text-orange-600">{formatarMoeda(totalAReceber)}</p>
              </div>
              <AlertCircle className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
          <TabsTrigger value="a-receber">A Receber ({aReceber.length})</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* ---------- Lançamentos ---------- */}
        <TabsContent value="lancamentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Lançamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum lançamento ainda. Use "Novo Lançamento" para registrar aluguel de campo, compra de bola, festas etc.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatarData(transaction.date)}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{nomeCategoria(transaction.category)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{transaction.paidBy || '-'}</TableCell>
                        <TableCell className="text-right">
                          <span className={transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'entrada' ? '+' : '-'} {formatarMoeda(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            aria-label="Excluir lançamento"
                            onClick={() => { setExcluirError(null); setLancamentoParaExcluir(transaction); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Mensalidades ---------- */}
        <TabsContent value="mensalidades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-4">
                <span>Mensalidades</span>
                {anoGrade !== null && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" aria-label="Ano anterior" onClick={() => setAnoGrade(anoGrade - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold w-14 text-center">{anoGrade}</span>
                    <Button variant="outline" size="sm" aria-label="Próximo ano" onClick={() => setAnoGrade(anoGrade + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && config.valorMensalidade === 0 && (
                <p className="text-sm text-muted-foreground">
                  Valor da mensalidade não configurado: os meses não pagos não entram em "A receber".
                  Configure em <strong>Valores</strong>.
                </p>
              )}

              {!mensalidades || mensalidades.mensalistas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum mensalista nesta pelada. Cadastre jogadores com o tipo "Mensalista" na aba Jogadores.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jogador</TableHead>
                        <TableHead>Último pagamento</TableHead>
                        <TableHead className="text-center">Em aberto</TableHead>
                        {MESES.map((nome) => (
                          <TableHead key={nome} className="text-center px-1">{nome}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mensalidades.mensalistas.map((m) => {
                        const ultimo = ultimoPagamento(m);
                        const abertos = mesesEmAberto(m);
                        return (
                          <TableRow key={m.jogadorId}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {m.nome}
                              {m.status !== 'ativo' && (
                                <Badge variant="outline" className="ml-2">
                                  {m.status === 'licenca' ? 'De licença' : 'Inativo'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {ultimo ? (
                                <>
                                  {formatarMesAno(ultimo.ano, ultimo.mes)}
                                  <span className="text-muted-foreground"> (pago em {formatarData(ultimo.pagoEm)})</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Nenhum</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {abertos > 0 ? <Badge variant="destructive">{abertos}</Badge> : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            {MESES.map((nomeMes, i) => {
                              const mes = i + 1;
                              const ano = anoGrade ?? mensalidades.anoAtual;
                              const chave = chaveMes(ano, mes);
                              const pagamento = m.pagamentos.find((p) => p.ano === ano && p.mes === mes);
                              const antesDoInicio = chave < chaveMes(m.inicioAno, m.inicioMes);
                              const devido = !antesDoInicio && chave <= mesAtualChave && m.status === 'ativo';
                              const titulo = `${nomeMes}/${ano}`;

                              if (pagamento) {
                                return (
                                  <TableCell key={mes} className="text-center px-1">
                                    <button
                                      type="button"
                                      title={`${titulo}: pago em ${formatarData(pagamento.pagoEm)} (${formatarMoeda(pagamento.valor)})`}
                                      className="w-8 h-8 rounded-md bg-green-100 text-green-700 hover:bg-green-200 inline-flex items-center justify-center"
                                      onClick={() => { setDesfazerError(null); setPagamentoDetalhe({ mensalista: m, pagamento }); }}
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                  </TableCell>
                                );
                              }
                              if (antesDoInicio) {
                                return (
                                  <TableCell key={mes} className="text-center px-1 text-muted-foreground" title={`${titulo}: antes do cadastro`}>
                                    —
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={mes} className="text-center px-1">
                                  <button
                                    type="button"
                                    title={devido ? `${titulo}: em aberto, clique para registrar o pagamento` : `${titulo}: registrar pagamento`}
                                    className={`w-8 h-8 rounded-md border inline-flex items-center justify-center text-xs ${
                                      devido ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                    onClick={() => abrirPagamentoMensalidade(m, ano, mes)}
                                  >
                                    {devido ? '!' : '+'}
                                  </button>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground mt-3">
                    <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300 align-middle" /> pago ·{' '}
                    <span className="inline-block w-3 h-3 rounded-sm bg-red-50 border border-red-300 align-middle" /> em aberto ·{' '}
                    + pagar adiantado · — antes do cadastro. Clique num mês pago para ver ou desfazer o pagamento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- A receber ---------- */}
        <TabsContent value="a-receber" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Mensalidades não pagas</p>
                <p className="text-2xl font-bold">{formatarMoeda(totalPorTipo(['mensalidade']))}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Avulsos não pagos</p>
                <p className="text-2xl font-bold">{formatarMoeda(totalPorTipo(['avulso']))}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Cartões não pagos</p>
                <p className="text-2xl font-bold">{formatarMoeda(totalPorTipo(['cartao_amarelo', 'cartao_vermelho']))}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-4">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Contas a Receber
                </span>
                <Select value={filtroAReceber} onValueChange={(v: typeof filtroAReceber) => setFiltroAReceber(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="mensalidade">Mensalidades</SelectItem>
                    <SelectItem value="avulso">Avulsos</SelectItem>
                    <SelectItem value="cartao">Cartões</SelectItem>
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itensFiltrados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nada a receber{filtroAReceber !== 'todos' ? ' neste filtro' : ''}. 🎉
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensFiltrados.map((item) => (
                      <TableRow key={item.cobrancaId !== null ? `c${item.cobrancaId}` : `m${item.jogadorId}-${item.ano}-${item.mes}`}>
                        <TableCell className="font-medium">{item.jogadorNome}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={TIPOS_A_RECEBER[item.tipo].classes}>
                            {TIPOS_A_RECEBER[item.tipo].nome}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.tipo === 'mensalidade' && item.ano !== null && item.mes !== null
                            ? formatarMesAno(item.ano, item.mes)
                            : formatarData(item.data)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">{formatarMoeda(item.valor)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-green-600 hover:bg-green-50 ml-auto"
                            onClick={() => abrirPagamentoItem(item)}
                          >
                            <Check className="h-4 w-4" />
                            Receber
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Cartões entram aqui ao serem registrados na partida; avulsos, quando marcados como presentes numa
                partida finalizada. Mensalidades em aberto contam só para mensalistas ativos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Dashboard ---------- */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* ---------- Novo lançamento ---------- */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Novo Lançamento
            </DialogTitle>
            <DialogDescription>
              Despesas e entradas avulsas do caixa (aluguel de campo, bola, festas...). Pagamentos de mensalidade,
              avulso e cartão são registrados nas abas Mensalidades e A Receber.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newTransaction.type}
                onValueChange={(value: 'entrada' | 'saida') => setNewTransaction({ ...newTransaction, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saida">Saída (despesa)</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Aluguel do campo - outubro"
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
                  min={0}
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
                  max={hojeISO()}
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
                  {CATEGORIAS_MANUAIS.map((c) => (
                    <SelectItem key={c.valor} value={c.valor}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(erroLancamento || addError) && <p className="text-sm text-destructive">{erroLancamento ?? addError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-2">
              Cancelar
            </Button>
            <Button
              onClick={handleAddTransaction}
              disabled={!lancamentoCompleto || salvandoLancamento}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              {salvandoLancamento ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Excluir lançamento ---------- */}
      <AlertDialog
        open={lancamentoParaExcluir !== null}
        onOpenChange={(open) => { if (!open && !excluindo) setLancamentoParaExcluir(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {lancamentoParaExcluir && CATEGORIAS_AUTOMATICAS[lancamentoParaExcluir.category] ? (
                <>
                  Este lançamento veio de um pagamento ({nomeCategoria(lancamentoParaExcluir.category).toLowerCase()} de{' '}
                  {lancamentoParaExcluir.paidBy}). Excluir também <strong>desfaz o pagamento</strong>: o valor volta
                  para "A receber".
                </>
              ) : (
                <>
                  Tem certeza que deseja excluir "{lancamentoParaExcluir?.description}"? Essa ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {excluirError && <p className="text-sm text-destructive">{excluirError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleExcluirLancamento(); }}
              disabled={excluindo}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {excluindo ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------- Registrar pagamento ---------- */}
      <Dialog open={pagamentoPendente !== null} onOpenChange={(open) => { if (!open && !registrando) setPagamentoPendente(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              {pagamentoPendente?.tipo === 'mensalidade' &&
                `Mensalidade de ${formatarMesAno(pagamentoPendente.ano, pagamentoPendente.mes)} - ${pagamentoPendente.jogadorNome}`}
              {pagamentoPendente?.tipo === 'cobranca' &&
                `${pagamentoPendente.descricao} - ${pagamentoPendente.jogadorNome}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {pagamentoPendente?.tipo === 'mensalidade' ? (
              <div className="space-y-2">
                <Label htmlFor="valorPagamento">Valor (R$)</Label>
                <Input
                  id="valorPagamento"
                  type="number"
                  min={0}
                  step="0.01"
                  value={pagamentoPendente.valor}
                  onChange={(e) => setPagamentoPendente({ ...pagamentoPendente, valor: e.target.value })}
                />
              </div>
            ) : (
              pagamentoPendente && (
                <p className="text-2xl font-bold">{formatarMoeda(pagamentoPendente.valor)}</p>
              )
            )}

            <div className="space-y-2">
              <Label htmlFor="pagoEm">Data do pagamento</Label>
              <Input id="pagoEm" type="date" max={hojeISO()} value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
            </div>

            <p className="text-xs text-muted-foreground">
              O pagamento entra automaticamente como entrada em Lançamentos.
            </p>

            {registrarError && <p className="text-sm text-destructive">{registrarError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" className="border-2" disabled={registrando} onClick={() => setPagamentoPendente(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarPagamento}
              disabled={registrando || valorPagamentoInvalido || dataPagamentoInvalida}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              {registrando ? 'Registrando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Detalhe de mensalidade paga ---------- */}
      <Dialog open={pagamentoDetalhe !== null} onOpenChange={(open) => { if (!open && !desfazendo) setPagamentoDetalhe(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mensalidade paga</DialogTitle>
            <DialogDescription>
              {pagamentoDetalhe &&
                `${pagamentoDetalhe.mensalista.nome} - ${formatarMesAno(pagamentoDetalhe.pagamento.ano, pagamentoDetalhe.pagamento.mes)}`}
            </DialogDescription>
          </DialogHeader>

          {pagamentoDetalhe && (
            <div className="space-y-2 py-4">
              <p><span className="text-muted-foreground">Valor:</span> <strong>{formatarMoeda(pagamentoDetalhe.pagamento.valor)}</strong></p>
              <p><span className="text-muted-foreground">Pago em:</span> <strong>{formatarData(pagamentoDetalhe.pagamento.pagoEm)}</strong></p>
              <p className="text-xs text-muted-foreground pt-2">
                Desfazer remove o pagamento e a entrada correspondente em Lançamentos.
              </p>
              {desfazerError && <p className="text-sm text-destructive">{desfazerError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="border-2" disabled={desfazendo} onClick={() => setPagamentoDetalhe(null)}>
              Fechar
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              disabled={desfazendo}
              onClick={handleDesfazerMensalidade}
            >
              {desfazendo ? 'Desfazendo...' : 'Desfazer pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Valores da pelada ---------- */}
      <Dialog open={isConfigOpen} onOpenChange={(open) => { if (!salvandoConfig) setIsConfigOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Valores da Pelada
            </DialogTitle>
            <DialogDescription>
              Usados para gerar as cobranças. Deixe 0 para não cobrar. Mudanças valem para cobranças novas;
              as já geradas mantêm o valor de quando foram criadas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {([
              ['valorMensalidade', 'Mensalidade'],
              ['valorAvulso', 'Avulso (por partida)'],
              ['valorCartaoAmarelo', 'Multa cartão amarelo'],
              ['valorCartaoVermelho', 'Multa cartão vermelho'],
            ] as const).map(([campo, rotulo]) => (
              <div key={campo} className="space-y-2">
                <Label htmlFor={campo}>{rotulo} (R$)</Label>
                <Input
                  id={campo}
                  type="number"
                  min={0}
                  step="0.01"
                  value={configForm[campo]}
                  onChange={(e) => setConfigForm({ ...configForm, [campo]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {configError && <p className="text-sm text-destructive">{configError}</p>}

          <DialogFooter>
            <Button variant="outline" className="border-2" disabled={salvandoConfig} onClick={() => setIsConfigOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarConfig}
              disabled={salvandoConfig}
              className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            >
              {salvandoConfig ? 'Salvando...' : 'Salvar Valores'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
