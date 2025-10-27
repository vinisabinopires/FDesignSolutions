// ==========================================================
// 🌐 RENDERIZAÇÃO DE PÁGINAS (F/Design Nexus Flow)
// ==========================================================

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('homeFDesign')
    .setTitle('F/Design Nexus — Gateway')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ✅ Função central de abertura de páginas internas
function abrirPaginaSistema(pagina) {
  try {
    if (!pagina) throw new Error("Página não especificada.");
    const html = HtmlService.createHtmlOutputFromFile(pagina)
      .setTitle('F/Design Solutions — ' + pagina)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return html.getContent();
  } catch (err) {
    Logger.log("Erro ao abrir página: " + err);
    return HtmlService.createHtmlOutput(
      "<h2 style='color:red;text-align:center;margin-top:40px;'>Erro ao carregar página</h2>"
    ).getContent();
  }
}

// ✅ Função de redirecionamento por tipo de usuário (Admin / Supervisor / Vendedor)
function abrirHomePorTipo(tipoUsuario) {
  try {
    if (!tipoUsuario) throw new Error("Tipo de usuário não especificado.");

    let pagina;
    switch (tipoUsuario.toUpperCase()) {
      case 'ADMIN':
        pagina = 'painelAdmin';
        break;
      case 'SUPERVISOR':
        pagina = 'dashboardVendas';
        break;
      case 'VENDEDOR':
      default:
        pagina = 'homeVendedor';
        break;
    }

    const html = HtmlService.createHtmlOutputFromFile(pagina)
      .setTitle('F/Design Solutions — ' + pagina)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return html.getContent();

  } catch (err) {
    Logger.log("Erro ao redirecionar por tipo: " + err);
    return HtmlService.createHtmlOutput(
      "<h2 style='color:red;text-align:center;margin-top:40px;'>Erro ao abrir painel</h2>"
    ).getContent();
  }
}

// ==========================================================
// 🔍 NEXUS SEARCH — BUSCA UNIFICADA (Vendas + Orçamentos)
// ==========================================================
function buscarNexus(query) {
  query = query ? query.toString().toLowerCase().trim() : "";
  if (!query) return [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaVendas = ss.getSheetByName("Client_List");
  const abaOrcamentos = ss.getSheetByName("ORÇAMENTOS");

  const dadosVendas = abaVendas.getDataRange().getValues();
  const dadosOrc = abaOrcamentos.getDataRange().getValues();

  // Cabeçalhos para mapear colunas
  const headerVendas = dadosVendas[0].map(h => h.toString().toLowerCase());
  const headerOrc = dadosOrc[0].map(h => h.toString().toLowerCase());

  const resultados = [];

  // ======================================================
  // 🧾 BUSCA NAS VENDAS
  // ======================================================
  for (let i = 1; i < dadosVendas.length; i++) {
    const linha = dadosVendas[i];
    const cliente = (linha[headerVendas.indexOf("cliente")] || "").toString().toLowerCase();
    const telefone = (linha[headerVendas.indexOf("telefone")] || "").toString().toLowerCase();
    const email = (linha[headerVendas.indexOf("email")] || "").toString().toLowerCase();
    const produto = (linha[headerVendas.indexOf("produto")] || "").toString().toLowerCase();
    const id = (linha[headerVendas.indexOf("id")] || "").toString();

    if ([cliente, telefone, email, produto].some(campo => campo.includes(query))) {
      resultados.push({
        id,
        nomeCliente: linha[headerVendas.indexOf("cliente")] || "",
        telefone: linha[headerVendas.indexOf("telefone")] || "",
        email: linha[headerVendas.indexOf("email")] || "",
        produto: linha[headerVendas.indexOf("produto")] || "",
        tipo: "Venda"
      });
    }
  }

  // ======================================================
  // 💬 BUSCA NOS ORÇAMENTOS
  // ======================================================
  for (let i = 1; i < dadosOrc.length; i++) {
    const linha = dadosOrc[i];
    const cliente = (linha[headerOrc.indexOf("cliente")] || "").toString().toLowerCase();
    const telefone = (linha[headerOrc.indexOf("telefone")] || "").toString().toLowerCase();
    const email = (linha[headerOrc.indexOf("email")] || "").toString().toLowerCase();
    const produto = (linha[headerOrc.indexOf("produto")] || "").toString().toLowerCase();
    const id = (linha[headerOrc.indexOf("id")] || "").toString();

    if ([cliente, telefone, email, produto].some(campo => campo.includes(query))) {
      resultados.push({
        id,
        nomeCliente: linha[headerOrc.indexOf("cliente")] || "",
        telefone: linha[headerOrc.indexOf("telefone")] || "",
        email: linha[headerOrc.indexOf("email")] || "",
        produto: linha[headerOrc.indexOf("produto")] || "",
        tipo: "Orçamento"
      });
    }
  }

  // ======================================================
  // 🔁 ORDENAÇÃO E RETORNO
  // ======================================================
  resultados.sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente));
  return resultados.slice(0, 50); // retorna até 50 resultados
}

// ==========================================================
// 👤 AUTENTICAÇÃO E FLUXO DE LOGIN
// ==========================================================

function validarLogin(email, pin) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USUARIOS');
  const dados = sh.getDataRange().getValues();

  let user = null;
  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    if (linha[3] === email && String(linha[5]) === String(pin)) {
      user = linha;
      break;
    }
  }

  if (user) {
    // ✅ salva dados básicos do usuário na cache (1h)
    const userData = {
      nome: user[1],
      tipo: user[2],
      email: user[3]
    };
    CacheService.getUserCache().put('usuarioAtual', JSON.stringify(userData), 3600);
    return { status: 'ok', tipo: user[2], nome: user[1] };
  } else {
    return { status: 'erro', msg: 'Credenciais inválidas.' };
  }
}

// ===============================================================
// SISTEMA DE REGISTRO E GERENCIAMENTO DE VENDAS
// F/Design Solutions – Newark, NJ
//
// ARQUIVO PRINCIPAL: Backend completo e unificado
// VERSÃO 2.0 - ANALYTICAL ARCHITECTURE
// Contém: Autenticação, Sessão, CRUD, Analytics Engine
// ===============================================================

// ===============================================================
// CONSTANTES GLOBAIS (Centralizadas)
// ===============================================================

const NOME_ABA_USUARIOS = 'USUARIOS';
const NOME_ABA_VENDAS = 'Client_List';
const NOME_ABA_ORCAMENTOS = 'ORÇAMENTOS'; // Primária
const NOME_ABA_ORCAMENTOS_FALLBACK = 'TABLEA DE ORCAMENTOS'; // Fallback

const NOME_ABA_CLIENT_LIST = 'Client_List';
const NOME_ABA_CONFIG = 'CONFIG';
const NOME_ABA_AUDITORIA = 'AUDITORIA';
const NOME_ABA_DASHBOARD_DATA = 'DASHBOARD_DATA';
const NOME_ABA_SISTEMA = 'SISTEMA';

// ===============================================================
// 🧩 GERAÇÃO AUTOMÁTICA DE SALE_IDs
// ===============================================================
function gerarSaleIdAutomatico() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const id = `VEN-${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return id;
}

// ===============================================================
// 🧹 UTILITÁRIO — NORMALIZAÇÃO DO BANCO DE DADOS Client_List
// ===============================================================
function normalizarClientList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Client_List");
  if (!sh) throw new Error("Aba Client_List não encontrada.");

  const dados = sh.getDataRange().getValues();
  const cabecalho = dados[0];
  const linhas = dados.slice(1);

  const totalEsperado = 17; // Número de colunas padrão

  let linhasCorrigidas = 0;
  const novosDados = linhas.map((linha) => {
    let nova = Array(totalEsperado).fill("");
    let saleId = linha[0]?.toString().trim();

    if (!saleId || saleId === "") {
      saleId = gerarSaleIdAutomatico();
      linhasCorrigidas++;
    }

    nova[0] = saleId;
    nova[1] = linha[1] || new Date();
    nova[2] = linha[2] || "NEW";
    nova[3] = linha[3] || "Full Payment";
    nova[4] = linha[4] || 0;
    nova[5] = linha[5] || "";
    nova[6] = linha[6] || "";
    nova[7] = linha[7] || "";
    nova[8] = linha[8] || "";
    nova[9] = linha[9] || 0;
    nova[10] = linha[10] || 0;
    nova[11] = linha[11] || 0;
    nova[12] = linha[12] || "Cash";
    nova[13] = linha[13] || "-";
    nova[14] = linha[14] || "10%";
    nova[15] = linha[15] || "unknown";
    nova[16] = linha[16] || "Sistema";
    return nova;
  });

  sh.getRange(2, 1, novosDados.length, totalEsperado).setValues(novosDados);

  const msg = `✅ Normalização concluída: ${linhasCorrigidas} linhas corrigidas automaticamente.`;
  Logger.log(msg);
  return msg;
}

// ===============================================================
// 📄 Função: obterAbaComLogs
// Responsável por retornar a aba informada e registrar logs
// de carregamento / erro. À prova de chamadas sem parâmetros.
// ===============================================================
function obterAbaComLogs(ss, nomeAba) {
  try {
    // 🧩 Garante que sempre haverá um Spreadsheet válido
    ss = ss || SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Spreadsheet não inicializado.");

    // 🔍 Busca a aba
    const sheet = ss.getSheetByName(nomeAba);

    if (!sheet) {
      console.error(`❌ Aba não encontrada: ${nomeAba}`);
      return null;
    }

    // 🧾 Log de sucesso
    console.log(`✅ Aba carregada: ${sheet.getName()} (${sheet.getLastRow()} linhas)`);
    return sheet;

  } catch (e) {
    console.error(`⚠️ Erro em obterAbaComLogs: ${e.message}`);
    return null;
  }
}

/**
 * Busca ou cria uma aba emitindo logs para cada etapa.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} nomeAba
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function obterOuCriarAbaComLogs(ss, nomeAba) {
  const existente = obterAbaComLogs(ss, nomeAba);
  if (existente) {
    return existente;
  }
  console.warn(`⚠️ Criando aba ausente: ${nomeAba}`);
  const criada = ss.insertSheet(nomeAba);
  console.log(`🆕 Aba criada: ${criada.getName()} (${criada.getLastRow()} linhas)`);
  return criada;
}

const CHAVE_SESSAO = 'sessaoUsuario';
const DURACAO_SESSAO_MS = 60 * 60 * 1000; // 1 hora
const ADMIN_EMAILS = ['sabinopiresvinicius@gmail.com'];

// ===============================================================
// MENU + INICIALIZAÇÃO AUTOMÁTICA
// ===============================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📘 F/Design Solutions')
    .addItem('🔐 Abrir Sistema', 'iniciarSistemaFDesign')
    .addToUi();

  try {
    iniciarSistemaFDesign();
  } catch (e) {
    Logger.log('⚠️ Falha ao iniciar automaticamente: ' + e);
  }
}

function logout() {
  return encerrarSessao();
}

// ===============================================================
// MÓDULO DE SESSÃO
// ===============================================================

function iniciarSessao(usuario) {
  const cache = CacheService.getUserCache();
  const sessao = {
    id: usuario.id,
    nome: usuario.nome,
    tipo: usuario.tipo,
    email: usuario.email,
    inicio: new Date().toISOString(),
  };
  cache.put(CHAVE_SESSAO, JSON.stringify(sessao), DURACAO_SESSAO_MS / 1000);
  Logger.log(`✅ Sessão iniciada para ${usuario.nome} (${usuario.tipo})`);
}

function verificarSessaoUsuario() {
  const cache = CacheService.getUserCache();
  const tipo = cache.get('tipoUsuario');
  const nome = cache.get('nomeUsuario');

  if (tipo && nome) {
    return { success: true, tipo, nome };
  }
  return { success: false };
}

function obterSessaoAtiva() {
  try {
    const cache = CacheService.getUserCache();
    const sessao = cache.get(CHAVE_SESSAO);
    if (!sessao) return null;
    return JSON.parse(sessao);
  } catch (e) {
    Logger.log("❌ Erro ao obter sessão ativa: " + e);
    return null;
  }
}

function encerrarSessao() {
  try {
    const cache = CacheService.getUserCache();
    cache.remove(CHAVE_SESSAO);
    Logger.log("🔒 Sessão encerrada com sucesso");
    return true;
  } catch (e) {
    Logger.log("❌ Erro ao encerrar sessão: " + e);
    return false;
  }
}

function renovarSessao() {
  const sessao = obterSessaoAtiva();
  if (sessao) {
    const cache = CacheService.getUserCache();
    cache.put(CHAVE_SESSAO, JSON.stringify(sessao), DURACAO_SESSAO_MS / 1000);
  }
}

// ===============================================================
// MÓDULO DE PERMISSÕES
// ===============================================================

function verificarPermissao(sessao, nivelRequerido) {
  try {
    if (!sessao) throw new Error("Sessão inexistente");

    const hierarquia = {
      Admin: 3,
      Supervisor: 2,
      Vendedor: 1,
      Afiliado: 0
    };

    const nivelUsuario = hierarquia[sessao.tipo] ?? 0;
    const nivelNecessario = hierarquia[nivelRequerido] ?? 0;

    if (nivelUsuario >= nivelNecessario) return true;

    Logger.log(`🚫 Acesso negado — ${sessao.nome} (${sessao.tipo}) < ${nivelRequerido}`);
    return false;
  } catch (e) {
    Logger.log("❌ Erro ao verificar permissão: " + e);
    return false;
  }
}

// ===============================================================
// 👥 Módulo: Gestão de Usuários
// ===============================================================
function obterUsuariosModulo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = obterAbaComLogs(ss, NOME_ABA_USUARIOS);
  if (!sh) {
    Logger.log("❌ Aba de usuários não encontrada: " + NOME_ABA_USUARIOS);
    return [];
  }

  const dados = sh.getDataRange().getValues();
  const lista = [];

  for (let i = 1; i < dados.length; i++) {
    const l = dados[i];
    if (!l[0]) continue;

    lista.push({
      id: String(l[0]).trim(),
      nome: String(l[1]).trim(),
      tipo: String(l[2]).trim(),
      email: String(l[3]).trim().toLowerCase(),
      telefone: String(l[4]).trim(),
      pin: String(l[5]).trim(),
      comissao: parseFloat(l[6]) || 0,
      status: String(l[7]).trim()
    });
  }

  Logger.log(`✅ ${lista.length} usuários carregados da aba ${NOME_ABA_USUARIOS}`);
  return lista;
}

// ===============================================================
// 🔑 VERIFICAÇÃO E LOGIN
// ===============================================================

function verificarLogin(credenciais) {
  try {
    if (!credenciais || !credenciais.id || !credenciais.senha) {
      return { sucesso: false, mensagem: 'Preencha todos os campos.' };
    }

    const { id, senha } = credenciais;
    const usuarios = obterUsuariosModulo();
    const usuario = usuarios.find(
      u => String(u.id).trim() === String(id).trim() &&
           String(u.pin).trim() === String(senha).trim() &&
           String(u.status).trim().toLowerCase() === 'ativo'
    );

    if (!usuario) {
      Logger.log(`❌ Falha no login — ID/PIN incorretos (${id})`);
      return { sucesso: false, mensagem: 'E-mail ou PIN incorretos' };
    }

    iniciarSessao(usuario);
    Logger.log(`✅ Login bem-sucedido: ${usuario.nome}`);
    return { sucesso: true, tipo: usuario.tipo, nome: usuario.nome };

  } catch (erro) {
    Logger.log('❌ Erro ao verificar login: ' + erro);
    return { sucesso: false, mensagem: 'Erro interno ao verificar login.' };
  }
}

function loginAutomatico() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) {
      Logger.log("⚠️ Conta Google não detectada para login automático");
      return { success: false, message: "Conta Google não detectada" };
    }

    const usuarios = obterUsuariosModulo();
    if (!usuarios || usuarios.length === 0) {
      Logger.log("❌ Nenhum usuário encontrado na base");
      return { success: false, message: "Usuário não autorizado" };
    }

    const usuario = usuarios.find(u =>
      String(u.email).toLowerCase().trim() === String(email).toLowerCase().trim() &&
      String(u.status).toLowerCase() === "ativo"
    );

    if (!usuario) {
      Logger.log(`❌ Login automático falhou — ${email} não encontrado ou inativo`);
      return { success: false, message: "Usuário não autorizado" };
    }

    iniciarSessao(usuario);
    Logger.log(`✅ Login automático realizado para ${usuario.nome}`);
    return { success: true, type: usuario.tipo, name: usuario.nome };

  } catch (erro) {
    Logger.log("❌ Erro no login automático: " + erro);
    return { success: false, message: "Erro ao realizar login automático" };
  }
}

// ===============================================================
// 🧭 ABERTURA DE PAINÉIS POR TIPO DE USUÁRIO
// ===============================================================

function abrirPainelPorTipo(sessao) {
  if (!sessao || !sessao.tipo) {
    Logger.log("⚠️ Sessão inválida ou sem tipo definido.");
    abrirLoginSistema();
    return;
  }

  switch (sessao.tipo) {
    case "Admin":
      abrirPainelAdmin();
      break;
    case "Vendedor":
      abrirPainelVendas();
      break;
    default:
      Logger.log("⚠️ Tipo de usuário não reconhecido: " + sessao.tipo);
      abrirLoginSistema();
      break;
  }
}

function abrirPainelNoModal(tipo) {
  const sessao = { tipo };
  abrirPainelPorTipo(sessao);
}

function abrirPainelAdmin() {
  const html = HtmlService.createTemplateFromFile("painelAdmin").evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(1300).setHeight(750), "Painel Administrativo — F/Design Solutions");
}

function abrirPainelVendas() {
  const html = HtmlService.createTemplateFromFile("homeVendedor").evaluate();
  SpreadsheetApp.getUi().showModalDialog(
    html.setWidth(1200).setHeight(720),
    "Painel do Vendedor — F/Design Solutions"
  );
}

function abrirLoginSistema() {
  const html = HtmlService.createTemplateFromFile("loginSistema").evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(600).setHeight(480), "Login — F/Design Solutions");
}

// ===============================================================
// UTILITÁRIOS DE DATA
// ===============================================================

/**
 * Formata data de forma consistente
 */
function formatarData(valor) {
  if (!valor) return '-';

  try {
    const tz = Session.getScriptTimeZone();

    // Se já é um objeto Date
    if (valor instanceof Date) {
      return Utilities.formatDate(valor, tz, 'dd/MM/yyyy');
    }

    if (typeof valor === 'number') {
      // Converte números vindos da planilha (serial do Sheets ou timestamp) em datas legíveis
      let dataSerial = null;
      if (valor > 1e11) {
        dataSerial = new Date(valor);
      } else if (valor > 1000) {
        const millis = Math.round((valor - 25569) * 86400000);
        dataSerial = new Date(millis);
      }

      if (dataSerial && !isNaN(dataSerial.getTime())) {
        return Utilities.formatDate(dataSerial, tz, 'dd/MM/yyyy');
      }
    }

    // Se é string
    if (typeof valor === 'string') {
      const onlyDate = valor.trim().split(' ')[0];
      const parts = onlyDate.split(/[\/\-]/);

      if (parts.length >= 3) {
        let [p1, p2, p3] = parts.map(p => parseInt(p));
        
        // Ajusta ano de 2 dígitos
        if (p3 < 100) p3 += 2000;
        
        // Tenta formato dd/mm/yyyy
        if (p1 <= 31 && p2 <= 12) {
          const d = new Date(p3, p2 - 1, p1);
          return Utilities.formatDate(d, tz, 'dd/MM/yyyy');
        }
        // Tenta formato mm/dd/yyyy
        else if (p2 <= 31 && p1 <= 12) {
          const d = new Date(p3, p1 - 1, p2);
          return Utilities.formatDate(d, tz, 'dd/MM/yyyy');
        }
      }
    }
    
    return '-';
  } catch (err) {
    Logger.log('⚠️ Erro ao formatar data: ' + err);
    return '-';
  }
}

function normalizarValorNumerico(valor) {
  if (valor === null || valor === undefined) {
    return 0;
  }

  if (typeof valor === 'number') {
    return isNaN(valor) ? 0 : valor;
  }

  const textoNormalizado = String(valor)
    .replace(/[^0-9,.-]+/g, '')
    .replace(/,(?=\d{3}(?![\d,]))/g, '')
    .replace(',', '.');

  const numero = parseFloat(textoNormalizado);
  return isNaN(numero) ? 0 : numero;
}

/**
 * Calcula dias desde uma data
 */
function calcularDiasDesde(dataStr) {
  try {
    if (!dataStr || dataStr === '-') return null;
    
    const parts = dataStr.split('/');
    if (parts.length !== 3) return null;
    
    const [dia, mes, ano] = parts.map(p => parseInt(p));
    const dataPassada = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    
    const diffTime = hoje - dataPassada;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (err) {
    return null;
  }
}

/**
 * Retorna cor baseada em dias decorridos
 */
function obterCorPorDias(dias) {
  if (dias === null) return 'gray';
  if (dias <= 7) return 'green';
  if (dias <= 15) return 'yellow';
  return 'burgundy';
}

// ===============================================================
// 📊 ANALYTICS ENGINE - MÉTRICAS DE USUÁRIO
// ===============================================================

function criarMetricasUsuarioVazias() {
  return {
    communication: { messages: 0, calls: 0, total: 0 },
    effectiveness: { respPos: 0, respNeg: 0, prr: 0 },
    conversion: { totalBudgets: 0, converted: 0, rate: 0 },
    financial: {
      avgSaleValue: 0,
      totalRevenue: 0,
      totalCommission: 0,
      profitabilityPerHour: 0
    },
    derived: { oei: 0, ce: 0, hp: 0, prr: 0, nep: 0 }
  };
}

/**
 * Calcula todas as métricas analíticas de um usuário (com tolerância a nomes/IDs)
 */
function calcularMetricasUsuario(userId, budgets, sales) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const shUsuarios = ss.getSheetByName('USUARIOS');
    const dadosUsuarios = shUsuarios.getDataRange().getValues();

    // 🧩 Cria mapa de correspondência: { nomeLower: userId }
    const mapaUsuarios = {};
    for (let i = 1; i < dadosUsuarios.length; i++) {
      const id = (dadosUsuarios[i][0] || '').toString().trim();
      const nome = (dadosUsuarios[i][1] || '').toString().trim().toLowerCase();
      if (id && nome) mapaUsuarios[nome] = id;
    }

    // 🔍 Normaliza referência do usuário atual
    const ref = userId.toString().trim().toLowerCase();

    // === FILTRAGEM ===
    const userBudgets = budgets.filter(b => {
      const criador = (b.criadoPor || '').toString().trim().toLowerCase();
      const vendedor = (b.vendedorId || '').toString().trim().toLowerCase();
      const idEsperado = mapaUsuarios[criador] || mapaUsuarios[vendedor] || vendedor;
      return idEsperado === userId || criador === ref || vendedor === ref;
    });

    const userSales = sales.filter(s => {
      const vendedorId = (s.vendedorId || '').toString().trim().toLowerCase();
      const criadoPor = (s.criadoPor || '').toString().trim().toLowerCase();
      const vendedorNome = (s.vendedorNome || '').toString().trim().toLowerCase();

      // tenta resolver pelo mapa também
      const idMapeado = mapaUsuarios[vendedorId] || mapaUsuarios[vendedorNome] || mapaUsuarios[criadoPor];

      return (
        vendedorId === ref ||
        criadoPor === ref ||
        vendedorNome === ref ||
        idMapeado === userId
      );
    });

    // === MÉTRICAS ===
    const totalMensagens = userBudgets.reduce((sum, b) => sum + (parseInt(b.mensagens) || 0), 0);
    const totalLigacoes = userBudgets.reduce((sum, b) => sum + (parseInt(b.ligacoes) || 0), 0);
    const totalRespPos = userBudgets.reduce((sum, b) => sum + (parseInt(b.respPos) || 0), 0);
    const totalRespNeg = userBudgets.reduce((sum, b) => sum + (parseInt(b.respNeg) || 0), 0);

    const totalOrcamentos = userBudgets.length;
    const orcamentosFechados = userBudgets.filter(b => {
      const st = (b.status || '').toLowerCase();
      return st.includes('fechado') || st.includes('convertido');
    }).length;
    const taxaConversao = totalOrcamentos > 0 ? (orcamentosFechados / totalOrcamentos) * 100 : 0;

    const safeNum = v => parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0;

    const totalVendas = userSales.reduce((sum, s) => sum + safeNum(s.valor), 0);
    const totalComissao = userSales.reduce((sum, s) => sum + safeNum(s.comissao), 0);
    const valorMedioVenda = userSales.length > 0 ? totalVendas / userSales.length : 0;

    const totalRespostas = totalRespPos + totalRespNeg;
    const prr = totalRespostas > 0 ? (totalRespPos / totalRespostas) * 100 : 0;
    const horasTrabalhadas = 160;
    const hp = horasTrabalhadas > 0 ? (totalVendas - totalComissao) / horasTrabalhadas : 0;
    const nep = totalVendas - totalComissao;
    const oei = totalOrcamentos > 0 ? ((totalMensagens + totalLigacoes) / totalOrcamentos) : 0;

    return {
      communication: {
        messages: totalMensagens,
        calls: totalLigacoes,
        total: totalMensagens + totalLigacoes
      },
      effectiveness: {
        respPos: totalRespPos,
        respNeg: totalRespNeg,
        prr: parseFloat(prr.toFixed(1))
      },
      conversion: {
        totalBudgets: totalOrcamentos,
        converted: orcamentosFechados,
        rate: parseFloat(taxaConversao.toFixed(1))
      },
      financial: {
        avgSaleValue: parseFloat(valorMedioVenda.toFixed(2)),
        totalRevenue: parseFloat(totalVendas.toFixed(2)),
        totalCommission: parseFloat(totalComissao.toFixed(2)),
        profitabilityPerHour: parseFloat(hp.toFixed(2))
      },
      derived: {
        oei: parseFloat(oei.toFixed(2)),
        ce: parseFloat(taxaConversao.toFixed(1)),
        hp: parseFloat(hp.toFixed(2)),
        prr: parseFloat(prr.toFixed(1)),
        nep: parseFloat(nep.toFixed(2))
      }
    };

  } catch (err) {
    Logger.log('❌ Erro ao calcular métricas de usuário: ' + err);
    return criarMetricasUsuarioVazias();
  }
}

/**
 * Calcula métricas detalhadas de um orçamento
 */
function calcularMetricasOrcamento(budget) {
  try {
    const diasDecorridos = calcularDiasDesde(budget.dataCriacao);
    const corStatus = obterCorPorDias(diasDecorridos);
    
    return {
      ...budget,
      diasDecorridos: diasDecorridos,
      corStatus: corStatus,
      probabilidadeConversao: calcularProbabilidadeConversao(budget)
    };
  } catch (err) {
    Logger.log('❌ Erro ao calcular métricas de orçamento: ' + err);
    return budget;
  }
}

/**
 * Calcula probabilidade de conversão baseada em histórico
 */
function calcularProbabilidadeConversao(budget) {
  let score = 50; // Base

  // Ajusta por comunicação
  const mensagens = parseInt(budget.mensagens) || 0;
  const ligacoes = parseInt(budget.ligacoes) || 0;
  if (mensagens + ligacoes > 5) score += 15;
  else if (mensagens + ligacoes > 2) score += 10;
  
  // Ajusta por respostas positivas
  const respPos = parseInt(budget.respPos) || 0;
  if (respPos > 0) score += 20;
  
  // Ajusta por tempo decorrido
  const dias = calcularDiasDesde(budget.dataCriacao);
  if (dias > 30) score -= 20;
  else if (dias > 15) score -= 10;
  
  // Ajusta por valor
  if (budget.valor > 5000) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

function obterPercentualComissaoPorTipo(tipo) {
  if (!tipo) {
    return null;
  }

  const chave = String(tipo).trim().toUpperCase();

  if (chave === 'NEW' || chave === 'NOVA' || chave === 'NOVO') {
    return 0.10;
  }

  if (chave === 'WALK-IN' || chave === 'WALKIN') {
    return 0.05;
  }

  if (chave === 'RECURRING' || chave === 'RECORRENTE' || chave === 'OLD') {
    return 0.05;
  }

  return null;
}

/**
 * Calcula métricas detalhadas de uma venda
 */
function calcularMetricasVenda(sale, budgets) {
  try {
    // Tenta encontrar orçamento relacionado
    const statusFechamento = ['Fechado', 'Fechado (Venda)']; // Passa a aceitar ambos os status de fechamento
    const relatedBudget = budgets.find(b =>
      b.cliente === sale.cliente && statusFechamento.includes(b.status)
    );
    
    let tempoConversao = null;
    let tentativasContato = 0;
    
    if (relatedBudget) {
      // Calcula tempo de conversão
      const dataOrc = relatedBudget.dataCriacao;
      const dataVenda = sale.data;
      // Implementar cálculo de diferença de dias
      
      tentativasContato = (parseInt(relatedBudget.mensagens) || 0) + 
                          (parseInt(relatedBudget.ligacoes) || 0);
    }
    
    const valorPorHora = tentativasContato > 0 
      ? (sale.valor / tentativasContato).toFixed(2)
      : 0;
    
    return {
      ...sale,
      relatedBudgetId: relatedBudget ? relatedBudget.id : null,
      tempoConversao: tempoConversao,
      tentativasContato: tentativasContato,
      valorPorHora: parseFloat(valorPorHora)
    };
  } catch (err) {
    Logger.log('❌ Erro ao calcular métricas de venda: ' + err);
    return sale;
  }
}

// ===============================================================
// 📊 PAINEL ADMINISTRATIVO — DADOS ANALÍTICOS (V2.0)
// ===============================================================

function obterDadosAdmin() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const sheetUsuarios = obterAbaComLogs(ss, NOME_ABA_USUARIOS);
    if (!sheetUsuarios) {
      throw new Error("Aba 'USUARIOS' não encontrada.");
    }

    const sheetVendas = obterAbaComLogs(ss, NOME_ABA_VENDAS);
    const sheetOrcamentosPrimario = obterAbaComLogs(ss, NOME_ABA_ORCAMENTOS);
    const sheetOrcamentos = sheetOrcamentosPrimario || obterAbaComLogs(ss, NOME_ABA_ORCAMENTOS_FALLBACK);
    if (!sheetOrcamentosPrimario && sheetOrcamentos) {
      console.warn(`ℹ️ Utilizando aba fallback: ${NOME_ABA_ORCAMENTOS_FALLBACK}`);
    }

    const sheetConfig = obterAbaComLogs(ss, NOME_ABA_CONFIG);

    const safeText = valor => {
      if (valor === undefined || valor === null) {
        return '';
      }
      return String(valor).trim();
    };

    const inteiro = valor => {
      const numero = normalizarValorNumerico(valor);
      return Number.isFinite(numero) ? Math.round(numero) : 0;
    };

    const usuariosBase = sheetUsuarios.getLastRow() > 1
      ? sheetUsuarios.getRange(2, 1, sheetUsuarios.getLastRow() - 1, 8).getValues()
          .filter(linha => linha[0])
          .map(linha => {
            const email = safeText(linha[3]);
            return {
              id: safeText(linha[0]),
              nome: safeText(linha[1]),
              tipo: safeText(linha[2]),
              email: email,
              telefone: safeText(linha[4]),
              pin: safeText(linha[5]),
              comissao: normalizarValorNumerico(linha[6]),
              status: safeText(linha[7]) || 'Inativo'
            };
          })
      : [];

    const usuariosPorId = {};
    const usuariosPorEmail = {};
    usuariosBase.forEach(usuario => {
      const id = safeText(usuario.id);
      if (id) {
        usuariosPorId[id] = usuario;
      }

      const email = safeText(usuario.email).toLowerCase();
      if (email) {
        usuariosPorEmail[email] = usuario;
      }
    });

    const resolverNomeUsuario = referencia => {
      const chave = safeText(referencia);
      if (!chave) {
        return '';
      }

      if (usuariosPorId[chave]) {
        return usuariosPorId[chave].nome;
      }

      const porEmail = usuariosPorEmail[chave.toLowerCase()];
      if (porEmail) {
        return porEmail.nome;
      }

      return chave;
    };

    const budgetsBase = sheetOrcamentos && sheetOrcamentos.getLastRow() > 1
  ? sheetOrcamentos
      .getRange(2, 1, sheetOrcamentos.getLastRow() - 1, 30)
      .getValues()
      .filter(l => l[0])
      .map(l => {
        const vendedorId = safeText(l[3]);
        return {
          id: safeText(l[0]),
          dataCriacao: formatarData(l[1]),
          dataCriacaoISO: l[1] instanceof Date ? l[1].toISOString() : '',
          origem: safeText(l[2]),
          criadoPor: vendedorId,
          cliente: safeText(l[4]),
          email: safeText(l[5]),
          telefone: safeText(l[6]),
          descricao: safeText(l[7]),
          valor: parseFloat(normalizarValorNumerico(l[8]).toFixed(2)),
          status: safeText(l[9]),
          dataEnvio: formatarData(l[10]),
          dataEnvioISO: l[10] instanceof Date ? l[10].toISOString() : '',
          ultimoContato: formatarData(l[11]),
          ultimoContatoISO: l[11] instanceof Date ? l[11].toISOString() : '',
          mensagens: inteiro(l[12]),
          ligacoes: inteiro(l[13]),
          respPos: inteiro(l[14]),
          respNeg: inteiro(l[15]),
          motivoPerda: safeText(l[16]),
          obs: safeText(l[17]),
          valorFechado: parseFloat(normalizarValorNumerico(l[18]).toFixed(2)),
          dataFechamento: formatarData(l[19]),
          categoria: safeText(l[21]),
          produto: safeText(l[22]),
          quantidade: inteiro(l[23]),
          canal: safeText(l[25]),
          responsavel: safeText(l[27]),
          arquivado: safeText(l[29]),
          vendedorId
        };
      })
  : [];


    const budgetsNormalizados = budgetsBase.map(orçamento => ({
      ...orçamento,
      responsavelNome: resolverNomeUsuario(orçamento.vendedorId || orçamento.criadoPor) || '-'
    }));

    const salesBase =
  sheetVendas && sheetVendas.getLastRow() > 1
    ? sheetVendas
        .getRange(2, 1, sheetVendas.getLastRow() - 1, 17)
        .getValues()
        // 🔄 não descarta linhas com ID vazio, só remove linhas 100% em branco
        .filter((l) => l.some((cell) => cell !== "" && cell !== null && cell !== undefined))
        .map((l, idx) => {
          // ID (gerado se estiver vazio)
          const id = safeText(l[0]) || `SALE-AUTO-${idx + 2}`;

          // 🧭 Correção robusta de data
          let data;
          try {
            if (l[1] instanceof Date) {
              data = l[1];
            } else if (typeof l[1] === "string" && l[1].trim() !== "") {
              const partes = l[1].trim().split(/[\/ :]/);
              if (partes.length >= 3) {
                const [mes, dia, ano, hora = 0, minuto = 0, segundo = 0] = partes.map((p) =>
                  parseInt(p, 10)
                );
                data = new Date(ano, mes - 1, dia, hora, minuto, segundo);
              } else {
                data = new Date(l[1]);
              }
            } else {
              data = new Date();
            }
          } catch (e) {
            Logger.log(`⚠️ Erro ao processar data da linha: ${l[1]} — ${e}`);
            data = new Date();
          }

          // Campos padronizados
          const tipo = safeText(l[2]) || "N/D";
          const status = safeText(l[3]) || "N/D";
          const comissaoInformada = normalizarValorNumerico(l[4]);
          const cliente = safeText(l[5]);
          const empresa = safeText(l[6]);
          const invoice = safeText(l[7]);
          const produto = safeText(l[8]);
          const valorBruto = normalizarValorNumerico(l[9]);
          const saldoDevedor = normalizarValorNumerico(l[10]);
          const valorPago = normalizarValorNumerico(l[11]);
          const metodoPagamento = safeText(l[12]);
          const notas = safeText(l[13]);
          const comissaoPercentual = normalizarValorNumerico(String(l[14]).replace("%", ""));
          const vendedorId = safeText(l[15]);
          const criadoPor = safeText(l[16]);
          const vendedorFinal = vendedorId || criadoPor || "Sistema";
          const vendedorNome = resolverNomeUsuario(vendedorFinal);

          // 💰 Cálculo híbrido
          let comissaoFinal = 0;
          if (comissaoInformada > 0) {
            comissaoFinal = comissaoInformada;
          } else if (valorBruto > 0 && comissaoPercentual > 0) {
            comissaoFinal = valorBruto * (comissaoPercentual / 100);
          }

          return {
            id,
            data: formatarData(data),
            dataISO: data instanceof Date ? data.toISOString() : "",
            tipo,
            status,
            cliente,
            empresa,
            invoice,
            produto,
            valor: isNaN(valorBruto) ? 0 : parseFloat(valorBruto.toFixed(2)),
            saldoDevedor: isNaN(saldoDevedor) ? 0 : parseFloat(saldoDevedor.toFixed(2)),
            valorPago: isNaN(valorPago) ? 0 : parseFloat(valorPago.toFixed(2)),
            metodoPagamento: metodoPagamento || "-",
            notas,
            comissao: isNaN(comissaoFinal) ? 0 : parseFloat(comissaoFinal.toFixed(2)),
            comissaoPercentual: isNaN(comissaoPercentual)
              ? 0
              : parseFloat(comissaoPercentual.toFixed(2)),
            vendedorId: vendedorFinal,
            vendedorNome: vendedorNome || "-",
            criadoPor: criadoPor || "Sistema",
          };
        })
    : [];

    const users = usuariosBase.map(usuario => {
      const metricas = calcularMetricasUsuario(usuario.id, budgetsNormalizados, salesBase);
      return {
        ...usuario,
        metrics: metricas || criarMetricasUsuarioVazias()
      };
    });

    const budgetsEnhanced = budgetsNormalizados.map(item => calcularMetricasOrcamento(item));
    const salesEnhanced = salesBase.map(item => calcularMetricasVenda(item, budgetsEnhanced))
      .map((item, indice) => ({
        ...item,
        vendedorNome: salesBase[indice].vendedorNome,
        comissaoPercentual: salesBase[indice].comissaoPercentual
      }));

    const totalVendas = salesEnhanced.reduce((acumulado, venda) => acumulado + (venda.valor || 0), 0);
    const totalComissoes = salesEnhanced.reduce((acumulado, venda) => acumulado + (venda.comissao || 0), 0);
    const orcamentosAbertos = budgetsEnhanced.filter(orçamento => {
      const status = safeText(orçamento.status).toLowerCase();
      return status === 'aberto' || status === 'proposta enviada';
    }).length;
    const vendedoresAtivos = users.filter(usuario => safeText(usuario.status).toLowerCase() === 'ativo').length;
    const taxaConversao = budgetsEnhanced.length > 0
      ? parseFloat(((salesEnhanced.length / budgetsEnhanced.length) * 100).toFixed(1))
      : 0;

    const vendasPorTipo = salesEnhanced.reduce((acumulado, venda) => {
      const tipo = safeText(venda.tipo) || 'Sem Tipo';
      acumulado[tipo] = (acumulado[tipo] || 0) + (venda.valor || 0);
      return acumulado;
    }, {});

    const orcamentosPorStatus = budgetsEnhanced.reduce((acumulado, orçamento) => {
      const status = safeText(orçamento.status) || 'Sem Status';
      acumulado[status] = (acumulado[status] || 0) + 1;
      return acumulado;
    }, {});

    const graficoVendasPorTipo = Object.keys(vendasPorTipo).length > 0
      ? [['Tipo', 'Valor']].concat(Object.entries(vendasPorTipo))
      : [['Tipo', 'Valor'], ['Sem Dados', 0]];

    const graficoOrcamentosPorStatus = Object.keys(orcamentosPorStatus).length > 0
      ? [['Status', 'Quantidade']].concat(Object.entries(orcamentosPorStatus))
      : [['Status', 'Quantidade'], ['Sem Dados', 0]];

    const reports = {
      kpis: {
        totalVendas: parseFloat(totalVendas.toFixed(2)),
        totalComissoes: parseFloat(totalComissoes.toFixed(2)),
        orcamentosAbertos: orcamentosAbertos,
        vendedoresAtivos: vendedoresAtivos,
        taxaConversao: taxaConversao
      },
      grafVendasPorTipo: graficoVendasPorTipo,
      grafOrcPorStatus: graficoOrcamentosPorStatus
    };

    const settings = sheetConfig
      ? Object.fromEntries(
          sheetConfig.getDataRange().getValues()
            .filter(linha => linha[0])
            .map(linha => [linha[0], linha[1]])
        )
      : {};

    Logger.log(`✅ Dados administrativos carregados com sucesso: ${users.length} usuários, ${budgetsEnhanced.length} orçamentos, ${salesEnhanced.length} vendas.`);

    return {
      success: true,
      users: users,
      budgets: budgetsEnhanced,
      sales: salesEnhanced,
      reports: reports,
      settings: settings
    };

  } catch (e) {
    Logger.log(`❌ Erro em obterDadosAdmin: ${e} | Stack: ${e && e.stack}`);
    return {
      success: false,
      message: e && e.message ? e.message : 'Erro ao carregar dados administrativos.',
      details: String(e)
    };
  }
}

function filtrarMetricasPorPeriodo(userId, start, end) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = obterAbaComLogs(ss, NOME_ABA_VENDAS);
  if (!sheet) {
    throw new Error(`Aba de vendas não encontrada (${NOME_ABA_VENDAS}).`);
  }

  const normalizarDataFiltro = valor => {
    if (!valor) {
      return null;
    }
    const data = new Date(valor);
    if (isNaN(data.getTime())) {
      return null;
    }
    return data;
  };

  const dataInicio = normalizarDataFiltro(start);
  const dataFim = normalizarDataFiltro(end);
  if (dataInicio) {
    dataInicio.setHours(0, 0, 0, 0);
  }
  if (dataFim) {
    dataFim.setHours(23, 59, 59, 999);
  }

  Logger.log(`📅 Filtrando métricas de ${userId} entre ${start} e ${end}`);

  const valores = sheet.getDataRange().getValues();
  const resultados = [];

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const vendedorId = String(linha[8] || '').trim();
    if (userId && vendedorId !== userId) {
      continue;
    }

    const dataBruta = linha[0];
    const dataVenda = dataBruta instanceof Date ? new Date(dataBruta) : new Date(dataBruta);
    if (isNaN(dataVenda.getTime())) {
      continue;
    }

    if (dataInicio && dataVenda < dataInicio) {
      continue;
    }
    if (dataFim && dataVenda > dataFim) {
      continue;
    }

    resultados.push({
      data: formatarData(dataBruta),
      dataISO: dataVenda.toISOString(),
      tipo: String(linha[1] || ''),
      cliente: String(linha[2] || ''),
      empresa: String(linha[3] || ''),
      invoice: String(linha[4] || ''),
      produto: String(linha[5] || ''),
      valor: parseFloat(normalizarValorNumerico(linha[6]).toFixed(2)),
      comissao: parseFloat(normalizarValorNumerico(linha[7]).toFixed(2)),
      vendedorId: vendedorId,
      criadoPor: String(linha[9] || '')
    });
  }

  Logger.log(`📊 ${resultados.length} registros filtrados para ${userId}`);
  return resultados;
}

// ===============================================================
// VENDAS — CRUD COMPLETO (Mantido da versão anterior)
// ===============================================================

// ===============================================================
// 👤 FUNÇÃO DE SUPORTE — Retorna nome do usuário logado
// ===============================================================
function obterUsuarioAtivoNome() {
  try {
    const sessao = obterSessaoAtiva?.() || {};
const vendedorId = sessao.nome || Session.getActiveUser().getEmail() || "Sistema";
const criadoPor = sessao.nome || Session.getActiveUser().getEmail() || "Sistema";


    const email = sessao.email || Session.getActiveUser().getEmail();
    if (!email) return "Sistema";

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("USUARIOS");
    const dados = sh.getDataRange().getValues();

    for (let i = 1; i < dados.length; i++) {
      const emailPlanilha = String(dados[i][3]).trim().toLowerCase();
      if (emailPlanilha === email.trim().toLowerCase()) {
        return dados[i][1]; // Coluna B = Nome
      }
    }
    return "Sistema";
  } catch (e) {
    Logger.log("⚠️ Erro ao obter nome do usuário ativo: " + e);
    return "Sistema";
  }
}

// ===============================================================
// 🔍 BUSCAR VENDA — Identificação interna via SALES_ID
// ===============================================================
function buscarVenda(salesID) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaComLogs(ss, NOME_ABA_CLIENT_LIST);

    if (!aba) throw new Error(`Aba de vendas não encontrada (${NOME_ABA_CLIENT_LIST}).`);
    if (!salesID) throw new Error("Sales_ID não informado.");

    const dados = aba.getDataRange().getValues();

    for (let i = 1; i < dados.length; i++) {
      const idCelula = String(dados[i][0]).trim();
      if (idCelula === salesID) {
        return {
          linha: i + 1,
          type: dados[i][2],
          clientName: dados[i][5],
          businessName: dados[i][6],
          product: dados[i][8],
          amount: dados[i][9],
          payment: dados[i][10],
          notes: dados[i][11],
          status: dados[i][3],
          commissionValue: dados[i][4],
          percentSales: dados[i][12]
        };
      }
    }
    return null;
  } catch (erro) {
    throw new Error("Erro ao buscar venda: " + erro.message);
  }
}


function atualizarVenda(dados) {
  try {
    if (!dados || !dados.linha) {
      throw new Error('Linha da venda não identificada.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaComLogs(ss, NOME_ABA_CLIENT_LIST);
    if (!aba) {
      throw new Error(`Aba de vendas não encontrada (${NOME_ABA_CLIENT_LIST}).`);
    }
    const linha = Number(dados.linha);

    let percentual = 0;
    if (dados.tipo === 'New') percentual = 0.30;
    else if (dados.tipo === 'Old') percentual = 0.20;
    else if (dados.tipo === 'Walk-in') percentual = 0.10;

    const valorVenda = Number(dados.valor) || 0;
    const valorComissao = valorVenda * percentual;

    aba.getRange(linha, 2).setValue(dados.tipo);
    aba.getRange(linha, 3).setValue(dados.cliente);
    aba.getRange(linha, 4).setValue(dados.empresa || '');
    aba.getRange(linha, 5).setValue(dados.invoice);
    aba.getRange(linha, 6).setValue(dados.produto || '');
    aba.getRange(linha, 7).setValue(valorVenda);
    aba.getRange(linha, 8).setValue(valorComissao.toFixed(2));

    return `✅ Venda atualizada com sucesso! Comissão: $${valorComissao.toFixed(2)}`;
  } catch (erro) {
    throw new Error('Erro ao atualizar venda: ' + erro.message);
  }
}

function excluirVenda(linha) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaComLogs(ss, NOME_ABA_CLIENT_LIST);
    if (!aba) {
      throw new Error(`Aba de vendas não encontrada (${NOME_ABA_CLIENT_LIST}).`);
    }
    const totalLinhas = aba.getLastRow();
    const linhaNum = Number(linha);

    if (!linhaNum || linhaNum <= 1 || linhaNum > totalLinhas) {
      throw new Error(`Linha inválida (${linhaNum}).`);
    }

    aba.deleteRow(linhaNum);
    return '🗑️ Venda excluída com sucesso!';
  } catch (erro) {
    throw new Error('Erro ao excluir venda: ' + erro.message);
  }
}

// ===============================================================
// GESTÃO DE USUÁRIOS (Admin)
// ===============================================================

function obterUsuarios() {
  const sessao = obterSessaoAtiva();
  if (!sessao || !verificarPermissao(sessao, 'Admin')) {
    throw new Error('Permissão negada');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = obterAbaComLogs(ss, NOME_ABA_USUARIOS);
  if (!sh) throw new Error('A aba de usuários não foi encontrada.');

  const dados = sh.getDataRange().getValues();
  const lista = [];

  for (let i = 1; i < dados.length; i++) {
    const l = dados[i];
    if (!l[0]) continue;

    lista.push({
      id: l[0],
      nome: l[1],
      tipo: l[2],
      email: l[3],
      telefone: l[4],
      pin: l[5],
      comissao: parseFloat(l[6]) || 0,
      status: l[7]
    });
  }

  renovarSessao();
  return lista;
}

function obterUsuarioPorId(id) {
  const sessao = obterSessaoAtiva();
  if (!sessao || !verificarPermissao(sessao, 'Admin')) {
    throw new Error('Permissão negada');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = obterAbaComLogs(ss, NOME_ABA_USUARIOS);
  if (!sh) {
    throw new Error('A aba de usuários não foi encontrada.');
  }
  const dados = sh.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === id) {
      const l = dados[i];
      return {
        id: l[0],
        nome: l[1],
        tipo: l[2],
        email: l[3],
        telefone: l[4],
        pin: l[5],
        comissao: parseFloat(l[6]) || 0,
        status: l[7]
      };
    }
  }

  throw new Error('Usuário não encontrado.');
}

function salvarUsuario(u) {
  const sessao = obterSessaoAtiva();
  if (!sessao || !verificarPermissao(sessao, 'Admin')) {
    throw new Error('Permissão negada');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = obterAbaComLogs(ss, NOME_ABA_USUARIOS);
  if (!sh) throw new Error('A aba de usuários não foi encontrada.');

  const dados = sh.getDataRange().getValues();
  let comissao = parseFloat(u.comissao) || 0;
  if (comissao >= 1) comissao = comissao / 100;

  const linhaExistente = dados.findIndex(r => r[0] === u.id);

  if (linhaExistente === -1) {
    const novoId = 'U' + new Date().getTime().toString().slice(-6);
    sh.appendRow([
      novoId,
      u.nome,
      u.tipo,
      u.email,
      u.telefone,
      u.pin,
      comissao,
      'Ativo'
    ]);
    Logger.log(`✅ Novo usuário adicionado: ${u.nome}`);
  } else {
    const row = linhaExistente + 1;
    sh.getRange(row, 2, 1, 7).setValues([
      [u.nome, u.tipo, u.email, u.telefone, u.pin, comissao, 'Ativo']
    ]);
    Logger.log(`✏️ Usuário atualizado: ${u.nome}`);
  }

  renovarSessao();
  return true;
}

function inativarUsuario(id) {
  const sessao = obterSessaoAtiva();
  if (!sessao || !verificarPermissao(sessao, 'Admin')) {
    throw new Error('Permissão negada');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = obterAbaComLogs(ss, NOME_ABA_USUARIOS);
  if (!sh) {
    throw new Error('A aba de usuários não foi encontrada.');
  }
  const dados = sh.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === id) {
      sh.getRange(i + 1, 8).setValue('Inativo');
      Logger.log(`🚫 Usuário ${id} inativado`);
      renovarSessao();
      return;
    }
  }

  throw new Error('Usuário não encontrado para inativar.');
}

function excluirUsuario(id) {
  const sessao = obterSessaoAtiva();
  if (!sessao || !verificarPermissao(sessao, 'Admin')) {
    throw new Error('Permissão negada');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = obterAbaComLogs(ss, NOME_ABA_USUARIOS);
  if (!sh) {
    throw new Error('A aba de usuários não foi encontrada.');
  }
  const dados = sh.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === id) {
      sh.deleteRow(i + 1);
      Logger.log(`🗑️ Usuário ${id} excluído`);
      renovarSessao();
      return true;
    }
  }

  throw new Error('Usuário não encontrado para exclusão.');
}

// ===============================================================
// DASHBOARD PESSOAL (Mantido da versão anterior)
// ===============================================================

function obterPermissoesAtuais() {
  const usuario = obterSessaoAtiva();
  if (!usuario) return { autenticado: false };

  let permissoes = {
    podeGerenciar: false,
    podeVerDashboard: false,
    podeVerOrcamentos: false,
    podeVerVendas: false,
    tipo: usuario.tipo,
    nome: usuario.nome
  };

  switch (usuario.tipo) {
    case 'Admin':
      permissoes.podeGerenciar = true;
      permissoes.podeVerDashboard = true;
      permissoes.podeVerOrcamentos = true;
      permissoes.podeVerVendas = true;
      break;
    case 'Vendas':
    case 'Vendedor':
      permissoes.podeVerDashboard = true;
      permissoes.podeVerOrcamentos = true;
      permissoes.podeVerVendas = true;
      break;
    case 'Funcionario':
      permissoes.podeVerDashboard = true;
      break;
    default:
      return { autenticado: false };
  }

  renovarSessao();
  return { autenticado: true, usuario, permissoes };
}

function iniciarSessaoSistema() {
  try {
    abrirLoginSistema();
    return { success: true, message: 'Login aberto' };
  } catch (e) {
    Logger.log('⚠️ Erro ao abrir login: ' + e);
    return { success: false, message: e.message };
  }
}

function obterDadosDashboard() {
  try {
    const usuario = obterSessaoAtiva();
    if (!usuario) return { erro: true, mensagem: 'Sessão expirada' };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const shV = obterAbaComLogs(ss, NOME_ABA_CLIENT_LIST);
    const shOPrimario = obterAbaComLogs(ss, NOME_ABA_ORCAMENTOS);
    const shO = shOPrimario || obterAbaComLogs(ss, NOME_ABA_ORCAMENTOS_FALLBACK);
    if (!shOPrimario && shO) {
      console.warn(`ℹ️ Utilizando aba fallback: ${NOME_ABA_ORCAMENTOS_FALLBACK}`);
    }

    const vendas = shV ? shV.getDataRange().getValues() : [];
    const orc = shO ? shO.getDataRange().getValues() : [];

    let totalVendas = 0;
    let totalComissao = 0;
    const historico = [];
    const monthly = {};
    const tz = Session.getScriptTimeZone();
    const agora = new Date();

    for (let i = 1; i < vendas.length; i++) {
      const r = vendas[i];
      const dataCell = r[0];
      const data = dataCell instanceof Date ? dataCell : new Date(dataCell);
      const vendedorId = r[8] || '';
      const valor = Number(r[6]) || 0;
      const comissao = Number(r[7]) || 0;

      if (usuario.tipo === 'Admin' || vendedorId === usuario.id) {
        totalVendas += valor;
        totalComissao += comissao;

        if (historico.length < 5) {
          historico.push({
            data: Utilities.formatDate(data, tz, 'MM/dd/yyyy'),
            valor: Number(valor).toFixed(2),
            vendedor: vendedorId || ''
          });
        }

        const key = data.getFullYear() + '-' + ('0' + (data.getMonth() + 1)).slice(-2);
        monthly[key] = (monthly[key] || 0) + valor;
      }
    }

    const graficoVendas = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - m, 1);
      const key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      const label = Utilities.formatDate(d, tz, 'MMM/yy');
      graficoVendas.push([label, Number(monthly[key] || 0)]);
    }

    const statusCounts = { 'Aberto': 0, 'Proposta Enviada': 0, 'Fechado (Venda)': 0, 'Perdido': 0 };
    for (let i = 1; i < orc.length; i++) {
      const r = orc[i];
      const status = String(r[9] || 'Aberto');
      const vendedorId = r[2] || '';
      const responsavel = r[3] || '';
      if (usuario.tipo === 'Admin' || vendedorId === usuario.id || responsavel === usuario.nome) {
        if (statusCounts[status] != null) statusCounts[status]++;
      }
    }
    const graficoOrcamentos = Object.keys(statusCounts).map(k => [k, statusCounts[k]]);
    const totalOrcamentos = (statusCounts['Aberto'] || 0) + (statusCounts['Proposta Enviada'] || 0);

    return {
      nome: usuario.nome,
      totalVendas: Number(totalVendas.toFixed(2)),
      totalComissao: Number(totalComissao.toFixed(2)),
      totalOrcamentos: totalOrcamentos,
      historico: historico,
      graficoVendas: graficoVendas,
      graficoOrcamentos: graficoOrcamentos
    };
  } catch (e) {
    Logger.log('❌ Erro em obterDadosDashboard: ' + e);
    return { erro: true, mensagem: e.message };
  }
}

// ===============================================================
// SETUP INICIAL DO SISTEMA
// ===============================================================

function setupInicial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  criarOuConfigurarVendas_(ss);
  criarOuConfigurarOrcamentos_(ss);
  criarOuConfigurarUsuarios_(ss);
  criarOuConfigurarConfig_(ss);
  criarOuConfigurarAuditoria_(ss);

  SpreadsheetApp.flush();
  Logger.log('✅ Setup concluído com sucesso.');
}

function criarOuConfigurarVendas_(ss) {
  const sh = obterOuCriarAbaComLogs(ss, NOME_ABA_VENDAS);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 10).setValues([[
      'DATE', 'TYPE', 'CLIENT NAME', 'BUSINESS NAME', 'INVOICE #',
      'PRODUCT DESCRIPTION', 'AMOUNT ($)', '% OF SALES ($)', 'SELLER_ID', 'CREATED_BY'
    ]]);
  }

  sh.getRange('A2:A').setNumberFormat('mm/dd/yyyy');
  sh.getRange('G2:H').setNumberFormat('$#,##0.00');

  const ruleType = SpreadsheetApp.newDataValidation()
    .requireValueInList(['New', 'Old', 'Walk-in'], true)
    .setAllowInvalid(false)
    .build();
  sh.getRange('B2:B').setDataValidation(ruleType);

  protegerCabecalho_(sh, 1);
}

function criarOuConfigurarOrcamentos_(ss) {
  const sh = obterOuCriarAbaComLogs(ss, NOME_ABA_ORCAMENTOS);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 18).setValues([[
      'ID', 'DATA_CRIACAO', 'ORIGEM', 'CRIADO_POR', 'CLIENTE',
      'EMAIL', 'TELEFONE', 'DESCRICAO', 'VALOR', 'STATUS',
      'DATA_ENVIO', 'ULTIMO_CONTATO', 'MSG_ENVIADAS', 'LIGACOES_FEITAS',
      'RESP_POS', 'RESP_NEG', 'MOTIVO_PERDA', 'OBSERVACOES'
    ]]);
  }

  sh.getRange('B2:B').setNumberFormat('dd/mm/yyyy');
  sh.getRange('I2:I').setNumberFormat('$#,##0.00');

  const ruleStatus = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Aberto', 'Proposta Enviada', 'Fechado', 'Fechado (Venda)', 'Perdido'], true)
    .setAllowInvalid(false)
    .build();
  sh.getRange('J2:J').setDataValidation(ruleStatus);

  protegerCabecalho_(sh, 1);
}

function criarOuConfigurarUsuarios_(ss) {
  const sh = obterOuCriarAbaComLogs(ss, NOME_ABA_USUARIOS);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 8).setValues([[
      'USER_ID', 'NOME', 'TIPO', 'EMAIL', 'TELEFONE', 'PIN', 'COMISSAO', 'STATUS'
    ]]);
  }

  sh.getRange('G2:G').setNumberFormat('0.00%');

  const ruleTipo = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Admin', 'Vendedor', 'Vendas', 'Funcionario', 'Afiliado'], true)
    .setAllowInvalid(false)
    .build();
  sh.getRange('C2:C').setDataValidation(ruleTipo);

  const ruleStatus = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Ativo', 'Inativo'], true)
    .setAllowInvalid(false)
    .build();
  sh.getRange('H2:H').setDataValidation(ruleStatus);

  protegerCabecalho_(sh, 1);
}

function criarOuConfigurarConfig_(ss) {
  const sh = obterOuCriarAbaComLogs(ss, NOME_ABA_CONFIG);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 2).setValues([['CHAVE', 'VALOR']]);
    sh.appendRow(['PRAZO_ORC_ANTIGO_DIAS', 15]);
    sh.appendRow(['EMPRESA_NOME', 'F/Design Solutions']);
    sh.appendRow(['EMPRESA_ENDERECO', 'Newark, NJ']);
  }

  protegerCabecalho_(sh, 1);
}

function criarOuConfigurarAuditoria_(ss) {
  const sh = obterOuCriarAbaComLogs(ss, NOME_ABA_AUDITORIA);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 5).setValues([[
      'TIMESTAMP', 'USUARIO', 'ACAO', 'DETALHES', 'IP'
    ]]);
  }

  sh.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  protegerCabecalho_(sh, 1);
}

function protegerCabecalho_(sheet, numLinhas) {
  try {
    const range = sheet.getRange(1, 1, numLinhas, sheet.getMaxColumns());
    const protection = range.protect().setDescription('Cabeçalho protegido');

    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  } catch (e) {
    Logger.log('⚠️ Não foi possível proteger cabeçalho: ' + e);
  }
}

// ===============================================================
// UTILITÁRIOS
// ===============================================================

function getConfigValue_(chave, valorPadrao) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = obterAbaComLogs(ss, NOME_ABA_CONFIG);

    if (!sh) return valorPadrao;

    const values = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 2).getValues();
    const row = values.find(r => String(r[0]).trim() === String(chave));

    return row ? row[1] : valorPadrao;
  } catch (e) {
    Logger.log('⚠️ Erro ao obter configuração: ' + e);
    return valorPadrao;
  }
}

function registrarAuditoria_(acao, detalhes) {
  try {
    const usuario = obterSessaoAtiva();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = obterAbaComLogs(ss, NOME_ABA_AUDITORIA);

    if (!sh) return;

    sh.appendRow([
      new Date(),
      usuario ? usuario.nome : 'Sistema',
      acao,
      detalhes || '',
      Session.getTemporaryActiveUserKey()
    ]);
  } catch (e) {
    Logger.log('⚠️ Erro ao registrar auditoria: ' + e);
  }
}

// ===============================================================
// INICIALIZAÇÃO DO SISTEMA (PONTO DE ENTRADA PRINCIPAL)
// ===============================================================
function iniciarSistemaFDesign() {
  try {
    const sessao = obterSessaoAtiva();
    if (sessao && sessao.tipo) {
      Logger.log(`🔐 Sessão detectada para ${sessao.nome} (${sessao.tipo})`);
      abrirPainelPorTipo(sessao);
    } else {
      Logger.log("⚠️ Nenhuma sessão ativa — abrindo tela de login");
      abrirLoginSistema();
    }
  } catch (e) {
    Logger.log("❌ Erro ao iniciar sistema: " + e);
    abrirLoginSistema();
  }
}

// ===============================================================
// 🔐 AUTENTICAÇÃO MANUAL DE USUÁRIOS (Nova versão)
// ===============================================================
function loginManual(email, pin) {
  try {
    const usuarios = obterUsuariosModulo();
    const emailNormalizado = String(email).toLowerCase().trim();
    const pinNormalizado = String(pin).trim();

    const usuario = usuarios.find(u =>
      String(u.email).toLowerCase().trim() === emailNormalizado &&
      String(u.pin).trim() === pinNormalizado &&
      String(u.status).toLowerCase().trim() === "ativo"
    );

    if (!usuario) {
      Logger.log(`❌ Falha no login manual: ${emailNormalizado}`);
      return { success: false, message: "E-mail ou PIN incorretos" };
    }

    iniciarSessao(usuario);
    Logger.log("✅ Login manual bem-sucedido: " + usuario.nome);

    return {
      success: true,
      id: usuario.id,
      nome: usuario.nome,
      tipo: usuario.tipo,
      email: usuario.email,
      comissaoPadrao: usuario.comissao
    };

  } catch (erro) {
    Logger.log("❌ Erro no login manual: " + erro);
    return { success: false, message: "Erro interno ao tentar login" };
  }
}

// ===============================================================
// 🧾 MÓDULO DE ORÇAMENTOS
// ===============================================================

/**
 * Retorna todos os orçamentos vinculados ao vendedor logado
 * ou todos se for Admin/Gerente.
 */
function obterOrcamentosPorVendedor(nomeVendedor) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ORÇAMENTOS");
  if (!sh) {
    Logger.log("❌ Aba ORÇAMENTOS não encontrada.");
    return [];
  }

  const dados = sh.getDataRange().getValues();
  const lista = [];

  for (let i = 1; i < dados.length; i++) {
    const [numero, cliente, empresa, telefone, valor, status, vendedor] = dados[i];
    if (!numero) continue;

    if (!nomeVendedor || String(vendedor).trim().toLowerCase() === nomeVendedor.toLowerCase()) {
      lista.push({
        numero: String(numero),
        cliente: String(cliente || "-"),
        empresa: String(empresa || "-"),
        telefone: String(telefone || "-"),
        valor: valor || 0,
        status: String(status || "Aberto"),
        vendedor: String(vendedor || "-")
      });
    }
  }

  Logger.log(`✅ ${lista.length} orçamentos carregados para ${nomeVendedor}`);
  return lista;
}

// ===============================================================
// 📦 MÓDULO DE VENDAS E ORÇAMENTOS — F/DESIGN SOLUTIONS
// Integra: Client_List (vendas) e ORÇAMENTOS (orçamentos)
// ===============================================================

// ---------------------------------------------------------------
// 🧭 Função auxiliar — Gera ID único (VEN-0001 / ORC-0001)
// ---------------------------------------------------------------
function gerarIdUnico(prefixo) {
  const agora = new Date();
  const ano = agora.getFullYear().toString().slice(-2);
  const mes = (agora.getMonth() + 1).toString().padStart(2, "0");
  const dia = agora.getDate().toString().padStart(2, "0");
  const hora = agora.getHours().toString().padStart(2, "0");
  const min = agora.getMinutes().toString().padStart(2, "0");
  const seg = agora.getSeconds().toString().padStart(2, "0");
  return `${prefixo}-${ano}${mes}${dia}${hora}${min}${seg}`;
}

// ---------------------------------------------------------------
// 👤 Função auxiliar — Obtém o usuário logado
// ---------------------------------------------------------------
function obterUsuarioAtual() {
  try {
    const sessao = obterSessaoAtual && obterSessaoAtual();
    if (sessao && sessao.nome) return sessao.nome;
  } catch (e) {}
  return Session.getActiveUser().getEmail() || "Usuário desconhecido";
}

// ===============================================================
// 💾 REGISTRAR NOVA VENDA — v2.9 (numérico padronizado + autoria garantida)
// ===============================================================
function registrarVenda(dados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName("Client_List");
    if (!aba) throw new Error("Aba 'Client_List' não encontrada.");

    // ============================================================
    // 👤 Sessão e autoria (com fallback automático)
    // ============================================================
    const sessao = obterSessaoAtiva?.() || {};
    const usuarioAtivo = sessao.nome || sessao.email || Session.getActiveUser().getEmail() || "Sistema";
    const vendedorId = usuarioAtivo;
    const criadoPor = usuarioAtivo;

    // ============================================================
    // 🧾 ID e data
    // ============================================================
    const dataAtual = new Date();
    const timestamp = Utilities.formatDate(dataAtual, Session.getScriptTimeZone(), "ddMMyyyyHHmmss");
    const salesId = `VEN-${timestamp}`;

    // ============================================================
    // 💰 Cálculos financeiros (padronizados)
    // ============================================================
    const parseValor = v => parseFloat(v) || 0; // conversão segura
    const formatar2 = v => Number(v).toFixed(2); // padroniza 2 casas decimais

    const valorVenda = parseValor(dados.amount);
    const pago = parseValor(dados.paid);
    const saldo = parseValor(dados.balanceDue);

    let percentual = 0;
    const tipo = (dados.type || "").toString().trim().toUpperCase();
    if (tipo === "NEW") percentual = 0.10;
    else if (tipo === "OLD") percentual = 0.05;
    else if (tipo === "WALK-IN") percentual = 0.03;

    const valorComissao = valorVenda * percentual;
    const metodoPagamento = dados.payment || "";
    const status = dados.paymentStatus || "Pending";
    const anotacoes = dados.notes || "";

    // ============================================================
    // 🧩 ORDEM EXATA DAS COLUNAS NA ABA CLIENT_LIST
    // ============================================================
    const novaLinha = [
      salesId,                                     // A - SALES_ID
      dataAtual,                                   // B - DATE
      tipo,                                        // C - TYPE (forçado uppercase e sem espaços)
      status,                                      // D - STATUS
      formatar2(valorComissao),                    // E - COMMISSION VALUE
      dados.clientName,                            // F - CLIENT NAME
      dados.businessName,                          // G - BUSINESS NAME
      "",                                          // H - INVOICE #
      dados.product,                               // I - PRODUCT DESCRIPTION
      formatar2(valorVenda),                       // J - AMOUNT
      formatar2(saldo),                            // K - BALANCE DUE
      formatar2(pago),                             // L - AMOUNT PAID
      metodoPagamento,                             // M - PAYMENT METHOD
      anotacoes,                                   // N - NOTES
      `${(percentual * 100).toFixed(0)}%`,         // O - % OF SALES
      vendedorId,                                  // P - SELLER_ID
      criadoPor                                    // Q - CREATED_BY
    ];

    // ============================================================
    // ✍️ Registro na planilha
    // ============================================================
    aba.appendRow(novaLinha);

    Logger.log(`✅ Venda registrada (${salesId}) por ${usuarioAtivo}`);
    return {
      success: true,
      message: `✅ Sale registered successfully (ID: ${salesId}) by ${usuarioAtivo}`
    };

  } catch (erro) {
    Logger.log("❌ Erro ao registrar venda: " + erro);
    return { success: false, message: "Error registering sale: " + erro.message };
  }
}

// ===============================================================
// 🧪 TESTE MANUAL — Registrar Venda de Exemplo
// ===============================================================
function testeRegistrarVenda() {
  const dadosTeste = {
    type: "NEW",                       // tipo da venda
    clientName: "Cliente Teste Final", // nome do cliente
    businessName: "F/Design Solutions",// nome da empresa
    product: "Adesivo de Parede 3x2",  // produto
    amount: 800,                       // valor total da venda
    paid: 200,                         // valor pago
    balanceDue: 600,                   // saldo restante
    payment: "Cash",                   // método de pagamento
    paymentStatus: "Half Payment",     // status do pagamento
    notes: "Teste manual via Apps Script" // observações
  };

  const resultado = registrarVenda(dadosTeste);
  Logger.log(resultado);
}

// ---------------------------------------------------------------
// 🧾 Registrar Orçamento — grava em ORÇAMENTOS
// ---------------------------------------------------------------
function registrarOrcamento(dados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("ORÇAMENTOS");
  if (!sh) return { success: false, message: "Aba ORÇAMENTOS não encontrada." };

  const id = gerarIdUnico("ORC");
  const vendedor = obterUsuarioAtual();
  const data = new Date();

  const novaLinha = [
    id,
    data,
    vendedor,
    dados.cliente || "",
    dados.empresa || "",
    dados.produto || "",
    parseFloat(dados.valor) || 0,
    "Open",
    0,
    "",
    "",
    `Quote created by ${vendedor} on ${data.toLocaleString()}`
  ];

  sh.appendRow(novaLinha);
  return { success: true, id, message: "Orçamento registrado com sucesso." };
}

// ---------------------------------------------------------------
// 💾 Salvar Novo Orçamento — v2.0 (compatível com layout atualizado)
// ---------------------------------------------------------------
// ===============================================================
// 💾 Salvar novo orçamento (ORÇAMENTOS)
// ===============================================================
function salvarOrcamento(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ORÇAMENTOS");

    if (!sheet) throw new Error("Aba 'ORÇAMENTOS' não encontrada.");

    const lastRow = sheet.getLastRow();
    const nextId = "ORC-" + String(lastRow).padStart(3, "0");
    const dataCriacao = new Date();

    const novaLinha = [
      nextId,
      dataCriacao,
      formData.origem || "",
      Session.getActiveUser().getEmail(),
      formData.clienteNome || "",
      formData.clienteEmail || "",
      formData.clienteTel || "",
      formData.descricao || "",
      Number(formData.valorEstimado) || 0,
      "Em Aberto",
      "", "", "", "", "", "", "", "" // demais colunas da planilha
    ];

    sheet.appendRow(novaLinha);
    return { status: "ok", id: nextId };
  } catch (e) {
    Logger.log("❌ Erro ao salvar orçamento: " + e.message);
    throw e;
  }
}

// ---------------------------------------------------------------
// 🔍 Buscar Vendas (Client_List) — filtros opcionais
// ---------------------------------------------------------------
function buscarVendas(filtros) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Client_List");
  if (!sh) return [];

  const dados = sh.getDataRange().getValues();
  const cab = dados.shift();

  const { nome, empresa, invoice, produto } = filtros;
  const filtrados = dados.filter(l =>
    (!nome || (l[3] || "").toLowerCase().includes(nome.toLowerCase())) &&
    (!empresa || (l[4] || "").toLowerCase().includes(empresa.toLowerCase())) &&
    (!invoice || (l[0] || "").toLowerCase().includes(invoice.toLowerCase())) &&
    (!produto || (l[5] || "").toLowerCase().includes(produto.toLowerCase()))
  );

  return filtrados.map(l => ({
    id: l[0],
    data: l[1],
    vendedor: l[2],
    cliente: l[3],
    empresa: l[4],
    produto: l[5],
    valor: l[6],
    status: l[7],
    tentativas: l[8],
    pagamentos: l[9],
    ultimaAtualizacao: l[10],
    log: l[11]
  }));
}

// ---------------------------------------------------------------
// 🔍 Buscar Orçamentos — filtros opcionais
// ---------------------------------------------------------------
function buscarOrcamentos(filtros) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("ORÇAMENTOS");
  if (!sh) return [];

  const dados = sh.getDataRange().getValues();
  const cab = dados.shift();

  const { nome, empresa, invoice, produto } = filtros;
  const filtrados = dados.filter(l =>
    (!nome || (l[3] || "").toLowerCase().includes(nome.toLowerCase())) &&
    (!empresa || (l[4] || "").toLowerCase().includes(empresa.toLowerCase())) &&
    (!invoice || (l[0] || "").toLowerCase().includes(invoice.toLowerCase())) &&
    (!produto || (l[5] || "").toLowerCase().includes(produto.toLowerCase()))
  );

  return filtrados.map(l => ({
    id: l[0],
    data: l[1],
    vendedor: l[2],
    cliente: l[3],
    empresa: l[4],
    produto: l[5],
    valor: l[6],
    status: l[7],
    tentativas: l[8],
    pagamentos: l[9],
    ultimaAtualizacao: l[10],
    log: l[11]
  }));
}

// ---------------------------------------------------------------
// ☎️ Registrar Tentativa de Contato (Client_List)
// ---------------------------------------------------------------
function registrarTentativaContato(id, tipo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Client_List");
  const dados = sh.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === id) {
      const tentativas = (dados[i][8] || 0) + 1;
      const vendedor = obterUsuarioAtual();
      const logMsg = `Contact attempt (${tipo}) by ${vendedor} — ${new Date().toLocaleString()}`;

      sh.getRange(i + 1, 9).setValue(tentativas);
      sh.getRange(i + 1, 11).setValue(new Date());
      sh.getRange(i + 1, 12).setValue(logMsg);
      return { success: true, tentativas };
    }
  }
  return { success: false, message: "Venda não encontrada." };
}

// ---------------------------------------------------------------
// 💳 Registrar Pagamento Parcial — abate do total (Client_List)
// ---------------------------------------------------------------
function registrarPagamento(id, valor, metodo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Client_List");
  const dados = sh.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === id) {
      const pagos = parseFloat(dados[i][9]) || 0;
      const novoTotal = pagos + parseFloat(valor);
      const vendedor = obterUsuarioAtual();

      const logMsg = `Payment of $${valor} via ${metodo} — ${vendedor} — ${new Date().toLocaleString()}`;
      sh.getRange(i + 1, 10).setValue(novoTotal);
      sh.getRange(i + 1, 11).setValue(new Date());
      sh.getRange(i + 1, 12).setValue(logMsg);

      return { success: true, total: novoTotal };
    }
  }
  return { success: false, message: "Venda não encontrada." };
}

// ---------------------------------------------------------------
// 🔁 Converter Orçamento em Venda
// ---------------------------------------------------------------
function converterOrcamentoParaVenda(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shOrc = ss.getSheetByName("ORÇAMENTOS");
  const shVend = ss.getSheetByName("Client_List");
  const dados = shOrc.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === id) {
      const linha = dados[i];
      const vendedor = obterUsuarioAtual();
      const novaVenda = [
        gerarIdUnico("VEN"),
        new Date(),
        vendedor,
        linha[3], // cliente
        linha[4], // empresa
        linha[5], // produto
        linha[6], // valor
        "Pending",
        0,
        "",
        "",
        `Converted from ${id} by ${vendedor} — ${new Date().toLocaleString()}`
      ];
      shVend.appendRow(novaVenda);

      // Atualiza status do orçamento original
      shOrc.getRange(i + 1, 8).setValue("Converted to Sale");
      return { success: true, idVenda: novaVenda[0] };
    }
  }
  return { success: false, message: "Orçamento não encontrado." };
}

// ===============================
// 🔹 SELLER PANEL: SUB-SCREENS
// ===============================
function abrirHomeVendedor() {
  const html = HtmlService.createHtmlOutputFromFile('homeVendedor')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'F/Design Solutions');
}

function abrirFormQuote() {
  const html = HtmlService.createHtmlOutputFromFile("formQuote")
    .setWidth(1200)
    .setHeight(800)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME); // 🔥 garante acesso aos métodos Apps Script
  SpreadsheetApp.getUi().showModalDialog(html, "New Quote — F/Design Solutions");
}

function abrirFormVendas() {
  const html = HtmlService.createTemplateFromFile("formVendas").evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(1000).setHeight(720), "New Sale — F/Design Solutions");
}

// ===============================================================
// 🏠 Função para abrir o painel principal (homeFDesign.html)
// ===============================================================
function abrirHomeFDesign() {
  const html = HtmlService.createHtmlOutputFromFile('homeFDesign')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, 'F/Design Solutions');
}


function abrirDashboardVendas() {
  const html = HtmlService.createTemplateFromFile("dashboardVendas").evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(1100).setHeight(720), "Sales Dashboard — F/Design Solutions");
}

function abrirFormGerenciar() {
  const html = HtmlService.createTemplateFromFile("orcamentosDashboard").evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(1100).setHeight(720), "Quotes — F/Design Solutions");
}

function abrirPainelAdmin() {
  const html = HtmlService.createTemplateFromFile("painelAdmin").evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(1200).setHeight(720), "Admin Panel — F/Design Solutions");
}

// ===============================
// 🔹 FORMATAR A PLANILHA
// ===============================


function formatarPlanilhaVendas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Client_List");
  if (!sh) return;

  const ultimaColuna = sh.getLastColumn();

  // 🧱 Cabeçalho
  const header = sh.getRange(1, 1, 1, ultimaColuna);
  header.setBackground("#1e293b")
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setHorizontalAlignment("center");

  // 🧽 Remove banding antigo
  sh.getBandings().forEach(b => b.remove());

  // 🪶 Linhas alternadas
  const dados = sh.getRange(2, 1, sh.getMaxRows() - 1, ultimaColuna);
  dados.applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false);

  // 💰 Formatação monetária
  sh.getRange("J2:K").setNumberFormat("$#,##0.00");

  // 📅 Datas
  sh.getRange("B2:B").setNumberFormat("mm/dd/yyyy hh:mm:ss");

  // 📊 Centralizar status e tipo
  sh.getRange("C2:D").setHorizontalAlignment("center");

  // 🧱 Congelar cabeçalho
  sh.setFrozenRows(1);

  // 🔒 Proteção leve e segura
  const userEmail = Session.getActiveUser().getEmail();
  const colunasProtegidas = [1, 2, 14, 15]; // SALES_ID, DATE, SELLER_ID, CREATED_BY

  // remove proteções antigas nessas colunas
  const protecoesExistentes = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  protecoesExistentes.forEach(p => {
    const col = p.getRange().getColumn();
    if (colunasProtegidas.includes(col)) {
      p.remove();
    }
  });

  // cria novas proteções sem remover o dono
  colunasProtegidas.forEach(col => {
    const range = sh.getRange(2, col, sh.getMaxRows() - 1);
    const protection = range.protect().setDescription("Protected by F/Design System");

    // Garante que o usuário atual sempre permaneça com acesso
    const editors = protection.getEditors();
    editors.forEach(editor => {
      const editorEmail = editor.getEmail();
      if (editorEmail && editorEmail !== userEmail) {
        try {
          protection.removeEditor(editor);
        } catch (e) {
          Logger.log(`⚠️ Não foi possível remover ${editorEmail}: ${e.message}`);
        }
      }
    });

    // Garante que você está como editor
    if (!protection.getEditors().some(e => e.getEmail() === userEmail)) {
      protection.addEditor(userEmail);
    }
  });

  Logger.log("✅ Planilha formatada e protegida com sucesso (sem erros de permissão ou banding)");
}


function atualizarEstruturaVendas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Client_List");
  if (!sh) return;

  const cabecalho = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

  // Se "BALANCE DUE" ainda não existe, adiciona logo após a coluna "AMOUNT"
  if (!cabecalho.includes("BALANCE DUE")) {
    const colAmount = cabecalho.indexOf("AMOUNT");
    if (colAmount !== -1) {
      sh.insertColumnAfter(colAmount + 1);
      sh.getRange(1, colAmount + 2).setValue("BALANCE DUE");
      Logger.log("✅ Coluna 'BALANCE DUE' adicionada após 'AMOUNT'");
    }
  }

  // Atualiza formatação e executa novamente a formatação geral
  formatarPlanilhaVendas();
}

// Mantém a sessão viva para evitar logout automático
function keepAlive() {
  return true;
}

