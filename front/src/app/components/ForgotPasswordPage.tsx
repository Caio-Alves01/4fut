import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../lib/api";

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

// Etapa atual do fluxo: primeiro pede o e-mail, depois pede o código + nova senha.
type Etapa = "email" | "redefinir";

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEnviarCodigo() {
    setError(null);

    if (!email.trim()) {
      setError("Digite seu e-mail.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess("Código enviado! Confira seu e-mail.");
      setEtapa("redefinir");
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível enviar o código." : "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRedefinirSenha() {
    setError(null);
    setSuccess(null);

    if (codigo.length !== 6) {
      setError("Digite os 6 dígitos do código.");
      return;
    }
    if (!novaSenha) {
      setError("Digite a nova senha.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, code: codigo, newPassword: novaSenha });
      setSuccess("Senha redefinida com sucesso! Faça login com a nova senha.");
      onNavigate("login");
    } catch (err) {
      setError(err instanceof ApiError ? "Código inválido ou expirado." : "Não foi possível conectar ao servidor.");
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
            Recuperar Senha
          </CardTitle>
          {etapa === "email" && (
            <CardDescription className="text-center">
              Digite seu e-mail para receber um código de verificação
            </CardDescription>
          )}
          {etapa === "redefinir" && (
            <CardDescription className="text-center">
              Digite o código recebido em {email} e escolha a nova senha
            </CardDescription>
          )}
        </CardHeader>

        {etapa === "email" && (
          <>
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
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button
                className="w-full bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
                onClick={handleEnviarCodigo}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar Código"}
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                Lembrou a senha?{' '}
                <Button
                  variant="link"
                  onClick={() => onNavigate('login')}
                  className="px-1 text-primary hover:text-verde-escuro font-semibold"
                >
                  Faça login
                </Button>
              </div>
            </CardFooter>
          </>
        )}

        {etapa === "redefinir" && (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Código de 6 dígitos</Label>
                <InputOTP maxLength={6} value={codigo} onChange={setCodigo} containerClassName="justify-center">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  placeholder="••••••••"
                  className="border-2 focus:border-primary"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  placeholder="••••••••"
                  className="border-2 focus:border-primary"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-verde-brasil">{success}</p>}
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button
                className="w-full bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
                onClick={handleRedefinirSenha}
                disabled={loading}
              >
                {loading ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
              <Button
                variant="link"
                onClick={handleEnviarCodigo}
                disabled={loading}
                className="text-primary hover:text-verde-escuro font-semibold"
              >
                Reenviar código
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
