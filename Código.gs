// ===============================================================
// F/Design Solutions — Sistema Administrativo
// Backend unificado com validação, consolidação dinâmica e cache
// Compatível com Google Apps Script (ECMAScript 5)
// ===============================================================

var NOME_ABA_USUARIOS = 'USUARIOS';
var NOME_ABA_VENDAS = 'TABLEA DE VENDAS';
var NOME_ABA_ORCAMENTOS = 'ORÇAMENTOS';
var NOME_ABA_CONFIG = 'CONFIG';
var NOME_ABA_AUDITORIA = 'AUDITORIA';

var CACHE_EXPIRACAO_SEGUNDOS = 600;
var CACHE_KEYS = {
  USERS: 'FDESIGN_USERS',
  BUDGETS: 'FDESIGN_BUDGETS',
  SALES: 'FDESIGN_SALES',
  SETTINGS: 'FDESIGN_SETTINGS',
  REPORTS: 'FDESIGN_REPORTS'
};

var ABAS_PADRONIZADAS = [
  {
    nome: NOME_ABA_USUARIOS,
    headers: ['id', 'nome', 'tipo', 'email', 'telefone', 'pin', 'comissao', 'status']
  },
  {
    nome: NOME_ABA_VENDAS,
    headers: ['id', 'data', 'tipo', 'cliente', 'empresa', 'produto', 'valor', 'comissao', 'comissaoPercentual', 'vendedorId', 'vendedorNome', 'criadoPor', 'invoice', 'tentativasContato', 'valorPorHora']
  },
  {
    nome: NOME_ABA_ORCAMENTOS,
    headers: ['id', 'dataCriacao', 'tipo', 'cliente', 'email', 'telefone', 'descricao', 'valor', 'status', 'criadoPor', 'responsavelNome', 'mensagens', 'ligacoes', 'probabilidadeConversao', 'diasDecorridos', 'motivoPerda', 'obs']
  },
  {
    nome: NOME_ABA_CONFIG,
    headers: ['chave', 'valor']
  },
  {
    nome: NOME_ABA_AUDITORIA,
    headers: ['data', 'usuario', 'acao', 'detalhes', 'userKey']
  }
];

var HEADER_MAP_USERS = {
  'ID': 'id',
  'NOME': 'nome',
  'TIPO': 'tipo',
  'EMAIL': 'email',
  'TELEFONE': 'telefone',
  'PIN': 'pin',
  'COMISSAO': 'comissao',
  'COMISSÃO': 'comissao',
  'STATUS': 'status'
};

var HEADER_MAP_SALES = {
  'ID': 'id',
  'DATA': 'data',
  'TIPO': 'tipo',
  'CLIENTE': 'cliente',
  'EMPRESA': 'empresa',
  'PRODUTO': 'produto',
  'VALOR': 'valor',
  'COMISSAO': 'comissao',
  'COMISSÃO': 'comissao',
  'COMISSAOPERCENTUAL': 'comissaoPercentual',
  'COMISSÃO%': 'comissaoPercentual',
  'VENDEDORID': 'vendedorId',
  'VENDEDORID.': 'vendedorId',
  'VENDEDORNOME': 'vendedorNome',
  'CRIADOPOR': 'criadoPor',
  'INVOICE': 'invoice',
  'TENTATIVASCONTATO': 'tentativasContato',
  'VALORPORHORA': 'valorPorHora'
};

var HEADER_MAP_BUDGETS = {
  'ID': 'id',
  'DATACRIACAO': 'dataCriacao',
  'DATA CRIACAO': 'dataCriacao',
  'DATA DE CRIACAO': 'dataCriacao',
  'TIPO': 'tipo',
  'CLIENTE': 'cliente',
  'EMAIL': 'email',
  'TELEFONE': 'telefone',
  'DESCRICAO': 'descricao',
  'DESCRIÇÃO': 'descricao',
  'VALOR': 'valor',
  'STATUS': 'status',
  'CRIADOPOR': 'criadoPor',
  'RESPONSAVELNOME': 'responsavelNome',
  'RESPONSÁVELNOME': 'responsavelNome',
  'MENSAGENS': 'mensagens',
  'LIGACOES': 'ligacoes',
  'LIGAÇÕES': 'ligacoes',
  'PROBABILIDADECLONVERSAO': 'probabilidadeConversao',
  'PROBABILIDADECONVERSAO': 'probabilidadeConversao',
  'PROBABILIDADE DE CONVERSAO': 'probabilidadeConversao',
  'DIASDECORRIDOS': 'diasDecorridos',
  'DIAS DECORRIDOS': 'diasDecorridos',
  'MOTIVOPERDA': 'motivoPerda',
  'MOTIVO PERDA': 'motivoPerda',
  'OBS': 'obs'
};

var HEADER_MAP_SETTINGS = {
  'CHAVE': 'chave',
  'VALOR': 'valor'
};

function logWithTimestamp(message) {
  var tz = 'America/New_York';
  try {
    tz = Session.getScriptTimeZone();
  } catch (e) {
    tz = 'America/New_York';
  }
  var timestamp = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
  Logger.log(timestamp + ' ' + message);
}

function getOrCreateSheet(nome) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nome);
  if (!sheet) {
    logWithTimestamp('⚠️  Aba "' + nome + '" não encontrada. Criando automaticamente.');
    sheet = ss.insertSheet(nome);
  }
  var headers = null;
  for (var i = 0; i < ABAS_PADRONIZADAS.length; i++) {
    if (ABAS_PADRONIZADAS[i].nome === nome) {
      headers = ABAS_PADRONIZADAS[i].headers;
      break;
    }
  }
  if (headers && headers.length) {
    ensureHeaders(sheet, headers);
  }
  return sheet;
}

function ensureHeaders(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  var existing = range.getValues()[0];
  var updated = false;
  for (var i = 0; i < headers.length; i++) {
    var atual = existing[i] ? existing[i].toString().trim() : '';
    if (atual !== headers[i]) {
      existing[i] = headers[i];
      updated = true;
    }
  }
  if (updated) {
    range.setValues([existing]);
    logWithTimestamp('🛠️  Cabeçalhos atualizados na aba ' + sheet.getName());
  }
}

function obterAbaComLogs(ss, nome) {
  var sheet = ss.getSheetByName(nome);
  if (!sheet) {
    logWithTimestamp('⚠️  Aba ausente: ' + nome);
    return null;
  }
  var linhas = sheet.getLastRow();
  if (linhas <= 1) {
    logWithTimestamp('⚠️  Aba ' + nome + ' vazia. Apenas cabeçalhos encontrados.');
  } else {
    logWithTimestamp('🟢 Sheet ' + nome + ' carregada (' + linhas + ' linhas)');
  }
  return sheet;
}

function validarEstruturaAbas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var i = 0; i < ABAS_PADRONIZADAS.length; i++) {
    var def = ABAS_PADRONIZADAS[i];
    var sheet = ss.getSheetByName(def.nome);
    if (!sheet) {
      sheet = ss.insertSheet(def.nome);
      logWithTimestamp('⚠️  Aba criada automaticamente: ' + def.nome);
    }
    ensureHeaders(sheet, def.headers);
  }
  logWithTimestamp('✅ Todas as abas base foram verificadas com sucesso.');
}

function normalizeHeader(value) {
  return value ? value.toString().trim().toUpperCase() : '';
}

function readSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) {
    return { headers: [], rows: [] };
  }
  var headerRange = sheet.getRange(1, 1, 1, lastColumn);
  var dataRange = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn) : null;
  var headers = headerRange.getValues()[0];
  var values = dataRange ? dataRange.getValues() : [];
  return { headers: headers, rows: values };
}

function mapRowsToObjects(headers, rows, headerMap) {
  var normalizedHeaders = [];
  for (var i = 0; i < headers.length; i++) {
    normalizedHeaders[i] = normalizeHeader(headers[i]);
  }
  var data = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var obj = {};
    for (var c = 0; c < row.length; c++) {
      var headerKey = normalizedHeaders[c];
      var prop = headerMap && headerMap[headerKey] ? headerMap[headerKey] : headers[c];
      obj[prop] = row[c];
    }
    data.push(obj);
  }
  return data;
}

function getCacheData(key, buildFn) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(key);
  if (cached) {
    logWithTimestamp('⚡ Cache hit — ' + key + ' servido instantaneamente');
    return JSON.parse(cached);
  }
  logWithTimestamp('🧠 Cache miss — reconstruindo ' + key + '...');
  var freshData = buildFn();
  cache.put(key, JSON.stringify(freshData), CACHE_EXPIRACAO_SEGUNDOS);
  logWithTimestamp('✅ ' + key + ' armazenado em cache (expira em ' + CACHE_EXPIRACAO_SEGUNDOS + 's)');
  return freshData;
}

function invalidateCache(key) {
  var cache = CacheService.getScriptCache();
  cache.remove(key);
  logWithTimestamp('♻️ Cache invalidado para ' + key);
}

function invalidateAllCache() {
  var cache = CacheService.getScriptCache();
  cache.remove(CACHE_KEYS.USERS);
  cache.remove(CACHE_KEYS.BUDGETS);
  cache.remove(CACHE_KEYS.SALES);
  cache.remove(CACHE_KEYS.SETTINGS);
  cache.remove(CACHE_KEYS.REPORTS);
  logWithTimestamp('♻️ Todos os caches modulares foram limpos');
}

function buildUsers() {
  var start = new Date().getTime();
  var result = [];
  try {
    var sheet = getOrCreateSheet(NOME_ABA_USUARIOS);
    var data = readSheetData(sheet);
    result = mapRowsToObjects(data.headers, data.rows, HEADER_MAP_USERS);
    if (!result || result.length === 0) {
      logWithTimestamp('⚠️ Aba USUARIOS vazia — aplicando dados simulados.');
      result = [{ id: 'U001', nome: 'Demo User', tipo: 'Vendedor', status: 'Ativo' }];
    }
  } catch (e) {
    logWithTimestamp('❌ Erro ao construir usuários: ' + e);
    result = [{ id: 'U001', nome: 'Demo User', tipo: 'Vendedor', status: 'Ativo' }];
  }
  var elapsed = (new Date().getTime() - start) / 1000;
  logWithTimestamp('⏱ buildUsers() concluído em ' + elapsed.toFixed(2) + 's');
  return result;
}

function buildSales() {
  var start = new Date().getTime();
  var result = [];
  try {
    var sheet = getOrCreateSheet(NOME_ABA_VENDAS);
    var data = readSheetData(sheet);
    result = mapRowsToObjects(data.headers, data.rows, HEADER_MAP_SALES);
    if (!result || result.length === 0) {
      logWithTimestamp('⚠️ Aba TABLEA DE VENDAS vazia — aplicando dados simulados.');
      result = [{ id: 'S001', cliente: 'Test Client', valor: 150.0, vendedorNome: 'Demo User' }];
    }
  } catch (e) {
    logWithTimestamp('❌ Erro ao construir vendas: ' + e);
    result = [{ id: 'S001', cliente: 'Test Client', valor: 150.0, vendedorNome: 'Demo User' }];
  }
  var elapsed = (new Date().getTime() - start) / 1000;
  logWithTimestamp('⏱ buildSales() concluído em ' + elapsed.toFixed(2) + 's');
  return result;
}

function buildBudgets() {
  var start = new Date().getTime();
  var result = [];
  try {
    var sheet = getOrCreateSheet(NOME_ABA_ORCAMENTOS);
    var data = readSheetData(sheet);
    result = mapRowsToObjects(data.headers, data.rows, HEADER_MAP_BUDGETS);
    if (!result || result.length === 0) {
      logWithTimestamp('⚠️ Aba ORÇAMENTOS vazia — aplicando dados simulados.');
      result = [{ id: 'B001', cliente: 'Cliente Demo', valor: 320.0, status: 'Em análise' }];
    }
  } catch (e) {
    logWithTimestamp('❌ Erro ao construir orçamentos: ' + e);
    result = [{ id: 'B001', cliente: 'Cliente Demo', valor: 320.0, status: 'Em análise' }];
  }
  var elapsed = (new Date().getTime() - start) / 1000;
  logWithTimestamp('⏱ buildBudgets() concluído em ' + elapsed.toFixed(2) + 's');
  return result;
}

function buildSettings() {
  var start = new Date().getTime();
  var result = {};
  try {
    var sheet = getOrCreateSheet(NOME_ABA_CONFIG);
    var data = readSheetData(sheet);
    var entries = mapRowsToObjects(data.headers, data.rows, HEADER_MAP_SETTINGS);
    for (var i = 0; i < entries.length; i++) {
      var item = entries[i];
      if (item.chave) {
        result[item.chave] = item.valor;
      }
    }
    if (!entries || entries.length === 0) {
      logWithTimestamp('⚠️ Aba CONFIG vazia — aplicando parâmetros simulados.');
      result = { EMPRESA_NOME: 'F/Design Solutions', TAXA_COMISSAO: '0.10' };
    }
  } catch (e) {
    logWithTimestamp('❌ Erro ao construir configurações: ' + e);
    result = { EMPRESA_NOME: 'F/Design Solutions', TAXA_COMISSAO: '0.10' };
  }
  var elapsed = (new Date().getTime() - start) / 1000;
  logWithTimestamp('⏱ buildSettings() concluído em ' + elapsed.toFixed(2) + 's');
  return result;
}

function runIntegrityChecks(users, budgets, sales) {
  var warnings = [];
  try {
    var duplicatesUsers = detectarDuplicados(users, 'id');
    if (duplicatesUsers.length > 0) {
      var msgUsers = '⚠️ Integridade: ' + duplicatesUsers.length + ' IDs duplicados em USUARIOS';
      warnings.push(msgUsers);
      logWithTimestamp(msgUsers);
    }
    var duplicatesBudgets = detectarDuplicados(budgets, 'id');
    if (duplicatesBudgets.length > 0) {
      var msgBudgets = '⚠️ Integridade: ' + duplicatesBudgets.length + ' IDs duplicados em ORÇAMENTOS';
      warnings.push(msgBudgets);
      logWithTimestamp(msgBudgets);
    }
    var duplicatesSales = detectarDuplicados(sales, 'id');
    if (duplicatesSales.length > 0) {
      var msgSales = '⚠️ Integridade: ' + duplicatesSales.length + ' IDs duplicados em TABLEA DE VENDAS';
      warnings.push(msgSales);
      logWithTimestamp(msgSales);
    }
    adicionarAvisosCampos(budgets, ['cliente', 'valor', 'email'], 'ORÇAMENTOS', warnings);
    adicionarAvisosCampos(sales, ['cliente', 'valor'], 'TABLEA DE VENDAS', warnings);
    adicionarAvisosCampos(users, ['nome', 'status'], 'USUARIOS', warnings);
  } catch (e) {
    logWithTimestamp('⚠️ Falha ao executar verificações de integridade: ' + e);
  }
  return warnings;
}

function detectarDuplicados(lista, chave) {
  var encontrados = {};
  var duplicados = [];
  for (var i = 0; i < lista.length; i++) {
    var item = lista[i];
    var valor = item && item[chave] ? item[chave] : null;
    if (!valor) {
      continue;
    }
    var chaveNormalizada = valor.toString();
    if (encontrados[chaveNormalizada]) {
      duplicados.push(chaveNormalizada);
    } else {
      encontrados[chaveNormalizada] = true;
    }
  }
  return duplicados;
}

function adicionarAvisosCampos(lista, camposObrigatorios, nomeSheet, warnings) {
  for (var i = 0; i < lista.length; i++) {
    var item = lista[i];
    for (var j = 0; j < camposObrigatorios.length; j++) {
      var campo = camposObrigatorios[j];
      if (!item || !item[campo]) {
        var mensagem = '⚠️ Campo obrigatório ausente em ' + nomeSheet + ' linha ' + (i + 2) + ' — "' + campo + '"';
        warnings.push(mensagem);
        logWithTimestamp(mensagem);
      }
      if (campo === 'valor' && item && item[campo] && isNaN(parseFloat(item[campo]))) {
        var mensagemValor = '⚠️ Valor inválido em ' + nomeSheet + ' linha ' + (i + 2) + ' — campo valor';
        warnings.push(mensagemValor);
        logWithTimestamp(mensagemValor);
      }
    }
  }
}

function buildReports(users, budgets, sales, settings) {
  var start = new Date().getTime();
  var totalVendas = 0;
  var i;
  for (i = 0; i < sales.length; i++) {
    var valorVenda = parseFloat(sales[i].valor);
    if (!isNaN(valorVenda)) {
      totalVendas += valorVenda;
    }
  }
  var totalOrcamentos = budgets.length;
  var taxaConversao = totalOrcamentos > 0 ? (sales.length / totalOrcamentos) * 100 : 0;
  var warnings = runIntegrityChecks(users, budgets, sales);
  var reports = {
    kpis: {
      totalSales: totalVendas.toFixed(2),
      totalBudgets: totalOrcamentos,
      totalUsers: users.length,
      conversionRate: taxaConversao.toFixed(1) + '%',
      empresa: settings && settings.EMPRESA_NOME ? settings.EMPRESA_NOME : 'F/Design Solutions'
    },
    integrity: {
      warnings: warnings
    }
  };
  var elapsed = (new Date().getTime() - start) / 1000;
  logWithTimestamp('⏱ buildReports() concluído em ' + elapsed.toFixed(2) + 's');
  return reports;
}

function consolidarBanco() {
  var inicio = new Date().getTime();
  var users = getCacheData(CACHE_KEYS.USERS, buildUsers);
  var budgets = getCacheData(CACHE_KEYS.BUDGETS, buildBudgets);
  var sales = getCacheData(CACHE_KEYS.SALES, buildSales);
  var settings = getCacheData(CACHE_KEYS.SETTINGS, buildSettings);
  var reports = getCacheData(CACHE_KEYS.REPORTS, function () {
    return buildReports(users, budgets, sales, settings);
  });

  if (!users || users.length === 0) {
    users = [{ id: 'U001', nome: 'Demo User', tipo: 'Vendedor', status: 'Ativo' }];
  }
  if (!sales || sales.length === 0) {
    sales = [{ id: 'S001', cliente: 'Test Client', valor: 150.0, vendedorNome: 'Demo User' }];
  }
  if (!budgets || budgets.length === 0) {
    budgets = [{ id: 'B001', cliente: 'Cliente Demo', valor: 320.0, status: 'Em análise' }];
  }
  if (!settings) {
    settings = { EMPRESA_NOME: 'F/Design Solutions', TAXA_COMISSAO: '0.10' };
  }

  var tempoTotal = (new Date().getTime() - inicio) / 1000;
  logWithTimestamp('✅ consolidação concluída em ' + tempoTotal.toFixed(2) + 's');
  logWithTimestamp('✅ consolidação — usuários=' + users.length + ' | orçamentos=' + budgets.length + ' | vendas=' + sales.length);

  return {
    users: users,
    budgets: budgets,
    sales: sales,
    settings: settings,
    reports: reports
  };
}

function obterDadosAdmin() {
  try {
    var dados = consolidarBanco();
    logWithTimestamp('✅ Dados administrativos preparados com sucesso.');
    return {
      success: true,
      users: dados.users || [],
      budgets: dados.budgets || [],
      sales: dados.sales || [],
      settings: dados.settings || {},
      reports: dados.reports || {}
    };
  } catch (e) {
    logWithTimestamp('❌ Erro ao obter dados administrativos: ' + e);
    return {
      success: false,
      message: 'Erro ao carregar dados administrativos',
      users: [],
      budgets: [],
      sales: [],
      settings: {},
      reports: {}
    };
  }
}

function iniciarSistemaFDesign() {
  try {
    validarEstruturaAbas();
  } catch (e) {
    logWithTimestamp('❌ Erro na validação das abas: ' + e);
  }
  try {
    var html = HtmlService.createHtmlOutputFromFile('painelAdmin')
      .setTitle('F/Design Solutions — Painel Administrativo');
    SpreadsheetApp.getUi().showSidebar(html);
    logWithTimestamp('✅ Painel administrativo carregado na barra lateral.');
  } catch (erro) {
    logWithTimestamp('❌ Falha ao iniciar interface: ' + erro);
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('📘 F/Design Solutions')
    .addItem('Iniciar Sistema', 'iniciarSistemaFDesign')
    .addItem('Atualizar Cache', 'invalidateAllCache')
    .addToUi();
  try {
    iniciarSistemaFDesign();
  } catch (e) {
    logWithTimestamp('⚠️ Falha ao executar iniciarSistemaFDesign automaticamente: ' + e);
  }
}

