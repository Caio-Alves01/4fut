import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, ShieldCheck, Trash2, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export type FuncaoArbitro = 'principal' | 'assistente' | 'quarto';

// Juiz da partida como o back guarda (GET detalhes / PUT arbitros).
export interface Arbitro {
  nome: string;
  funcao: FuncaoArbitro;
}

// Mesmo limite do back (PartidasController.MaxArbitros).
const MAX_ARBITROS = 6;

const FUNCOES: { valor: FuncaoArbitro; nome: string; classes: string }[] = [
  { valor: 'principal', nome: 'Juiz principal', classes: 'bg-gray-900 text-white hover:bg-gray-900' },
  { valor: 'assistente', nome: 'Assistente (bandeira)', classes: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
  { valor: 'quarto', nome: 'Quarto árbitro', classes: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
];

function funcaoInfo(funcao: FuncaoArbitro) {
  return FUNCOES.find((f) => f.valor === funcao) ?? FUNCOES[0];
}

interface ArbitrosPartidaProps {
  arbitros: Arbitro[];
  /** Salva a lista inteira no back. Devolve true se deu certo. */
  onSalvar: (arbitros: Arbitro[]) => Promise<boolean>;
}

// Área da escalação para registrar quem apitou a partida. Cada mudança já é salva no back.
export function ArbitrosPartida({ arbitros, onSalvar }: ArbitrosPartidaProps) {
  const temPrincipal = arbitros.some((a) => a.funcao === 'principal');
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState<FuncaoArbitro>(temPrincipal ? 'assistente' : 'principal');
  const [salvando, setSalvando] = useState(false);

  const lotado = arbitros.length >= MAX_ARBITROS;

  async function salvar(lista: Arbitro[]) {
    setSalvando(true);
    const ok = await onSalvar(lista);
    setSalvando(false);
    return ok;
  }

  async function adicionar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo || lotado) return;

    const ok = await salvar([...arbitros, { nome: nomeLimpo, funcao }]);
    if (ok) {
      setNome('');
      // Depois do principal, o próximo normalmente é assistente.
      if (funcao === 'principal') setFuncao('assistente');
    }
  }

  async function remover(index: number) {
    const ok = await salvar(arbitros.filter((_, i) => i !== index));
    if (ok && arbitros[index].funcao === 'principal') setFuncao('principal');
  }

  const funcaoInvalida = funcao === 'principal' && temPrincipal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Arbitragem
            <Badge variant="secondary">{arbitros.length}/{MAX_ARBITROS}</Badge>
          </span>
          {salvando && (
            <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="arbitroNome">Nome do juiz</Label>
            <Input
              id="arbitroNome"
              placeholder="Ex: Carlos Silva"
              maxLength={100}
              value={nome}
              disabled={lotado}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }}
            />
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Select value={funcao} onValueChange={(valor: FuncaoArbitro) => setFuncao(valor)} disabled={lotado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNCOES.map((f) => (
                  <SelectItem key={f.valor} value={f.valor} disabled={f.valor === 'principal' && temPrincipal}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-primary hover:bg-verde-escuro transition-colors shadow-brasil"
            disabled={salvando || lotado || !nome.trim() || funcaoInvalida}
            onClick={adicionar}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          {arbitros.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum juiz registrado para esta partida.
            </p>
          )}
          {arbitros.map((arbitro, index) => {
            const info = funcaoInfo(arbitro.funcao);
            return (
              <div key={`${arbitro.funcao}-${arbitro.nome}-${index}`} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <Badge className={info.classes}>{info.nome}</Badge>
                  <span className="font-medium truncate">{arbitro.nome}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  aria-label={`Remover ${arbitro.nome}`}
                  disabled={salvando}
                  onClick={() => remover(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
