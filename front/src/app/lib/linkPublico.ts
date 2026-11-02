// Links públicos (sem login, somente leitura): dashboard financeiro de uma pelada e partida.
// O App confere esses caminhos antes de pedir login.
const PREFIXOS = {
  financeiro: '/compartilhado/financeiro/',
  partida: '/compartilhado/partida/',
} as const;

export type TipoLinkPublico = keyof typeof PREFIXOS;

export function linkPublico(tipo: TipoLinkPublico, token: string): string {
  return `${window.location.origin}${PREFIXOS[tipo]}${token}`;
}

/** Link público aberto na URL atual (null se a página aberta não é um link compartilhado). */
export function linkPublicoDaUrlAtual(): { tipo: TipoLinkPublico; token: string } | null {
  const { pathname } = window.location;
  for (const tipo of Object.keys(PREFIXOS) as TipoLinkPublico[]) {
    if (!pathname.startsWith(PREFIXOS[tipo])) continue;
    const token = pathname.slice(PREFIXOS[tipo].length).replace(/\/$/, '');
    return token ? { tipo, token } : null;
  }
  return null;
}
