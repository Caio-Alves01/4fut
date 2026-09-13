import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Mail, Calendar, ArrowLeft } from "lucide-react";
import { api, ApiError } from "../lib/api";

interface AccountPageProps {
  onNavigate: (page: string) => void;
}

interface Profile {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export function AccountPage({ onNavigate }: AccountPageProps) {
  const [notificacoesEmail, setNotificacoesEmail] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Profile>("/auth/me")
      .then((data) => {
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
      })
      .catch(() => setError("Não foi possível carregar seus dados."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const data = await api.put<Profile>("/auth/me", { name, email });
      setProfile(data);
      setSuccess("Dados salvos com sucesso.");
    } catch (err) {
      setError(err instanceof ApiError ? "Não foi possível salvar (e-mail já em uso?)" : "Não foi possível conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  // Pega a primeira letra do primeiro e do segundo nome (ex: "João Silva" -> "JS")
  function getInitials(fullName: string): string {
    const nomeSemEspacosExtras = fullName.trim();
    if (nomeSemEspacosExtras === "") {
      return "?";
    }

    const partesDoNome = nomeSemEspacosExtras.split(/\s+/);
    let resultado = "";
    for (let i = 0; i < partesDoNome.length && i < 2; i++) {
      const primeiraLetra = partesDoNome[i][0];
      if (primeiraLetra) {
        resultado += primeiraLetra.toUpperCase();
      }
    }
    return resultado || "?";
  }

  const initials = getInitials(name);

  if (loading) {
    return <p className="text-muted-foreground">Carregando conta...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => onNavigate('peladas-list')}
          className="flex items-center gap-2 border-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <h1>Minha Conta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h3>{profile?.name}</h3>
                <Badge variant="secondary">Organizador</Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email}</span>
              </div>
              {profile?.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Membro desde {new Date(profile.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Editar Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            {success && <p className="text-sm text-verde-brasil mt-2">{success}</p>}
            <Button className="mt-4" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4>Notificações por Email</h4>
              <p className="text-muted-foreground">Receba atualizações sobre suas peladas e partidas</p>
            </div>
            <Switch checked={notificacoesEmail} onCheckedChange={setNotificacoesEmail} />
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
              <h4>Privacidade</h4>
              <p className="text-muted-foreground">Gerenciar visibilidade do perfil</p>
            </div>
            <Button variant="outline" size="sm">Configurar</Button>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
              <h4>Excluir Conta</h4>
              <p className="text-muted-foreground">Remover permanentemente sua conta</p>
            </div>
            <Button variant="destructive" size="sm">Excluir</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
