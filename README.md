# 443 Fut

Projeto de Inovação Tecnológica — gestão de peladas.

Monorepo: front-end (React + Vite) e back-end (ASP.NET Core / C#).

- `front/` — React + Vite. Ver `front/README.md` e `front/BACKEND_SETUP.md`.
- `back/` — ASP.NET Core Web API (.NET 8). Abrir `back/Backend.sln` no Visual Studio.

## Rodar local

**Back-end**: copie de `back/Backend/appsettings.json` os valores reais de `ConnectionStrings.Default` e `Jwt.Key` para `back/Backend/appsettings.Development.json` (não versionado) e rode com F5 no Visual Studio.

**Front-end**:
```
cd front
npm install
npm run dev
```
Ajuste `front/.env` (`VITE_BACKEND_URL`) para a porta HTTPS que o backend usa.
