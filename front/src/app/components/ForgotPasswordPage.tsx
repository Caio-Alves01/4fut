import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft } from "lucide-react";

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
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
          <CardDescription className="text-center">
            Digite seu e-mail para receber as instruções
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
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            className="w-full bg-primary hover:bg-verde-escuro transition-colors shadow-brasil" 
            onClick={() => onNavigate('login')}
          >
            Enviar Instruções
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
      </Card>
    </div>
  );
}
