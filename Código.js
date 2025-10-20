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
const NOME_ABA_VENDAS = 'TABLEA DE VENDAS';
const NOME_ABA_ORCAMENTOS = 'ORÇAMENTOS';
const NOME_ABA_ORCAMENTOS_FALLBACK = 'TABLEA DE ORCAMENTOS';
const NOME_ABA_CLIENT_LIST = 'Client_List';
const NOME_ABA_CONFIG = 'CONFIG';
const NOME_ABA_AUDITORIA = 'AUDITORIA';
const NOME_ABA_DASHBOARD_DATA = 'DASHBOARD_DATA';
const NOME_ABA_SISTEMA = 'SISTEMA';

/**
 * Busca uma aba pelo nome emitindo logs detalhados para facilitar a auditoria.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} nomeAba
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null}
 */
function obterAbaComLogs(ss, nomeAba) {
  console.log(`🔍 Buscando aba: ${nomeAba}`);
  const sheet = ss.getSheetByName(nomeAba);
  if (!sheet) {
    console.error(`❌ Aba não encontrada: ${nomeAba}`);
    return null;
  }
  console.log(`✅ Aba carregada: ${sheet.getName()} (${sheet.getLastRow()} linhas)`);
  return sheet;
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

function loginManual(email, pin) {
  try {
    const usuarios = obterUsuariosModulo();
    const usuario = usuarios.find(
      u => u.email === email && u.pin === pin && u.status === "Ativo"
    );

    if (!usuario) return { success: false, message: "E-mail ou PIN incorretos" };

    iniciarSessao(usuario);
    Logger.log("✅ Login manual bem-sucedido: " + usuario.nome);
    return { success: true, type: usuario.tipo, name: usuario.nome };
  } catch (erro) {
    Logger.log("❌ Erro no login manual: " + erro);
    return { success: false, message: "Erro interno ao tentar login" };
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

function abrirPainelAdmin() {
  const html = HtmlService.createTemplateFromFile("painelAdmin").evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(1300).setHeight(750), "Painel Administrativo — F/Design Solutions");
}

function abrirPainelVendas() {
  const html = HtmlService.createTemplateFromFile("dashboardVendas").evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(1200).setHeight(720), "Painel de Vendas — F/Design Solutions");
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

/**
 * Calcula todas as métricas analíticas de um usuário
 */
function calcularMetricasUsuario(userId, budgets, sales) {
  try {
    // Filtra dados do usuário
    const userBudgets = budgets.filter(b => 
      b.criadoPor === userId || b.vendedorId === userId
    );
    
    const userSales = sales.filter(s => 
      s.vendedorId === userId
    );
    
    // === MÉTRICAS DIRETAS ===
    
    // Comunicação
    const totalMensagens = userBudgets.reduce((sum, b) => 
      sum + (parseInt(b.mensagens) || 0), 0
    );
    const totalLigacoes = userBudgets.reduce((sum, b) => 
      sum + (parseInt(b.ligacoes) || 0), 0
    );
    
    // Efetividade
    const totalRespPos = userBudgets.reduce((sum, b) => 
      sum + (parseInt(b.respPos) || 0), 0
    );
    const totalRespNeg = userBudgets.reduce((sum, b) => 
      sum + (parseInt(b.respNeg) || 0), 0
    );
    
    // Conversão
    const totalOrcamentos = userBudgets.length;
    const orcamentosFechados = userBudgets.filter(b => 
      b.status === 'Fechado' || b.status === 'Fechado (Venda)'
    ).length;
    const taxaConversao = totalOrcamentos > 0 
      ? ((orcamentosFechados / totalOrcamentos) * 100).toFixed(1)
      : 0;
    
    // Financeiro
    const totalVendas = userSales.reduce((sum, s) => sum + s.valor, 0);
    const totalComissao = userSales.reduce((sum, s) => sum + s.comissao, 0);
    const valorMedioVenda = userSales.length > 0 
      ? totalVendas / userSales.length 
      : 0;
    
    // === MÉTRICAS DERIVADAS ===
    
    // OEI - Operational Engagement Index
    const oei = totalOrcamentos > 0 
      ? ((totalMensagens + totalLigacoes) / totalOrcamentos).toFixed(2)
      : 0;
    
    // CE - Conversion Efficiency
    const ce = taxaConversao;
    
    // PRR - Positive Response Rate
    const totalRespostas = totalRespPos + totalRespNeg;
    const prr = totalRespostas > 0 
      ? ((totalRespPos / totalRespostas) * 100).toFixed(1)
      : 0;
    
    // HP - Hourly Profitability (simplificado - assumindo 160h/mês)
    const horasTrabalhadas = 160; // Pode ser ajustado
    const hp = horasTrabalhadas > 0 
      ? ((totalVendas - totalComissao) / horasTrabalhadas).toFixed(2)
      : 0;
    
    // NEP - Net Economic Performance
    const nep = (totalVendas - totalComissao).toFixed(2);
    
    return {
      communication: {
        messages: totalMensagens,
        calls: totalLigacoes,
        total: totalMensagens + totalLigacoes
      },
      effectiveness: {
        respPos: totalRespPos,
        respNeg: totalRespNeg,
        prr: parseFloat(prr)
      },
      conversion: {
        totalBudgets: totalOrcamentos,
        converted: orcamentosFechados,
        rate: parseFloat(taxaConversao)
      },
      financial: {
        avgSaleValue: parseFloat(valorMedioVenda.toFixed(2)),
        totalRevenue: parseFloat(totalVendas.toFixed(2)),
        totalCommission: parseFloat(totalComissao.toFixed(2)),
        profitabilityPerHour: parseFloat(hp)
      },
      derived: {
        oei: parseFloat(oei),
        ce: parseFloat(ce),
        hp: parseFloat(hp),
        prr: parseFloat(prr),
        nep: parseFloat(nep)
      }
    };
  } catch (err) {
    Logger.log('❌ Erro ao calcular métricas de usuário: ' + err);
    return null;
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
    const sheetVendas = obterAbaComLogs(ss, NOME_ABA_VENDAS);

    // Prioriza ORÇAMENTOS, fallback para TABLEA DE ORCAMENTOS
    const sheetOrcamentosPrimario = obterAbaComLogs(ss, NOME_ABA_ORCAMENTOS);
    const sheetOrcamentos = sheetOrcamentosPrimario || obterAbaComLogs(ss, NOME_ABA_ORCAMENTOS_FALLBACK);
    if (!sheetOrcamentosPrimario && sheetOrcamentos) {
      console.warn(`ℹ️ Utilizando aba fallback: ${NOME_ABA_ORCAMENTOS_FALLBACK}`);
    }

    const sheetConfig = obterAbaComLogs(ss, NOME_ABA_CONFIG);

    if (!sheetUsuarios) throw new Error("Aba 'USUARIOS' não encontrada.");
    
    const safe = v => (v === undefined || v === null ? '' : v);
    
    // === USERS (Base) ===
    const usersBase = sheetUsuarios.getLastRow() > 1
      ? sheetUsuarios.getRange(2, 1, sheetUsuarios.getLastRow() - 1, 8).getValues()
          .filter(r => r[0])
          .map(r => ({
            id: safe(r[0]),
            nome: safe(r[1]),
            tipo: safe(r[2]),
            email: safe(r[3]),
            telefone: safe(r[4]),
            pin: safe(r[5]),
            comissao: parseFloat(r[6]) || 0,
            status: safe(r[7]) || "Inativo"
          }))
      : [];
    
    // === BUDGETS (Enhanced) ===
    const budgets = sheetOrcamentos && sheetOrcamentos.getLastRow() > 1
      ? sheetOrcamentos
          .getRange(2, 1, sheetOrcamentos.getLastRow() - 1, 18)
          .getValues()
          .filter(r => r[0])
          .map(r => ({
            id: safe(r[0]),
            dataCriacao: formatarData(r[1]),
            origem: safe(r[2]),
            criadoPor: safe(r[3]),
            cliente: safe(r[4]),
            email: safe(r[5]),
            telefone: safe(r[6]),
            descricao: safe(r[7]),
            valor: parseFloat(String(r[8]).replace(/[^0-9.-]+/g, '')) || 0,
            status: safe(r[9]),
            dataEnvio: formatarData(r[10]),
            ultimoContato: formatarData(r[11]),
            mensagens: safe(r[12]),
            ligacoes: safe(r[13]),
            respPos: safe(r[14]),
            respNeg: safe(r[15]),
            motivoPerda: safe(r[16]),
            obs: safe(r[17]),
            vendedorId: safe(r[3]) // Assume criadoPor como vendedor
          }))
      : [];
    
    // === SALES (Enhanced) ===
    const sales = sheetVendas && sheetVendas.getLastRow() > 1
      ? sheetVendas
          .getRange(2, 1, sheetVendas.getLastRow() - 1, 10)
          .getValues()
          .filter(r => r[0])
          .map(r => ({
            data: formatarData(r[0]),
            tipo: safe(r[1]),
            cliente: safe(r[2]),
            empresa: safe(r[3]),
            invoice: safe(r[4]),
            produto: safe(r[5]),
            valor: parseFloat(String(r[6]).replace(/[^0-9.-]+/g, '')) || 0,
            comissao: parseFloat(String(r[7]).replace(/[^0-9.-]+/g, '')) || 0,
            vendedorId: safe(r[8]),
            criadoPor: safe(r[9]) // Novo campo para manter o responsável pelo registro
          }))
      : [];
    
    // === CALCULA MÉTRICAS ANALÍTICAS PARA CADA USUÁRIO ===
    const users = usersBase.map(user => {
      const metrics = calcularMetricasUsuario(user.id, budgets, sales);
      return {
        ...user,
        metrics: metrics
      };
    });
    
    // === ENRIQUECE BUDGETS COM MÉTRICAS ===
    const budgetsEnhanced = budgets.map(b => calcularMetricasOrcamento(b));
    
    // === ENRIQUECE SALES COM MÉTRICAS ===
    const salesEnhanced = sales.map(s => calcularMetricasVenda(s, budgets));
    
    // === REPORTS (KPIs Globais) ===
    const totalVendas = sales.reduce((a, s) => a + s.valor, 0);
    const totalComissoes = sales.reduce((a, s) => a + s.comissao, 0);
    const orcamentosAbertos = budgets.filter(o => 
      o.status === "Aberto" || o.status === "Proposta Enviada"
    ).length;
    const vendedoresAtivos = users.filter(u => u.status === "Ativo").length;
    const taxaConversao = budgets.length > 0
      ? ((sales.length / budgets.length) * 100).toFixed(1)
      : "0";
    
    const reports = {
      kpis: {
        totalVendas: parseFloat(totalVendas.toFixed(2)),
        totalComissoes: parseFloat(totalComissoes.toFixed(2)),
        orcamentosAbertos,
        vendedoresAtivos,
        taxaConversao: parseFloat(taxaConversao)
      },
      grafVendasPorTipo: [["Tipo", "Valor"]].concat(
        Object.entries(
          sales.reduce((acc, v) => {
            acc[v.tipo] = (acc[v.tipo] || 0) + v.valor;
            return acc;
          }, {})
        )
      ),
      grafOrcPorStatus: [["Status", "Quantidade"]].concat(
        Object.entries(
          budgets.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
          }, {})
        )
      )
    };
    
    // === SETTINGS ===
    const settings = sheetConfig
      ? Object.fromEntries(
          sheetConfig.getDataRange().getValues()
            .filter(r => r[0])
            .map(r => [r[0], r[1]])
        )
      : {};
    
    const result = {
      success: true,
      data: {
        users: users,
        budgets: budgetsEnhanced,
        sales: salesEnhanced,
        reports: reports,
        settings: settings
      }
    };
    
    Logger.log('✅ Dados administrativos carregados com sucesso (v2.0)');
    return result;
    
  } catch (e) {
    Logger.log("❌ Erro em obterDadosAdmin: " + e);
    return { success: false, message: e.message };
  }
}

// ===============================================================
// VENDAS — CRUD COMPLETO (Mantido da versão anterior)
// ===============================================================

function registrarVenda(dados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaComLogs(ss, NOME_ABA_CLIENT_LIST);

    if (!aba) {
      throw new Error(`Aba de vendas não encontrada (${NOME_ABA_CLIENT_LIST}).`);
    }

    if (!dados || !dados.tipo || !dados.cliente || !dados.invoice) {
      throw new Error('Campos obrigatórios não preenchidos.');
    }

    const sessao = obterSessaoAtiva();
    const vendedorId = sessao?.id || '';
    const criadoPor = sessao?.email || sessao?.nome || sessao?.id || 'Sistema';
    // Garante que as colunas SELLER_ID e CREATED_BY sejam preenchidas conforme planilha real

    const proximaLinha = aba.getLastRow() + 1;
    let percentual = 0;

    if (dados.tipo === 'New') percentual = 0.30;
    else if (dados.tipo === 'Old') percentual = 0.20;
    else if (dados.tipo === 'Walk-in') percentual = 0.10;

    const valorVenda = Number(dados.valor) || 0;
    const valorComissao = valorVenda * percentual;

    const novaLinha = [
      new Date(),
      dados.tipo,
      dados.cliente,
      dados.empresa || '',
      dados.invoice,
      dados.produto || '',
      valorVenda,
      valorComissao,
      vendedorId,
      criadoPor
    ];

    aba.getRange(proximaLinha, 1, 1, novaLinha.length).setValues([novaLinha]);

    Logger.log(`✅ Venda registrada na linha ${proximaLinha}`);
    return '✅ Venda registrada com sucesso!';
  } catch (erro) {
    Logger.log('❌ Erro ao registrar venda: ' + erro);
    throw new Error('Erro ao registrar venda: ' + erro.message);
  }
}

function buscarVenda(invoice) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = obterAbaComLogs(ss, NOME_ABA_CLIENT_LIST);
    if (!aba) {
      throw new Error(`Aba de vendas não encontrada (${NOME_ABA_CLIENT_LIST}).`);
    }
    const dados = aba.getDataRange().getValues();
    const invoiceBusca = String(invoice).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    for (let i = 1; i < dados.length; i++) {
      const invoiceCelula = String(dados[i][4] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      if (invoiceCelula === invoiceBusca) {
        return {
          linha: i + 1,
          tipo: dados[i][1],
          cliente: dados[i][2],
          empresa: dados[i][3],
          invoice: dados[i][4],
          produto: dados[i][5],
          valor: dados[i][6],
          percentual: dados[i][7]
        };
      }
    }
    return null;
  } catch (erro) {
    throw new Error('Erro ao buscar venda: ' + erro.message);
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
