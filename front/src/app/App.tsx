import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { PeladasListPage } from './components/PeladasListPage';
import { AccountPage } from './components/AccountPage';
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

  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return <RegisterPage onNavigate={handleNavigate} />;
    }
    if (currentPage === 'forgot-password') {
      return <ForgotPasswordPage onNavigate={handleNavigate} />;
    }
    return <LoginPage onNavigate={handleNavigate} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-primary/20 bg-card sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center p-4">
            <button
              className="flex items-center gap-3"
              onClick={() => handleNavigate('peladas-list')}
            >
              <div className="w-12 h-12 bg-gradient-brasil rounded-xl flex items-center justify-center shadow-brasil">
                <span className="text-white font-bold text-2xl">⚽</span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-verde-brasil to-azul-brasil bg-clip-text text-transparent">
                  4Fut
                </h1>
                <p className="text-xs text-muted-foreground">Gestão de Peladas Profissional</p>
              </div>
            </button>
            <nav className="flex items-center gap-2">
              <Button
                variant={currentPage === 'peladas-list' ? 'secondary' : 'ghost'}
                onClick={() => handleNavigate('peladas-list')}
                className="hidden sm:flex items-center gap-2"
              >
                <Trophy className="h-4 w-4" />
                Minhas Peladas
              </Button>
              <Button
                variant={currentPage === 'account' ? 'secondary' : 'ghost'}
                onClick={() => handleNavigate('account')}
                className="hidden sm:flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Conta
              </Button>
              <Button
                variant="outline"
                onClick={() => handleNavigate('logout')}
                className="flex items-center gap-2 border-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <main>
          {currentPage === 'peladas-list' && (
            <PeladasListPage onNavigate={handleNavigate} />
          )}
          {currentPage === 'account' && (
            <AccountPage onNavigate={handleNavigate} />
          )}
        </main>
      </div>
    </div>
  );
}
