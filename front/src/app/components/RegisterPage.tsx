import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft } from "lucide-react";
import { api, setToken, ApiError } from "../lib/api";

// "12345678909" -> "123.456.789-09", aplicado enquanto o usuário digita.
function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);

    if (!name.trim() || !email.trim() || !password || !birthDate) {
      setError("Preencha todos os campos.");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      setError("Informe um CPF válido.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{ token: string }>("/auth/register", { name, email, password, cpf, birthDate });
      setToken(data.token);
      onNavigate("dashboard");
    } catch (err) {
      // O backend responde com mensagens em texto (e-mail já cadastrado, CPF inválido, verificação recusada...).
      if (err instanceof ApiError) {
        setError(err.message && !err.message.startsWith("{") ? err.message : "Não foi possível criar a conta.");
      } else {
        setError("Não foi possível conectar ao servidor");
      }
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
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              className="border-2 focus:border-primary"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              className="border-2 focus:border-primary"
              max={new Date().toISOString().slice(0, 10)}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usamos CPF e data de nascimento só para confirmar que você tem 18 anos ou mais. O CPF não fica salvo.
            </p>
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
