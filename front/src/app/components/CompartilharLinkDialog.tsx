import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Link2Off, RefreshCw, Share2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { linkPublico, TipoLinkPublico } from '../lib/linkPublico';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface CompartilharLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Endpoint do back que lê (GET), gera (POST) e desativa (DELETE) o link. */
  endpoint: string;
  tipo: TipoLinkPublico;
  titulo: string;
  /** O que quem recebe o link consegue (e não consegue) ver. */
  descricao: string;
}

function mensagemDeErro(err: unknown, padrao: string): string {
  if (!(err instanceof ApiError)) return 'Não foi possível conectar ao servidor.';
  return err.status === 400 && err.message && !err.message.startsWith('{') ? err.message : padrao;
}

// Diálogo de compartilhar por link público: gerar, copiar, abrir, trocar e desativar o link.
export function CompartilharLinkDialog({ open, onOpenChange, endpoint, tipo, titulo, descricao }: CompartilharLinkDialogProps) {
  // undefined = ainda carregando o estado do link; null = não compartilhado
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmarTroca, setConfirmarTroca] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToken(undefined);
    setErro(null);
    setCopiado(false);
    setConfirmarTroca(false);
    api.get<{ token: string | null }>(endpoint)
      .then((resposta) => setToken(resposta.token))
      .catch((err) => setErro(mensagemDeErro(err, 'Não foi possível carregar o link de compartilhamento.')));
  }, [open, endpoint]);

  const link = token ? linkPublico(tipo, token) : '';

  // Gera o link; se já existia, o novo substitui o antigo (que deixa de funcionar).
  async function gerar() {
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await api.post<{ token: string | null }>(endpoint);
      setToken(resposta.token);
      setCopiado(false);
      setConfirmarTroca(false);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível gerar o link.'));
    } finally {
      setSalvando(false);
    }
  }

  async function desativar() {
    setSalvando(true);
    setErro(null);
    try {
      await api.delete(endpoint);
      setToken(null);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível desativar o link.'));
    } finally {
      setSalvando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setErro('Não foi possível copiar automaticamente. Selecione o link e copie manualmente.');
    }
  }

  // No celular abre o menu de compartilhar do aparelho (WhatsApp, etc.).
  const podeCompartilharNativo = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  async function compartilharNativo() {
    try {
      await navigator.share({ title: titulo, url: link });
    } catch {
      // Usuário fechou o menu: nada a fazer.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(aberto) => { if (!salvando) onOpenChange(aberto); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {titulo}
          </DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {token === undefined && !erro && <p className="text-sm text-muted-foreground">Carregando...</p>}

          {token === null && <p className="text-sm text-muted-foreground">Ainda não há link de compartilhamento.</p>}

          {token && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`link-${tipo}`}>Link público</Label>
                <div className="flex gap-2">
                  <Input id={`link-${tipo}`} readOnly value={link} onFocus={(e) => e.target.select()} />
                  <Button onClick={copiar} className="shrink-0">
                    {copiado ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {podeCompartilharNativo && (
                  <Button variant="outline" size="sm" onClick={compartilharNativo}>
                    <Share2 className="h-4 w-4 mr-2" /> Enviar
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir
                  </a>
                </Button>
              </div>

              {confirmarTroca ? (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
                  <p className="text-sm text-orange-900">
                    O link atual vai parar de funcionar para todo mundo que já o recebeu. Gerar um novo?
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmarTroca(false)} disabled={salvando}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={gerar} disabled={salvando}>
                      {salvando ? 'Gerando...' : 'Gerar novo link'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmarTroca(true)} disabled={salvando}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Gerar novo link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={desativar}
                    disabled={salvando}
                  >
                    <Link2Off className="h-4 w-4 mr-2" /> Desativar link
                  </Button>
                </div>
              )}
            </>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-2" onClick={() => onOpenChange(false)} disabled={salvando}>
            Fechar
          </Button>
          {token === null && (
            <Button onClick={gerar} disabled={salvando} className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil">
              <Link2 className="h-4 w-4 mr-2" />
              {salvando ? 'Gerando...' : 'Gerar link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
