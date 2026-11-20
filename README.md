# 4Fut — Gestão de Peladas

Sistema web para organizar peladas de futebol amador: jogadores, partidas, presença, escalação, lances, ranking e finanças, com links públicos para os jogadores acompanharem sem precisar de conta.

Projeto de Inovação Tecnológica (PIT) — Faculdade Cotemig.
Autores: Caio Almeida Alves e Samuel Francis da Rocha Alves.

## Funcionalidades

- Cadastro com verificação de idade mínima (18 anos) pelo CPF; login com JWT; recuperação de senha por código enviado por e-mail.
- Peladas e jogadores (com apelido, posição, tipo mensalista/avulso e status).
- Partidas: presença, montador de escalação (arrastar ou tocar), sorteio equilibrado, prioridade por presença e mensalidade, gols, assistências, cartões, substituições e árbitros.
- Finanças: lançamentos, mensalidades, cobrança automática de avulsos e multas, "a receber" e dashboard.
- Ranking de artilheiros, assistências e cartões.
- Links públicos de partida e de financeiro.
- Exclusão lógica de peladas e partidas (somem para o usuário, mas ficam no banco para auditoria).
- Layout para computador, tablet e celular.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Front-end | React 18 + TypeScript, Vite, Tailwind CSS, Radix UI (shadcn/ui), React DnD, Recharts |
| Back-end | ASP.NET Core 8 (C#), Entity Framework Core 8 + Pomelo MySQL, JWT, BCrypt |
| Banco de dados | MySQL 8.4 |
| Infraestrutura | Docker, Docker Compose, Nginx |
| Integrações | CPFHub.io (verificação de CPF), SMTP (e-mail) |

## Estrutura do repositório

```
4fut/
├── docker-compose.yml     # sobe banco, API e front juntos
├── .env.example           # modelo das variáveis de ambiente (copiar para .env)
├── back/
│   ├── Dockerfile
│   ├── Backend.sln
│   └── Backend/           # API ASP.NET Core
│       ├── Controllers/   # rotas da API
│       ├── Services/      # regras de negócio (estatísticas, financeiro, token, CPF, e-mail)
│       ├── Models/        # entidades do banco
│       ├── DTOs/          # formatos de entrada e saída da API
│       ├── Data/          # AppDbContext (Entity Framework)
│       └── Migrations/    # migrações do banco
└── front/
    ├── Dockerfile
    ├── nginx.conf         # serve o front e repassa /api para a API
    └── src/app/           # telas e componentes React
```

---

## Opção 1 — Rodar com Docker (recomendado)

É o jeito usado no servidor e o mais simples para rodar tudo de uma vez. Não precisa instalar .NET, Node nem MySQL: só o Docker.

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) com Docker Compose (no Windows, o Docker Desktop já traz os dois).
- Git.

### Passo a passo

1. Clone o repositório:

   ```bash
   git clone https://github.com/Caio-Alves01/4fut.git
   cd 4fut
   ```

2. Crie o arquivo `.env` a partir do modelo:

   ```bash
   cp .env.example .env
   ```

   No Windows (CMD): `copy .env.example .env`

3. Abra o `.env` e preencha as variáveis (veja a tabela [Variáveis de ambiente](#variáveis-de-ambiente)). Para gerar senhas e chaves aleatórias:

   ```bash
   openssl rand -base64 48 | tr -d '/+='
   ```

4. Suba os containers:

   ```bash
   docker compose up -d --build
   ```

   Na primeira vez demora alguns minutos (baixa as imagens e compila front e back). A API cria as tabelas do banco sozinha ao iniciar.

5. Acesse **http://localhost** (no servidor, `http://IP-DO-SERVIDOR`).

### Containers

| Serviço | O que é | Porta |
| --- | --- | --- |
| `db` | MySQL 8.4, dados no volume `db_data` | não exposta |
| `api` | API ASP.NET Core | não exposta (só o `web` acessa) |
| `web` | Nginx com o front compilado; repassa `/api` para a API | **80** |

### Comandos úteis

```bash
docker compose ps                  # situação dos containers
docker compose logs -f api         # logs da API (Ctrl+C para sair)
docker compose restart api         # reinicia só a API
docker compose down                # para tudo (os dados do banco continuam)
```

> **Cuidado:** `docker compose down -v` apaga o volume `db_data`, ou seja, **apaga o banco de dados**. Não use em produção.

---

## Opção 2 — Desenvolvimento sem Docker

Para programar com recarregamento automático e depurar no Visual Studio.

### Pré-requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (ou Visual Studio 2022 com o workload "ASP.NET and web development").
- [Node.js 22](https://nodejs.org/) (ou 20+).
- MySQL 8 rodando na máquina. Se tiver Docker, dá para subir só o banco com:

  ```bash
  docker run -d --name fut4-mysql -p 3306:3306 \
    -e MYSQL_DATABASE=fut4 -e MYSQL_USER=fut4 -e MYSQL_PASSWORD=fut4dev \
    -e MYSQL_ROOT_PASSWORD=rootdev mysql:8.4
  ```

### Back-end

1. Crie o arquivo `back/Backend/appsettings.Development.json` (ele está no `.gitignore` e **não** deve ir para o GitHub):

   ```json
   {
     "ConnectionStrings": {
       "Default": "Server=localhost;Port=3306;Database=fut4;User=fut4;Password=fut4dev;"
     },
     "Jwt": {
       "Key": "uma-chave-de-desenvolvimento-com-pelo-menos-32-caracteres"
     },
     "CpfVerification": {
       "ApiKey": ""
     }
   }
   ```

   - Sem `CpfVerification:ApiKey`, o cadastro aprova só pela data de nascimento informada.
   - Sem `CpfVerification:HashKey`, em desenvolvimento é usada uma chave fixa de teste (em produção ela é obrigatória).
   - Sem SMTP configurado, os e-mails (ex.: código de recuperação de senha) são gravados em `back/Backend/emails-dev/` e mostrados no console.

2. Rode a API:
   - **Visual Studio:** abra `back/Backend.sln`, escolha o perfil **https** e aperte F5.
   - **Terminal:**

     ```bash
     cd back/Backend
     dotnet run --launch-profile https
     ```

   A API sobe em `https://localhost:7156` e aplica as migrations. A documentação das rotas (Swagger) fica em `https://localhost:7156/swagger`.

### Front-end

1. Crie o `front/.env` a partir do modelo (o padrão já aponta para `https://localhost:7156`):

   ```bash
   cd front
   cp .env.example .env
   ```

2. Instale as dependências e rode:

   ```bash
   npm install
   npm run dev
   ```

3. Acesse **http://localhost:5173**. O Vite repassa as chamadas `/api` para o back-end.

---

## Variáveis de ambiente

Usadas pelo `docker-compose.yml` (arquivo `.env` na raiz). No desenvolvimento sem Docker, os mesmos valores vão no `appsettings.Development.json`.

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `DB_PASSWORD` | Sim | Senha do usuário `fut4` do MySQL |
| `DB_ROOT_PASSWORD` | Sim | Senha do root do MySQL |
| `JWT_KEY` | Sim | Chave que assina os tokens de login (mínimo 32 caracteres) |
| `CPF_HASH_KEY` | Sim | Chave do hash do CPF. **Não mude depois que houver usuários**, senão os CPFs já cadastrados deixam de ser reconhecidos |
| `CPF_BASE_URL` | Não | Endereço da API de CPF (padrão `https://api.cpfhub.io`) |
| `CPF_API_KEY` | Não | Chave da [CPFHub.io](https://app.cpfhub.io). Sem ela, a idade é conferida só pela data informada |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Não | Servidor de e-mail, necessário para a recuperação de senha em produção |

Depois de alterar o `.env`, aplique com `docker compose up -d`.

---

## Publicar e atualizar no servidor (VPS)

### Primeira vez

```bash
git clone https://github.com/Caio-Alves01/4fut.git ~/apps/4fut
cd ~/apps/4fut
cp .env.example .env
nano .env                         # preencher as variáveis
docker compose up -d --build
```

### Atualizar para a versão mais nova

```bash
cd ~/apps/4fut && git pull && docker compose up -d --build
```

Os dados do banco e o `.env` não são afetados. As migrations novas são aplicadas sozinhas quando a API reinicia.

> Se o `git pull` disser *"There is no tracking information for the current branch"*, rode uma vez:
> `git branch --set-upstream-to=origin/main main`

### Backup do banco

```bash
docker compose exec db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" fut4' > backup-$(date +%F).sql
```

---

## Banco de dados e migrations

- As migrations ficam em `back/Backend/Migrations` e são aplicadas automaticamente na inicialização da API.
- Para criar uma migration nova depois de alterar um Model:

  ```bash
  dotnet tool install --global dotnet-ef   # só na primeira vez
  cd back/Backend
  dotnet ef migrations add NomeDaMudanca
  ```

- Peladas e partidas excluídas não são apagadas: ficam com `DeletedAt` preenchido. Para consultar ou restaurar:

  ```sql
  SELECT Id, Name, DeletedAt FROM Peladas WHERE DeletedAt IS NOT NULL;
  UPDATE Partidas SET DeletedAt = NULL, DeletedByUserId = NULL WHERE Id = 5;
  ```

---

## Problemas comuns

| Sintoma | Causa provável e solução |
| --- | --- |
| Porta 80 já em uso ao subir o Docker | Outro programa (IIS, Apache, Skype) usa a porta. Pare o programa ou troque `"80:80"` por `"8080:80"` no `docker-compose.yml` e acesse `http://localhost:8080` |
| API reinicia sem parar (`docker compose ps`) | Veja `docker compose logs api`. Geralmente falta uma variável obrigatória no `.env` (por exemplo `CPF_HASH_KEY`) ou o banco ainda não terminou de subir |
| Front em dev mostra erro de conexão | A API não está rodando ou o `front/.env` aponta para outra porta. Confira `VITE_BACKEND_URL` |
| Navegador avisa de certificado em `https://localhost:7156` | Rode `dotnet dev-certs https --trust` uma vez |
| Cadastro sempre recusado | Confira se a data de nascimento bate com a do CPF; sem `CPF_API_KEY`, vale só a data informada (18+) |
