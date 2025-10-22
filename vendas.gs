/**
 * =============================================================
 * Sales management module. Handles CRUD operations for the
 * Client_List sheet and exposes helper functions consumed by
 * the HTML interfaces.
 * =============================================================
 */

/**
 * Registers a new sale in the Client_List sheet.
 * @param {{tipo: string, valor: number, cliente: string, empresa: string, invoice?: string, produto: string}} dados
 * @returns {{success: boolean, id?: string, commission?: number, message?: string}}
 */
function registrarVenda(dados) {
  try {
    const session = getActiveSession();
    if (!session) {
      return { success: false, message: 'Authentication required.' };
    }

    const sheet = getRequiredSheet(SHEET_NAMES.SALES);
    const headerRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const id = generateBusinessId('VEN');
    const timestamp = new Date();
    const value = roundCurrency(toNumber(dados.valor));
    const rate = getCommissionRate(dados.tipo);
    const commission = roundCurrency(value * rate);

    const row = new Array(headerRow.length).fill('');
    for (var idx = 0; idx < headerRow.length; idx++) {
      const key = normaliseHeader(headerRow[idx]);
      switch (key) {
        case 'id':
          row[idx] = id;
          break;
        case 'date':
          row[idx] = timestamp;
          break;
        case 'seller':
          row[idx] = session.name || session.email;
          break;
        case 'client':
          row[idx] = dados.cliente || '';
          break;
        case 'company':
          row[idx] = dados.empresa || '';
          break;
        case 'product':
          row[idx] = dados.produto || '';
          break;
        case 'invoice':
          row[idx] = dados.invoice || id;
          break;
        case 'value':
          row[idx] = value;
          break;
        case 'status':
          row[idx] = 'Pending';
          break;
        case 'attempts':
          row[idx] = 0;
          break;
        case 'paid':
          row[idx] = 0;
          break;
        case 'updated at':
          row[idx] = timestamp;
          break;
        case 'log':
          row[idx] = `Created by ${session.name || session.email} on ${timestamp.toLocaleString()}`;
          break;
        case 'commission':
          row[idx] = commission;
          break;
        case 'type':
          row[idx] = dados.tipo || '';
          break;
        default:
          // leave empty
          break;
      }
    }

    sheet.appendRow(row);
    writeAudit('SALE_CREATED', `Sale ${id} registered by ${session.email || session.name}`, 'SUCCESS');
    return { success: true, id: id, commission: commission, message: 'Sale registered successfully.' };
  } catch (error) {
    return registerGlobalError('registrarVenda', error, dados);
  }
}

/**
 * Retrieves a detailed sale by its identifier or invoice number.
 * @param {string} termo
 * @returns {Object<string, *> | null}
 */
function buscarVenda(termo) {
  try {
    const sheet = getRequiredSheet(SHEET_NAMES.SALES);
    const headerRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const values = sheet.getDataRange().getValues();
    values.shift();
    const normalisedTerm = String(termo || '').trim().toLowerCase();

    const indices = {};
    headerRow.forEach(function (header, idx) {
      indices[normaliseHeader(header)] = idx;
    });

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var id = String(row[indices['id'] || 0] || '').toLowerCase();
      var invoice = String(row[indices['invoice'] || indices['id'] || 0] || '').toLowerCase();
      if (id === normalisedTerm || invoice === normalisedTerm) {
        return mapSaleRow(row, headerRow, i + 2);
      }
    }
    return null;
  } catch (error) {
    registerGlobalError('buscarVenda', error, { termo: termo });
    return null;
  }
}

/**
 * Updates an existing sale line with the provided data.
 * @param {{linha: number, tipo: string, cliente: string, empresa: string, invoice: string, produto: string, valor: number}} dados
 * @returns {{success: boolean, message: string}}
 */
function atualizarVenda(dados) {
  try {
    const linha = Number(dados.linha);
    if (!linha || linha < 2) {
      return { success: false, message: 'Invalid row number.' };
    }

    const sheet = getRequiredSheet(SHEET_NAMES.SALES);
    const headerRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const indices = {};
    headerRow.forEach(function (header, idx) {
      indices[normaliseHeader(header)] = idx + 1;
    });

    if (indices.client) sheet.getRange(linha, indices.client).setValue(dados.cliente || '');
    if (indices.company) sheet.getRange(linha, indices.company).setValue(dados.empresa || '');
    if (indices.product) sheet.getRange(linha, indices.product).setValue(dados.produto || '');
    if (indices.value) sheet.getRange(linha, indices.value).setValue(roundCurrency(toNumber(dados.valor)));
    if (indices.invoice) sheet.getRange(linha, indices.invoice).setValue(dados.invoice || '');
    if (indices.type) sheet.getRange(linha, indices.type).setValue(dados.tipo || '');
    if (indices['updated at']) sheet.getRange(linha, indices['updated at']).setValue(new Date());

    writeAudit('SALE_UPDATED', `Row ${linha} updated`, 'SUCCESS');
    return { success: true, message: 'Sale updated successfully.' };
  } catch (error) {
    return registerGlobalError('atualizarVenda', error, dados);
  }
}

/**
 * Deletes a sale row.
 * @param {number} linha
 * @returns {{success: boolean, message: string}}
 */
function excluirVenda(linha) {
  try {
    const row = Number(linha);
    if (!row || row < 2) {
      return { success: false, message: 'Invalid row.' };
    }
    const sheet = getRequiredSheet(SHEET_NAMES.SALES);
    sheet.deleteRow(row);
    writeAudit('SALE_DELETED', `Row ${row} removed`, 'SUCCESS');
    return { success: true, message: 'Sale deleted successfully.' };
  } catch (error) {
    return registerGlobalError('excluirVenda', error, { linha: linha });
  }
}

/**
 * Retrieves sales using optional filters.
 * @param {{nome?: string, empresa?: string, invoice?: string, produto?: string}} filtros
 * @returns {Array<Object<string, *>>}
 */
function buscarVendas(filtros) {
  try {
    const sheet = getRequiredSheet(SHEET_NAMES.SALES);
    const headerRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const values = sheet.getDataRange().getValues();
    values.shift();
    return values
      .map(function (row, idx) { return mapSaleRow(row, headerRow, idx + 2); })
      .filter(function (sale) {
        if (!sale) return false;
        var matches = true;
        if (filtros.nome) {
          matches = matches && String(sale.cliente || '').toLowerCase().indexOf(filtros.nome.toLowerCase()) !== -1;
        }
        if (filtros.empresa) {
          matches = matches && String(sale.empresa || '').toLowerCase().indexOf(filtros.empresa.toLowerCase()) !== -1;
        }
        if (filtros.invoice) {
          matches = matches && String(sale.id || '').toLowerCase().indexOf(filtros.invoice.toLowerCase()) !== -1;
        }
        if (filtros.produto) {
          matches = matches && String(sale.produto || '').toLowerCase().indexOf(filtros.produto.toLowerCase()) !== -1;
        }
        return matches;
      });
  } catch (error) {
    registerGlobalError('buscarVendas', error, filtros);
    return [];
  }
}

/**
 * Registers a contact attempt either for a sale or a quote.
 * @param {string} id
 * @param {string} tipo
 * @returns {{success: boolean, tentativas?: number, message?: string}}
 */
function registrarTentativaContato(id, tipo) {
  try {
    const sheet = getRequiredSheet(SHEET_NAMES.SALES);
    const headerRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const values = sheet.getDataRange().getValues();
    const indices = {};
    headerRow.forEach(function (header, idx) {
      indices[normaliseHeader(header)] = idx;
    });

    for (var i = 1; i < values.length; i++) {
      const row = values[i];
      if (String(row[indices['id'] || 0]) === id) {
        const attemptsIndex = indices['attempts'];
        const updatedAtIndex = indices['updated at'];
        const logIndex = indices['log'];
        const attempts = toNumber(row[attemptsIndex]) + 1;
        const message = `Contact (${tipo}) by ${obterUsuarioAtual()} — ${new Date().toLocaleString()}`;

        if (attemptsIndex !== undefined) sheet.getRange(i + 1, attemptsIndex + 1).setValue(attempts);
        if (updatedAtIndex !== undefined) sheet.getRange(i + 1, updatedAtIndex + 1).setValue(new Date());
        if (logIndex !== undefined) sheet.getRange(i + 1, logIndex + 1).setValue(message);

        writeAudit('SALE_CONTACT', `Contact attempt for ${id}`, 'SUCCESS');
        return { success: true, tentativas: attempts };
      }
    }

    // Delegate to quote handler when sale is not found
    return registrarTentativaContatoOrcamento(id, tipo);
  } catch (error) {
    return registerGlobalError('registrarTentativaContato', error, { id: id, tipo: tipo });
  }
}

/**
 * Registers a partial payment for a sale.
 * @param {string} id
 * @param {number} valor
 * @param {string} metodo
 * @returns {{success: boolean, total?: number, message?: string}}
 */
function registrarPagamento(id, valor, metodo) {
  try {
    const sheet = getRequiredSheet(SHEET_NAMES.SALES);
    const headerRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const values = sheet.getDataRange().getValues();
    const indices = {};
    headerRow.forEach(function (header, idx) {
      indices[normaliseHeader(header)] = idx;
    });

    for (var i = 1; i < values.length; i++) {
      const row = values[i];
      if (String(row[indices['id'] || 0]) === id) {
        const paidIndex = indices['paid'];
        const updatedAtIndex = indices['updated at'];
        const logIndex = indices['log'];
        const currentPaid = roundCurrency(toNumber(row[paidIndex]));
        const newTotal = roundCurrency(currentPaid + roundCurrency(toNumber(valor)));
        const message = `Payment $${roundCurrency(valor)} via ${metodo} — ${obterUsuarioAtual()} — ${new Date().toLocaleString()}`;

        if (paidIndex !== undefined) sheet.getRange(i + 1, paidIndex + 1).setValue(newTotal);
        if (updatedAtIndex !== undefined) sheet.getRange(i + 1, updatedAtIndex + 1).setValue(new Date());
        if (logIndex !== undefined) sheet.getRange(i + 1, logIndex + 1).setValue(message);

        writeAudit('SALE_PAYMENT', `Payment registered for ${id}`, 'SUCCESS');
        return { success: true, total: newTotal };
      }
    }

    return { success: false, message: 'Sale not found.' };
  } catch (error) {
    return registerGlobalError('registrarPagamento', error, { id: id, valor: valor });
  }
}

/**
 * Maps a raw row from Client_List into a structured object for the UI.
 * @param {Array<*>} row
 * @param {Array<string>} headerRow
 * @param {number} linha
 * @returns {Object<string, *>}
 */
function mapSaleRow(row, headerRow, linha) {
  if (!row) return null;
  const data = { linha: linha };
  for (var idx = 0; idx < headerRow.length; idx++) {
    const key = normaliseHeader(headerRow[idx]);
    switch (key) {
      case 'id':
      case 'invoice':
        data.id = row[idx];
        data.invoice = row[idx];
        break;
      case 'date':
        data.data = row[idx];
        break;
      case 'seller':
        data.vendedor = row[idx];
        break;
      case 'client':
        data.cliente = row[idx];
        break;
      case 'company':
        data.empresa = row[idx];
        break;
      case 'product':
        data.produto = row[idx];
        break;
      case 'value':
        data.valor = row[idx];
        break;
      case 'status':
        data.status = row[idx];
        break;
      case 'attempts':
        data.tentativas = row[idx];
        break;
      case 'paid':
        data.pagamentos = row[idx];
        break;
      case 'updated at':
        data.ultimaAtualizacao = row[idx];
        break;
      case 'log':
        data.log = row[idx];
        break;
      case 'commission':
        data.percentual = row[idx];
        break;
      case 'type':
        data.tipo = row[idx];
        break;
      default:
        break;
    }
  }
  return data;
}
