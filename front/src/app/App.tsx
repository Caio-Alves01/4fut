import { useState, type ReactNode } from 'react';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { PeladasListPage } from './components/PeladasListPage';
import { PeladaDetailPage } from './components/PeladaDetailPage';
import { JogadoresPage } from './components/JogadoresPage';
import { PartidasPage } from './components/PartidasPage';
import { FinancasPage } from './components/FinancasPage';
import { RankingPage } from './components/RankingPage';
import { AccountPage } from './components/AccountPage';
import { FinanceiroPublicoPage } from './components/FinanceiroPublicoPage';
import { PartidaPublicaPage } from './components/PartidaPublicaPage';
import { linkPublicoDaUrlAtual } from './lib/linkPublico';
import { Button } from './components/ui/button';
import { LogOut, Trophy, User } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPeladaId, setSelectedPeladaId] = useState<number | null>(null);

  const handleNavigate = (page: string, peladaId?: number) => {
    if (page === 'dashboard' || page === 'home' || page === 'peladas-list') {
      setIsAuthenticated(true);
      setCurrentPage('peladas-list');
      setSelectedPeladaId(null);
    } else if (page === 'logout') {
      setIsAuthenticated(false);
      setCurrentPage('login');
      setSelectedPeladaId(null);
    } else {
      if (peladaId !== undefined) {
        setSelectedPeladaId(peladaId);
      }
      setCurrentPage(page);
    }
  };

  // Links compartilhados (dashboard financeiro e partida): abrem sem login, para qualquer pessoa.
  const linkAberto = linkPublicoDaUrlAtual();
  if (linkAberto?.tipo === 'financeiro') {
    return <FinanceiroPublicoPage token={linkAberto.token} />;
  }
  if (linkAberto?.tipo === 'partida') {
    return <PartidaPublicaPage token={linkAberto.token} />;
  }

  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return <RegisterPage onNavigate={handleNavigate} />;
    }
    if (currentPage === 'forgot-password') {
      return <ForgotPasswordPage onNavigate={handleNavigate} />;
    }
    return <LoginPage onNavigate={handleNavigate} />;
  }

  // Pedaços do cabeçalho, montados nas 3 versões (normal / media / mini) logo abaixo.
  function logo(versao: 'normal' | 'media' | 'mini') {
    const mini = versao === 'mini';
    return (
      <button
        className={`flex items-center ${mini ? 'gap-2' : 'gap-3'} min-w-0`}
        onClick={() => handleNavigate('peladas-list')}
      >
        <div className={`${mini ? 'w-9 h-9 rounded-lg' : 'w-12 h-12 rounded-xl'} shrink-0 bg-gradient-brasil flex items-center justify-center shadow-brasil`}>
          <span className={`text-white font-bold ${mini ? 'text-lg' : 'text-2xl'}`}>⚽</span>
        </div>
        <div className="text-left min-w-0">
          <h1 className={`${mini ? 'text-xl' : 'text-2xl'} font-bold bg-gradient-to-r from-verde-brasil to-azul-brasil bg-clip-text text-transparent leading-tight`}>
            4Fut
          </h1>
          {versao === 'normal' && <p className="text-xs text-muted-foreground">Gestão de Peladas Profissional</p>}
          {versao === 'media' && <p className="text-xs text-muted-foreground">Gestão de Peladas</p>}
        </div>
      </button>
    );
  }

  function botaoNav(pagina: string, icone: ReactNode, texto: string, comTexto: boolean) {
    return (
      <Button
        variant={currentPage === pagina ? 'secondary' : 'ghost'}
        size={comTexto ? 'default' : 'icon'}
        onClick={() => handleNavigate(pagina)}
        className="flex items-center gap-2"
        aria-label={texto}
        title={texto}
      >
        {icone}
        {comTexto && texto}
      </Button>
    );
  }

  function botaoSair(comTexto: boolean) {
    return (
      <Button
        variant="outline"
        size={comTexto ? 'default' : 'icon'}
        onClick={() => handleNavigate('logout')}
        className="flex items-center gap-2 border-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
        aria-label="Sair"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
        {comTexto && 'Sair'}
      </Button>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-primary/20 bg-card sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Computador: logo completo e botões com texto */}
          <div className="versao-normal">
            <div className="flex justify-between items-center p-4">
              {logo('normal')}
              <nav className="flex items-center gap-2">
                {botaoNav('peladas-list', <Trophy className="h-4 w-4" />, 'Minhas Peladas', true)}
                {botaoNav('account', <User className="h-4 w-4" />, 'Conta', true)}
                {botaoSair(true)}
              </nav>
            </div>
          </div>

          {/* Tablet: logo sem o subtítulo longo, botões com texto curto */}
          <div className="versao-media">
            <div className="flex justify-between items-center px-4 py-3 gap-2">
              {logo('media')}
              <nav className="flex items-center gap-1">
                {botaoNav('peladas-list', <Trophy className="h-4 w-4" />, 'Peladas', true)}
                {botaoNav('account', <User className="h-4 w-4" />, 'Conta', true)}
                {botaoSair(true)}
              </nav>
            </div>
          </div>

          {/* Celular: logo compacto e só ícones (antes "Conta" sumia no celular) */}
          <div className="versao-mini">
            <div className="flex justify-between items-center px-3 py-2 gap-2">
              {logo('mini')}
              <nav className="flex items-center gap-1">
                {botaoNav('peladas-list', <Trophy className="h-5 w-5" />, 'Minhas Peladas', false)}
                {botaoNav('account', <User className="h-5 w-5" />, 'Conta', false)}
                {botaoSair(false)}
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        <main>
          {currentPage === 'peladas-list' && (
            <PeladasListPage onNavigate={handleNavigate} />
          )}
          {currentPage === 'pelada-detail' && selectedPeladaId && (
            <PeladaDetailPage peladaId={selectedPeladaId} onNavigate={handleNavigate} />
          )}
          {currentPage === 'jogadores' && selectedPeladaId && (
            <JogadoresPage peladaId={selectedPeladaId} onNavigate={handleNavigate} />
          )}
          {currentPage === 'partidas' && selectedPeladaId && (
            <PartidasPage peladaId={selectedPeladaId} onNavigate={handleNavigate} />
          )}
          {currentPage === 'financas' && selectedPeladaId && (
            <FinancasPage peladaId={selectedPeladaId} onNavigate={handleNavigate} />
          )}
          {currentPage === 'ranking' && selectedPeladaId && (
            <RankingPage peladaId={selectedPeladaId} onNavigate={handleNavigate} />
          )}
          {currentPage === 'account' && (
            <AccountPage onNavigate={handleNavigate} />
          )}
        </main>
      </div>
    </div>
  );
}