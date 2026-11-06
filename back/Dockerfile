# Etapa 1: compila a API com o SDK do .NET 8
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Backend/Backend.csproj Backend/
RUN dotnet restore Backend/Backend.csproj
COPY Backend/ Backend/
RUN dotnet publish Backend/Backend.csproj -c Release -o /app --no-restore

# Etapa 2: imagem final só com o runtime (bem menor)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Backend.dll"]
