/**
 * =============================================================
 * 🧩 Script de Correção Segura — Renomeia 'USERS' → 'USUARIOS'
 * Projeto: F/Design Solutions – Painel Administrativo
 * Autor: Vinicius Sabino
 * =============================================================
 *
 * Este script:
 *  ✅ Procura apenas ocorrências de 'USERS' usadas em:
 *      - getSheetByName('USUARIOS')
 *      - const NOME_ABA_USUARIOS = 'USUARIOS'
 *  🚫 NÃO altera:
 *      - nomes de funções (getUserCache, renderUsers)
 *      - variáveis ou objetos
 *
 * Uso:
 *    node renameUsers.js
 */

import fs from "fs";
import path from "path";

const ROOT_DIR = process.cwd();
const EXTENSOES = [".js", ".gs", ".html", ".ts"];
const PADROES_SEGUROS = [
  /getSheetByName\(['"`]USERS['"`]\)/g,
  /const\s+NOME_ABA_USUARIOS\s*=\s*['"`]USERS['"`]/g,
];

// Função recursiva para percorrer o projeto
function scanDir(dir) {
  const arquivos = fs.readdirSync(dir);
  for (const nome of arquivos) {
    const caminho = path.join(dir, nome);
    const stats = fs.statSync(caminho);

    if (stats.isDirectory()) {
      // Ignora node_modules e .git
      if (nome === "node_modules" || nome === ".git") continue;
      scanDir(caminho);
    } else if (EXTENSOES.includes(path.extname(nome))) {
      processarArquivo(caminho);
    }
  }
}

function processarArquivo(caminho) {
  let conteudo = fs.readFileSync(caminho, "utf8");
  let conteudoOriginal = conteudo;

  PADROES_SEGUROS.forEach((regex) => {
    conteudo = conteudo.replace(regex, (match) => {
      if (match.includes("getSheetByName"))
        return match.replace("USERS", "USUARIOS");
      if (match.includes("NOME_ABA_USUARIOS"))
        return match.replace("USERS", "USUARIOS");
      return match;
    });
  });

  if (conteudo !== conteudoOriginal) {
    fs.writeFileSync(caminho, conteudo, "utf8");
    console.log(`✅ Corrigido: ${caminho}`);
  }
}

// Execução principal
console.log("🔍 Iniciando varredura de arquivos...");
scanDir(ROOT_DIR);
console.log("✨ Concluído! Todas as ocorrências seguras de 'USERS' foram renomeadas para 'USUARIOS'.");
