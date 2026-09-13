import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft } from "lucide-react";
import { api, setToken, ApiError } from "../lib/api";

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{ token: string }>("/auth/register", { name, email, password });
      setToken(data.token);
      onNavigate("dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível criar a conta (e-mail já cadastrado?)" : "Não foi possível conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="space-y-2">
          <Button 
            variant="ghost" 
            onClick={() => onNavigate('login')}
            className="w-fit -ml-2 mb-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-brasil rounded-2xl flex items-center justify-center shadow-brasil">
              <span className="text-white font-bold text-3xl">⚽</span>
            </div>
          </div>
          <CardTitle className="text-3xl text-center bg-gradient-to-r from-verde-brasil to-azul-brasil bg-clip-text text-transparent">
            Criar Conta
          </CardTitle>
          <CardDescription className="text-center">
            Cadastre-se para começar a gerenciar suas peladas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              className="border-2 focus:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="border-2 focus:border-primary"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button
            className="w-full bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            Já tem uma conta?{' '}
            <Button
              variant="link"
              onClick={() => onNavigate('login')}
              className="px-1 text-primary hover:text-verde-escuro font-semibold"
            >
              Faça login
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
