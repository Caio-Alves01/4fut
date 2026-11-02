import { useEffect, useState, type ReactNode } from 'react';
import { Eye, Link2Off } from 'lucide-react';
import { api, ApiError } from '../lib/api';

// Busca os dados de um link público. erro 'invalido' = link desativado ou trocado (404).
export function useDadosPublicos<T>(caminho: string) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<T>(caminho)
      .then(setDados)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setErro('invalido');
        else if (err instanceof ApiError && err.status === 429) setErro(err.message);
        else setErro('Não foi possível carregar esta página. Tente novamente em instantes.');
      });
  }, [caminho]);

  return { dados, erro };
}

// Moldura das páginas abertas por link (sem login): marca, aviso de somente leitura e os estados
// de carregando / link inválido / erro. O conteúdo só aparece com os dados carregados.
export function LayoutPublico({ erro, carregando, children }: { erro: string | null; carregando: boolean; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-primary/20 bg-card shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 p-4 flex-wrap">
          <a href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-brasil rounded-xl flex items-center justify-center shadow-brasil">
              <span className="text-white font-bold text-2xl">⚽</span>
            </div>
            <div>
              <p className="text-2xl font-bold bg-gradient-to-r from-verde-brasil to-azul-brasil bg-clip-text text-transparent">4Fut</p>
              <p className="text-xs text-muted-foreground">Gestão de Peladas Profissional</p>
            </div>
          </a>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" /> Somente leitura
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {erro === 'invalido' ? (
          <div className="text-center py-20 space-y-3">
            <Link2Off className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1>Link inválido</h1>
            <p className="text-muted-foreground">Este link foi desativado ou trocado pelo organizador da pelada.</p>
          </div>
        ) : erro ? (
          <p className="text-destructive text-center py-20">{erro}</p>
        ) : carregando ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
