# CHANGELOG — Consolidação do fluxo 4Fut

Consolidação do protótipo em um único fluxo vivo, incorporando as funcionalidades órfãs
úteis (Ranking, Presença/RSVP, Inadimplentes completo, Conta, Administração), excluindo
explicitamente as 3 páginas de modalidade (Futebol de Campo, Futsal, Fut7), e alinhando os
tipos de dados ao modelo lógico final (`/home/claude/modelo_final.md`).

## Arquivos adicionados

- `src/app/components/positions.ts` — catálogo padronizado de posições (`POSICOES`:
  GOL/ZAG/LAT/VOL/MEI/ATA/PON), com `posicaoNome()` e `posicaoCorClasses()` para exibir
  nomes por extenso e cores de badge a partir da sigla. Compartilhado por `JogadoresPage`
  e `EscalacaoCartolaPage` para que ambos usem a mesma referência de posição
  (equivalente à tabela `Posicoes` do modelo final).

## Arquivos deletados (dead code / superseded)

- `HomePage.tsx`, `DashboardPage.tsx` — telas órfãs nunca roteadas pelo `App.tsx`.
- `AdminPage.tsx` — shell de abas cuja função foi absorvida pela aba "Administração"
  dentro de `PeladaDetailPage` + pelas páginas individuais já roteadas.
- `PeladaPage.tsx` — legado; seu shape de `members[]` (`status: ativo|inadimplente`) foi
  minerado para a aba Administração de `PeladaDetailPage`.
- `PartidaPage.tsx` — legado singular; seu shape de RSVP (`jogadoresPartida`) foi minerado
  para a nova aba Presença em `PartidasPage`.
- `EscalacaoPage.tsx` — lista simples titulares/reservas, agora redundante após o toggle
  Lista/Campo em `EscalacaoCartolaPage`.
- `FinancePage.tsx` — financeiro org/time-wide, totalmente superseded por `FinancasPage`.
- `InadimplentesPage.tsx` — versão global cross-pelada; seu shape enriquecido (email,
  status, histórico de cobranças) foi minerado para dentro da aba Inadimplentes de
  `FinancasPage`, agora escopada por `peladaId`.
- `PlayerPage.tsx` — os conceitos de `assistencias` e `percentualPresenca` foram
  minerados para `JogadoresPage`/`PartidasPage`.
- `Navigation.tsx` — só era usado por `HomePage.tsx` (morto) e referenciava as páginas de
  modalidade excluídas; substituído por um header global simples embutido no `App.tsx`.
- `FutebolCampoPage.tsx`, `FutsalPage.tsx`, `Fut7Page.tsx` — excluídas explicitamente pelo
  dono do produto.

## Arquivos significativamente modificados

### `src/app/App.tsx`
- Header agora é persistente em **todas** as telas autenticadas (antes só aparecia em
  `peladas-list`), com navegação global "Minhas Peladas" / "Conta" / "Sair" e logo
  clicável levando para `peladas-list`.
- Novas rotas wireadas: `ranking` (recebe `peladaId`) e `account` (rota global, sem
  `peladaId`).

### `src/app/components/JogadoresPage.tsx`
- `position` passou a armazenar a **sigla** do catálogo `Posicoes` (ex.: `"ATA"`) em vez
  de string livre; a UI continua exibindo o nome por extenso via `posicaoNome()`.
- Select de posição no diálogo "Adicionar Jogador" agora é gerado a partir de `POSICOES`.
- `stats.assistencias` adicionado à interface `Player` e aos dados mock; exibido como
  novo card no verso do "álbum" de cada jogador (junto de Gols/Cartões/Jogos).

### `src/app/components/EscalacaoCartolaPage.tsx`
- Novo toggle **Campo / Lista** no topo. A visão Lista mostra duas tabelas (Titulares e
  Reservas — nome, posição, número) derivadas do **mesmo** estado (`formation` /
  `availablePlayers`) usado pelo campo tático — nenhum dado é duplicado/forkado, exatamente
  como pede o modelo (`Escalacao_Jogadores` serve as duas visões).
- Posições dos jogadores mock (`mockPlayers`) migradas para o catálogo padronizado
  (LAD/LAE consolidadas em `LAT`, conforme o modelo final que não distingue lado).

### `src/app/components/PartidasPage.tsx`
- Ao abrir uma partida, a tela de detalhe agora tem **3 abas**: **Presença** (RSVP por
  membro da pelada: confirmado/pendente/recusado, alternável por clique; + toggle
  "Presente" pós-partida, habilitado só quando a partida está `finalizada`) → **Escalação**
  (sub-abas Time 1 / Time 2, como antes) → **Eventos** (formulário para registrar
  gol/amarelo/vermelho, com campo de **assistência opcional** só para eventos do tipo gol,
  e linha do tempo dos eventos já registrados, atualizando o placar automaticamente).
- Novo tipo `Presenca` e `GameEvent.assistPlayer?: string`.

### `src/app/components/PeladaDetailPage.tsx`
- Botão "Configurações" (que era um TODO/stub) virou botão "Administração", que alterna
  para uma seção real com: (a) formulário de edição dos dados da pelada (nome, local,
  horário, descrição); (b) lista de membros com `papel` (organizador/membro) e `status`
  (ativo/pendente/inadimplente/inativo) editáveis via Select, herdando o shape de
  `PeladaPage.tsx` legado e estendendo para o enum completo do modelo final.
- Novo 4º card de acesso rápido "Ranking", linkando para a rota `ranking`.

### `src/app/components/FinancasPage.tsx`
- Aba Inadimplentes enriquecida: `Debtor` ganhou `email`, `ultimoContato`, `status`
  (`pendente|contatado|negociacao|pago`) e `historico: CobrancaHistorico[]`.
- Botões rápidos de ligação/e-mail/WhatsApp por devedor registram uma entrada no
  histórico automaticamente.
- Novo diálogo "Histórico de Cobranças" por devedor (lista + formulário para registrar
  novo contato com canal + observação).
- Novo botão/diálogo "Cobrança em Massa" que registra uma cobrança para todos os
  devedores não pagos de uma vez, no canal escolhido.
- Tudo já operava escopado a um único `peladaId` (estado local do componente
  instanciado por pelada); não havia necessidade de remover mistura cross-pelada, pois
  essa era uma característica exclusiva da extinta `InadimplentesPage.tsx`.

### `src/app/components/RankingPage.tsx`
- Removido o badge fixo "Temporada 2024" e a navegação para `dashboard`.
- Agora recebe `peladaId` e volta para `pelada-detail(peladaId)`; texto do cabeçalho
  deixa claro que as 3 tabelas (artilheiros, cartões, estatísticas individuais) são
  desta pelada.

### `src/app/components/AccountPage.tsx`
- Botão "Configurar" de notificações por e-mail virou um `Switch` funcional
  (`notificacoesEmail`), refletindo o campo `notificacoes_email` do modelo.
- Adicionado botão "Voltar" para `peladas-list` (antes não tinha navegação de saída
  própria).

## Notas / limitações conhecidas (aceitáveis em protótipo mock-only)

- Todo o estado continua sendo `useState` local por componente — não há store
  compartilhada nem persistência real. Por isso, por exemplo, o elenco usado em
  `PartidasPage` (Presença/Eventos) é uma lista mock própria, não vem literalmente do
  estado de `JogadoresPage`.
- Botões "Salvar Partida", "Salvar Alterações" (Administração), "Compartilhar" (Finanças)
  e "Editar" (algumas listas) permanecem como stubs (`console.log`/sem handler) — esse
  padrão já existia no protótipo original e não fazia parte do escopo pedido.
- `npm install` **não pôde ser executado**: a política de rede do sandbox bloqueia acesso
  direto a `registry.npmjs.org` (e o `package.json` do export do Figma Make usa um
  formato de chaves duplicadas `"pkg@versão": "npm:pkg@versão"` que o `npm` padrão
  rejeita como nome de pacote inválido antes mesmo de tentar baixar algo). `pnpm install`
  também falhou por bloqueio de rede (403 no registry). Não foi possível rodar
  `vite build` nem um `tsc --noEmit` completo (com os pacotes reais e seus tipos).
- Verificação alternativa realizada: (1) todos os imports relativos do projeto foram
  varridos programaticamente e resolvem para arquivos existentes; (2) chaves/parênteses/
  colchetes de todos os arquivos tocados foram conferidos como balanceados; (3) rodou-se
  o `tsc` global do ambiente (`--noEmit --jsx react-jsx --skipLibCheck`) a partir de
  `App.tsx`, seguindo toda a árvore de imports viva (13 arquivos em `components/` + toda
  `components/ui/`). Os únicos diagnósticos retornados foram esperados por faltarem
  `node_modules` (TS2307 "cannot find module" para pacotes externos como `react`,
  `lucide-react`, `react-dnd`, `@radix-ui/*`; TS2875 por falta de `react/jsx-runtime`) e
  dois falsos-positivos de prop `key` em `EscalacaoCartolaPage.tsx` (linhas pré-existentes,
  não tocadas nesta consolidação — o TS só reclama de `key` em componentes com props
  tipadas localmente quando `@types/react` não está instalado; com os tipos reais do
  React presentes, isso não ocorre). Nenhum erro de sintaxe ou de tipo genuíno apareceu
  no código próprio do app.
