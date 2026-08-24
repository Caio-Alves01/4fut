# Backend em C# — Tutorial de Setup (Visual Studio)

Este projeto (4Fut) já está preparado no lado do front para conectar num backend em C# (.NET): proxy do Vite (`/api` → backend) e um client fetch em `src/app/lib/api.ts` (com token salvo em `localStorage`). Falta só existir o backend. Este guia explica como criá-lo com Visual Studio.

## 0. Já pronto no front-end

- `vite.config.ts`: proxy `/api` → `VITE_BACKEND_URL` (padrão `http://localhost:5000`)
- `.env` / `.env.example`: variável `VITE_BACKEND_URL`
- `src/app/lib/api.ts`: `api.get/post/put/delete`, injeta `Authorization: Bearer <token>`, `ApiError` para tratar status HTTP
- `LoginPage.tsx`: exemplo funcional chamando `POST /api/auth/login`

Ajuste `VITE_BACKEND_URL` no `.env` caso a porta do backend seja diferente de 5000. As outras páginas (Peladas, Jogadores, Partidas, etc.) ainda usam dados mockados — ligar cada uma no backend é o próximo passo, seguindo o mesmo padrão de `LoginPage.tsx`.

## 1. Instalar as ferramentas

- **Visual Studio 2022** (Community é suficiente): https://visualstudio.microsoft.com/downloads/
- No instalador, marque o workload **"ASP.NET and web development"**. Isso já traz o .NET SDK junto.

Confirme depois de instalado, no terminal:

```
dotnet --version
```

## 2. Criar o projeto Web API

No Visual Studio:

1. **File → New → Project**
2. Escolha o template **ASP.NET Core Web API**
3. Nome do projeto: `FutBackend`
4. Local: fora da pasta do front-end (ex.: `D:\Programas\4Fut_backend`)
5. Framework: **.NET 8.0 (LTS)**
6. Deixe **"Use controllers"** marcado (não use apenas minimal API se quiser estrutura com Controllers)
7. Configuração HTTPS: pode deixar marcado
8. Clique em **Create**

Para rodar: aperte **F5** (ou o botão ▶ verde) no Visual Studio. Ele abre o Swagger automaticamente no navegador.

A porta fica definida em `Properties/launchSettings.json`, algo como `https://localhost:7xxx` e `http://localhost:5xxx`.

## 3. Liberar CORS para o front-end (porta 5173)

Abra `Program.cs`, antes de `var app = builder.Build();`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});
```

Depois de `var app = builder.Build();`:

```csharp
app.UseCors("AllowFrontend");
```

Sem isso, o navegador bloqueia qualquer chamada do front para o backend C#.

## 4. Conectar a partir do front (Vite/React)

Chamada direta via `fetch`, usando a porta HTTP que aparece no Visual Studio ao rodar (F5):

```ts
fetch("http://localhost:5000/api/weatherforecast")
  .then(r => r.json())
  .then(console.log);
```

Alternativa mais limpa — proxy no `vite.config.ts` (evita hardcode de URL/porta no código do front):

```ts
server: {
  proxy: {
    '/api': 'http://localhost:5000',
  },
},
```

Com o proxy configurado, o front chama apenas `fetch("/api/...")`.

## 5. Rodar os dois juntos

**Backend**: aperte F5 no Visual Studio (deixa rodando, ele já abre o Swagger).

**Frontend** (terminal):

```
npm run dev
```
