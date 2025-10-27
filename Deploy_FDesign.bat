@echo off
:: =============================================================
:: 🚀 F/Design Solutions - Deploy Automático via CLASP
:: Autor: Vinicius Sabino
:: Versão: 2.0 (Atualizado em 18/10/2025)
:: =============================================================

:: === CONFIGURAÇÕES ===
set "PASTA_PROJETO=C:\Users\vinic\OneDrive\Desktop\FDesignSolutions"
set "SCRIPT_ID=1ERlOpeJCiaR-yyUS2e4du-baw281CGAh0i99cHuNjJ5Cl-Xrc_M0MsG7"
set "NOME_BACKUP=Backup_%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%.zip"
set "ARQUIVO_CLASP=%PASTA_PROJETO%\.clasp.json"

:: === CABEÇALHO ===
title Deploy Automático - F/Design Solutions
color 0B
echo.
echo =============================================================
echo 🧩 F/Design Solutions - Deploy Automático via CLASP
echo =============================================================
echo.

:: === VERIFICAÇÃO DE PASTA ===
if not exist "%PASTA_PROJETO%" (
    color 0C
    echo ❌ Erro: Pasta do projeto não encontrada!
    echo Caminho configurado: %PASTA_PROJETO%
    pause
    exit /b
)

cd /d "%PASTA_PROJETO%"
echo 📂 Diretório atual: %cd%
echo.

:: === BACKUP AUTOMÁTICO ===
echo 💾 Criando backup automático...
powershell -Command "Compress-Archive -Path '%PASTA_PROJETO%\*' -DestinationPath '%PASTA_PROJETO%\%NOME_BACKUP%' -Force"
echo ✅ Backup criado: %NOME_BACKUP%
echo.

:: === VERIFICA ARQUIVO .CLASP.JSON ===
if not exist "%ARQUIVO_CLASP%" (
    echo ⚙️ Criando novo arquivo .clasp.json...
    echo { > "%ARQUIVO_CLASP%"
    echo   "scriptId": "%SCRIPT_ID%", >> "%ARQUIVO_CLASP%"
    echo   "rootDir": "./" >> "%ARQUIVO_CLASP%"
    echo } >> "%ARQUIVO_CLASP%"
)

:: === STATUS ===
echo 🔍 Verificando status do CLASP...
clasp status
echo.

:: === DEPLOY ===
echo 🚀 Enviando arquivos para o Google Apps Script...
clasp push --force

if %errorlevel% neq 0 (
    color 0C
    echo ❌ Erro durante o deploy!
    pause
    exit /b
)

:: === ABRIR PROJETO ONLINE ===
echo 🌐 Abrindo projeto online...
start https://script.google.com/d/1ERlOpeJCiaR-yyUS2e4du-baw281CGAh0i99cHuNjJ5Cl-Xrc_M0MsG7/edit
echo.

:: === FINALIZAÇÃO ===
color 0A
echo =============================================================
echo ✅ Deploy concluído com sucesso!
echo 🧠 Projeto F/Design Solutions atualizado no Google Apps Script.
echo =============================================================
pause
