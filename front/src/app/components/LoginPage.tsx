import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { api, setToken, ApiError } from "../lib/api";

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<{ token: string }>("/auth/login", { email, password });
      setToken(data.token);
      onNavigate("dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? "E-mail ou senha inválidos" : "Não foi possível conectar ao servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-brasil rounded-2xl flex items-center justify-center shadow-brasil">
              <span className="text-white font-bold text-4xl">⚽</span>
            </div>
          </div>
          <CardTitle className="text-3xl text-center bg-gradient-to-r from-verde-brasil to-azul-brasil bg-clip-text text-transparent">
            443 Fut
          </CardTitle>
          <CardDescription className="text-center">
            Entre para gerenciar suas peladas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className="border-2 focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="border-2 focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button
            className="w-full bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <Button 
            variant="outline" 
            className="w-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white transition-colors"
            onClick={() => onNavigate('register')}
          >
            Cadastrar-se
          </Button>
          <button 
            className="text-sm text-muted-foreground hover:text-secondary underline transition-colors"
            onClick={() => onNavigate('forgot-password')}
          >
            Esqueci minha senha
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
