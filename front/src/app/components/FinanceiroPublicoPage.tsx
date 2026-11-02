import { useEffect } from 'react';
import { DashboardFinanceiro, DashboardMensalista, DashboardTransacao } from './DashboardFinanceiro';
import { formatarMoeda, nomeCategoria } from './FinancasPage';
import { LayoutPublico, useDadosPublicos } from './LayoutPublico';

// Formato de GET /api/publico/financeiro/{token}: só números, sem nomes de jogadores.
interface DashboardPublico {
  peladaNome: string;
  anoAtual: number;
  mesAtual: number;
  transacoes: DashboardTransacao[];
  mensalistas: { status: string; pagamentos: { ano: number; mes: number }[] }[];
  totalAReceber: number;
}

// Dashboard financeiro aberto por link, sem login e somente leitura.
export function FinanceiroPublicoPage({ token }: { token: string }) {
  const { dados, erro } = useDadosPublicos<DashboardPublico>(`/publico/financeiro/${encodeURIComponent(token)}`);

  useEffect(() => {
    if (dados) document.title = `${dados.peladaNome} · Financeiro · 4Fut`;
  }, [dados]);

  // O dashboard só usa status e meses pagos; o id é só uma chave interna.
  const mensalistas: DashboardMensalista[] = (dados?.mensalistas ?? []).map((m, i) => ({ jogadorId: i, ...m }));

  return (
    <LayoutPublico erro={erro} carregando={!dados}>
      {dados && (
        <>
          <div>
            <h1>{dados.peladaNome}</h1>
            <p className="text-muted-foreground">Dashboard financeiro compartilhado pelo organizador</p>
          </div>
          <DashboardFinanceiro
            transacoes={dados.transacoes}
            mensalistas={mensalistas}
            totalAReceber={dados.totalAReceber}
            anoAtual={dados.anoAtual}
            mesAtual={dados.mesAtual}
            nomeCategoria={nomeCategoria}
            formatarMoeda={formatarMoeda}
          />
        </>
      )}
    </LayoutPublico>
  );
}
