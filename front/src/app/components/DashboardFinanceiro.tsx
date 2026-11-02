import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Area, AreaChart, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from './ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { TrendingUp, TrendingDown, Wallet, Users, Table2, BarChart3 } from 'lucide-react';

// Só o que o dashboard usa dos dados já carregados pela FinancasPage.
export interface DashboardTransacao {
  type: 'entrada' | 'saida';
  amount: number;
  date: string; // "2026-10-04T12:00:00"
  category: string;
}

export interface DashboardMensalista {
  jogadorId: number;
  status: string;
  pagamentos: { ano: number; mes: number }[];
}

export interface DashboardItemAReceber {
  jogadorId: number;
  jogadorNome: string;
  valor: number;
}

interface DashboardFinanceiroProps {
  transacoes: DashboardTransacao[];
  mensalistas: DashboardMensalista[];
  /**
   * Pendências por jogador (com nome). No link público não vem: lá só aparece o total,
   * para não expor quem deve quanto (ver `totalAReceber`).
   */
  aReceber?: DashboardItemAReceber[];
  /** Usado quando `aReceber` não vem (dashboard público). */
  totalAReceber?: number;
  /** Mês de referência (o atual, no horário de Brasília, vindo do back) */
  anoAtual: number;
  mesAtual: number;
  nomeCategoria: (categoria: string) => string;
  formatarMoeda: (valor: number) => string;
}

// Cores por papel, não por posição: entrada é sempre azul e saída sempre laranja em todos os gráficos.
// Paleta validada para daltonismo (entrada x saída) no claro e no escuro.
const chartConfig = {
  entradas: { label: 'Entradas', theme: { light: '#2a78d6', dark: '#3987e5' } },
  saidas: { label: 'Saídas', theme: { light: '#eb6834', dark: '#d95926' } },
  saldo: { label: 'Saldo', theme: { light: '#1baf7a', dark: '#199e70' } },
} satisfies ChartConfig;

const PERIODOS = [
  { meses: 3, nome: '3 meses' },
  { meses: 6, nome: '6 meses' },
  { meses: 12, nome: '12 meses' },
];

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const moedaCompacta = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

// Mês como número único (2026*12 + 10), como na FinancasPage.
function chaveMes(ano: number, mes: number): number {
  return ano * 12 + mes;
}

// Lê o mês direto do texto da data, sem passar por Date (evita mudar de mês por fuso).
function chaveDaData(iso: string): number {
  const [ano, mes] = iso.slice(0, 7).split('-').map(Number);
  return chaveMes(ano, mes);
}

function rotuloMes(chave: number): string {
  const ano = Math.floor((chave - 1) / 12);
  const mes = chave - ano * 12;
  return `${MESES[mes - 1]}/${String(ano).slice(2)}`;
}

export function DashboardFinanceiro({
  transacoes, mensalistas, aReceber, totalAReceber, anoAtual, mesAtual, nomeCategoria, formatarMoeda,
}: DashboardFinanceiroProps) {
  const [periodo, setPeriodo] = useState(6);
  const [verTabela, setVerTabela] = useState(false);

  // Largura do gráfico mensal: as barras afinam para caber todos os meses (no celular ou com 12 meses)
  // sem encostar no mês vizinho. O par entrada/saída fica sempre junto, com 2px entre as barras.
  const areaMensal = useRef<HTMLDivElement>(null);
  const [larguraMensal, setLarguraMensal] = useState(800);
  useEffect(() => {
    const elemento = areaMensal.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => setLarguraMensal(entrada.contentRect.width));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [verTabela]);

  const chaveAtual = chaveMes(anoAtual, mesAtual);
  const chaveInicio = chaveAtual - periodo + 1;
  const noPeriodo = transacoes.filter((t) => {
    const chave = chaveDaData(t.date);
    return chave >= chaveInicio && chave <= chaveAtual;
  });

  // ---------- Mês a mês: entradas, saídas e saldo no fim do mês ----------
  // O saldo parte de tudo o que entrou/saiu antes do período, para bater com o "Saldo Atual".
  let saldoAcumulado = transacoes
    .filter((t) => chaveDaData(t.date) < chaveInicio)
    .reduce((soma, t) => soma + (t.type === 'entrada' ? t.amount : -t.amount), 0);

  const porMes = [];
  for (let chave = chaveInicio; chave <= chaveAtual; chave++) {
    const doMes = noPeriodo.filter((t) => chaveDaData(t.date) === chave);
    const entradas = doMes.filter((t) => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
    const saidas = doMes.filter((t) => t.type === 'saida').reduce((s, t) => s + t.amount, 0);
    saldoAcumulado += entradas - saidas;
    porMes.push({ mes: rotuloMes(chave), entradas, saidas, resultado: entradas - saidas, saldo: saldoAcumulado });
  }

  const totalEntradas = porMes.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas = porMes.reduce((s, m) => s + m.saidas, 0);
  const resultado = totalEntradas - totalSaidas;

  // ---------- Por categoria (no período) ----------
  function porCategoria(tipo: 'entrada' | 'saida') {
    const totais = new Map<string, number>();
    for (const t of noPeriodo.filter((t) => t.type === tipo)) {
      totais.set(t.category, (totais.get(t.category) ?? 0) + t.amount);
    }
    return [...totais.entries()]
      .map(([categoria, valor]) => ({ categoria: nomeCategoria(categoria), valor }))
      .sort((a, b) => b.valor - a.valor);
  }
  const saidasPorCategoria = porCategoria('saida');
  const entradasPorOrigem = porCategoria('entrada');

  // ---------- Mensalidades do mês atual ----------
  const ativos = mensalistas.filter((m) => m.status === 'ativo');
  const pagaramMesAtual = ativos.filter((m) => m.pagamentos.some((p) => p.ano === anoAtual && p.mes === mesAtual)).length;
  const adimplencia = ativos.length > 0 ? Math.round((pagaramMesAtual / ativos.length) * 100) : null;

  // ---------- Maiores pendências (situação de hoje) ----------
  const pendenciasPorJogador = new Map<number, { jogadorId: number; nome: string; valor: number; itens: number }>();
  for (const item of aReceber ?? []) {
    const atual = pendenciasPorJogador.get(item.jogadorId) ?? { jogadorId: item.jogadorId, nome: item.jogadorNome, valor: 0, itens: 0 };
    atual.valor += item.valor;
    atual.itens++;
    pendenciasPorJogador.set(item.jogadorId, atual);
  }
  const maioresPendencias = [...pendenciasPorJogador.values()].sort((a, b) => b.valor - a.valor).slice(0, 5);

  const semMovimento = noPeriodo.length === 0;
  // 72px do eixo; o par de barras ocupa até 60% do espaço de cada mês, sem passar de 22px por barra.
  const larguraBarra = Math.max(4, Math.min(22, Math.floor(((larguraMensal - 72) / periodo) * 0.6 / 2)));
  const eixoMoeda = (v: number) => moedaCompacta.format(v);
  const tooltipMoeda = (valor: unknown, nome: unknown) => (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-muted-foreground">{chartConfig[nome as keyof typeof chartConfig]?.label ?? String(nome)}</span>
      <span className="font-mono font-medium tabular-nums text-foreground">{formatarMoeda(Number(valor))}</span>
    </div>
  );

  function barrasPorCategoria(dados: { categoria: string; valor: number }[], serie: 'entradas' | 'saidas', vazio: string) {
    if (dados.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-10">{vazio}</p>;
    }
    const total = dados.reduce((s, d) => s + d.valor, 0);
    return (
      <ChartContainer config={chartConfig} className="w-full" style={{ height: Math.max(120, dados.length * 44) }}>
        <BarChart data={dados} layout="vertical" margin={{ left: 0, right: 112 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="categoria" width={112} tickLine={false} axisLine={false} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.4 }}
            content={<ChartTooltipContent indicator="line" hideLabel={false} formatter={(v) => tooltipMoeda(v, serie)} />}
          />
          <Bar
            dataKey="valor"
            name={serie}
            fill={`var(--color-${serie})`}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            // Rótulo próprio: o padrão do recharts quebra o texto na largura da barra.
            label={({ x, y, width, height, value }: { x: number; y: number; width: number; height: number; value: number }) => (
              <text x={x + width + 6} y={y + height / 2} dominantBaseline="middle" className="fill-foreground text-xs">
                {formatarMoeda(value)}
                <tspan className="fill-muted-foreground"> · {Math.round((value / total) * 100)}%</tspan>
              </text>
            )}
          />
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro do período: vale para tudo abaixo, menos as pendências (que são a situação de hoje) */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Período</span>
        <div className="inline-flex rounded-lg border-2 p-1 bg-muted/40" role="group" aria-label="Período do dashboard">
          {PERIODOS.map((p) => (
            <Button
              key={p.meses}
              size="sm"
              variant={periodo === p.meses ? 'default' : 'ghost'}
              aria-pressed={periodo === p.meses}
              onClick={() => setPeriodo(p.meses)}
            >
              {p.nome}
            </Button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {rotuloMes(chaveInicio)} a {rotuloMes(chaveAtual)}
        </span>
      </div>

      {/* Indicadores do período */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Entradas</p>
            <p className="text-2xl font-bold">{formatarMoeda(totalEntradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingDown className="h-4 w-4" /> Saídas</p>
            <p className="text-2xl font-bold">{formatarMoeda(totalSaidas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4" /> Resultado</p>
            <p className={`text-2xl font-bold ${resultado >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-600'}`}>
              {resultado >= 0 ? '+' : '−'} {formatarMoeda(Math.abs(resultado))}
            </p>
            <p className="text-xs text-muted-foreground">{resultado >= 0 ? 'Sobrou dinheiro no período' : 'Gastou mais do que entrou'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4" /> Mensalidades de {rotuloMes(chaveAtual)}</p>
            <p className="text-2xl font-bold">{adimplencia === null ? '—' : `${adimplencia}%`}</p>
            <p className="text-xs text-muted-foreground">
              {adimplencia === null ? 'Nenhum mensalista ativo' : `${pagaramMesAtual} de ${ativos.length} mensalistas pagaram`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Entradas x saídas por mês */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Entradas x Saídas por mês</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setVerTabela(!verTabela)} aria-pressed={verTabela}>
            {verTabela ? <BarChart3 className="h-4 w-4 mr-2" /> : <Table2 className="h-4 w-4 mr-2" />}
            {verTabela ? 'Ver gráfico' : 'Ver tabela'}
          </Button>
        </CardHeader>
        <CardContent>
          {semMovimento && !verTabela ? (
            <p className="text-sm text-muted-foreground text-center py-16">Nenhum lançamento no período.</p>
          ) : verTabela ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Saldo no fim do mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porMes.map((m) => (
                  <TableRow key={m.mes}>
                    <TableCell>{m.mes}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatarMoeda(m.entradas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatarMoeda(m.saidas)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${m.resultado < 0 ? 'text-red-600' : ''}`}>{formatarMoeda(m.resultado)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatarMoeda(m.saldo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div ref={areaMensal}>
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <BarChart data={porMes} barGap={2} margin={{ top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={eixoMoeda} />
                  <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent indicator="line" formatter={tooltipMoeda} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="entradas" fill="var(--color-entradas)" radius={[4, 4, 0, 0]} barSize={larguraBarra} />
                  <Bar dataKey="saidas" fill="var(--color-saidas)" radius={[4, 4, 0, 0]} barSize={larguraBarra} />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evolução do saldo */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de caixa · saldo no fim de cada mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={porMes} margin={{ top: 16, right: 16 }}>
              <defs>
                <linearGradient id="fillSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-saldo)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-saldo)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={eixoMoeda} />
              <ReferenceLine y={0} className="stroke-border" />
              <ChartTooltip cursor content={<ChartTooltipContent indicator="line" formatter={tooltipMoeda} />} />
              <Area
                dataKey="saldo"
                type="monotone"
                stroke="var(--color-saldo)"
                strokeWidth={2}
                fill="url(#fillSaldo)"
                dot={{ r: 4, strokeWidth: 2, fill: 'var(--color-saldo)', stroke: 'var(--background)' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground mt-2">
            Saldo em {rotuloMes(chaveAtual)}: <strong className="text-foreground">{formatarMoeda(porMes[porMes.length - 1]?.saldo ?? 0)}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Para onde vai e de onde vem o dinheiro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Saídas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {barrasPorCategoria(saidasPorCategoria, 'saidas', 'Nenhuma despesa no período.')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Entradas por origem</CardTitle>
          </CardHeader>
          <CardContent>
            {barrasPorCategoria(entradasPorOrigem, 'entradas', 'Nenhuma entrada no período.')}
          </CardContent>
        </Card>
      </div>

      {/* Situação de hoje, fora do filtro de período. No link público, só o total (sem nomes). */}
      {aReceber === undefined ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle>A receber</CardTitle>
            <Badge variant="outline">Hoje</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatarMoeda(totalAReceber ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Mensalidades, avulsos e multas ainda não pagos</p>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Maiores pendências</CardTitle>
          <Badge variant="outline">Hoje</Badge>
        </CardHeader>
        <CardContent>
          {maioresPendencias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Ninguém com pagamento pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="text-right">Cobranças</TableHead>
                  <TableHead className="text-right">Total devido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maioresPendencias.map((p) => (
                  <TableRow key={p.jogadorId}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.itens}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatarMoeda(p.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
