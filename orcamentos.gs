/**
 * =============================================================
 * Quotes (orçamentos) management module. Keeps all operations
 * related to the ORÇAMENTOS sheet centralised.
 * =============================================================
 */

/**
 * Registers a new quote in the ORÇAMENTOS sheet.
 * @param {{tipo: string, valor: number, cliente: string, empresa: string, produto: string}} dados
 * @returns {{success: boolean, id?: string, message?: string}}
 */
function registrarOrcamento(dados) {
  try {
    const session = getActiveSession();
    if (!session) {
      return { success: false, message: 'Authentication required.' };
    }

    const sheet = getRequiredSheet(SHEET_NAMES.QUOTES);
    const headerRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const id = generateBusinessId('ORC');
    const timestamp = new Date();
    const value = roundCurrency(toNumber(dados.valor));
    const commission = roundCurrency(value * getCommissionRate(dados.tipo));

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
        case 'value':
          row[idx] = value;
          break;
        case 'status':
          row[idx] = 'Open';
          break;
        case 'attempts':
          row[idx] = 0;
          break;
        case 'notes':
          row[idx] = '';
          break;
        case 'updated at':
          row[idx] = timestamp;
          break;
        case 'log':
          row[idx] = `Quote created by ${session.name || session.email} on ${timestamp.toLocaleString()}`;
          break;
        case 'commission':
          row[idx] = commission;
          break;
        case 'type':
          row[idx] = dados.tipo || '';
          break;
        default:
          break;
      }
    }

    sheet.appendRow(row);
    writeAudit('QUOTE_CREATED', `Quote ${id} registered`, 'SUCCESS');
    return { success: true, id: id, message: 'Quote registered successfully.' };
  } catch (error) {
    return registerGlobalError('registrarOrcamento', error, dados);
  }
}

/**
 * Searches quotes based on optional filters.
 * @param {{nome?: string, empresa?: string, invoice?: string, produto?: string}} filtros
 * @returns {Array<Object<string, *>>}
 */
function buscarOrcamentos(filtros) {
  try {
    const sheet = getRequiredSheet(SHEET_NAMES.QUOTES);
    const headerRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const values = sheet.getDataRange().getValues();
    values.shift();

    return values
      .map(function (row, idx) { return mapQuoteRow(row, headerRow, idx + 2); })
      .filter(function (quote) {
        if (!quote) return false;
        var matches = true;
        if (filtros.nome) {
          matches = matches && String(quote.cliente || '').toLowerCase().indexOf(filtros.nome.toLowerCase()) !== -1;
        }
        if (filtros.empresa) {
          matches = matches && String(quote.empresa || '').toLowerCase().indexOf(filtros.empresa.toLowerCase()) !== -1;
        }
        if (filtros.invoice) {
          matches = matches && String(quote.id || '').toLowerCase().indexOf(filtros.invoice.toLowerCase()) !== -1;
        }
        if (filtros.produto) {
          matches = matches && String(quote.produto || '').toLowerCase().indexOf(filtros.produto.toLowerCase()) !== -1;
        }
        return matches;
      });
  } catch (error) {
    registerGlobalError('buscarOrcamentos', error, filtros);
    return [];
  }
}

/**
 * Handles contact attempts for a quote (called by vendas.gs when ID is not found there).
 * @param {string} id
 * @param {string} tipo
 * @returns {{success: boolean, tentativas?: number, message?: string}}
 */
function registrarTentativaContatoOrcamento(id, tipo) {
  try {
    const sheet = getRequiredSheet(SHEET_NAMES.QUOTES);
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
        const message = `Quote contact (${tipo}) by ${obterUsuarioAtual()} — ${new Date().toLocaleString()}`;

        if (attemptsIndex !== undefined) sheet.getRange(i + 1, attemptsIndex + 1).setValue(attempts);
        if (updatedAtIndex !== undefined) sheet.getRange(i + 1, updatedAtIndex + 1).setValue(new Date());
        if (logIndex !== undefined) sheet.getRange(i + 1, logIndex + 1).setValue(message);

        writeAudit('QUOTE_CONTACT', `Contact attempt for ${id}`, 'SUCCESS');
        return { success: true, tentativas: attempts };
      }
    }

    return { success: false, message: 'Quote not found.' };
  } catch (error) {
    return registerGlobalError('registrarTentativaContatoOrcamento', error, { id: id, tipo: tipo });
  }
}

/**
 * Converts a quote into a sale by duplicating the relevant data.
 * @param {string} id
 * @returns {{success: boolean, idVenda?: string, message?: string}}
 */
function converterOrcamentoParaVenda(id) {
  try {
    const sheetQuotes = getRequiredSheet(SHEET_NAMES.QUOTES);
    const sheetSales = getRequiredSheet(SHEET_NAMES.SALES);
    const quotesHeader = sheetQuotes.getRange(1, 1, 1, Math.max(1, sheetQuotes.getLastColumn())).getValues()[0];
    const salesHeader = sheetSales.getRange(1, 1, 1, Math.max(1, sheetSales.getLastColumn())).getValues()[0];
    const values = sheetQuotes.getDataRange().getValues();
    const quoteIndex = {};
    quotesHeader.forEach(function (header, idx) {
      quoteIndex[normaliseHeader(header)] = idx;
    });

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (String(row[quoteIndex['id'] || 0]) === id) {
        const saleRow = new Array(salesHeader.length).fill('');
        const saleId = generateBusinessId('VEN');
        const timestamp = new Date();
        const value = roundCurrency(toNumber(row[quoteIndex['value']]));
        const commission = roundCurrency(value * getCommissionRate(row[quoteIndex['type']]));
        const seller = row[quoteIndex['seller']] || obterUsuarioAtual();

        for (var idx = 0; idx < salesHeader.length; idx++) {
          const key = normaliseHeader(salesHeader[idx]);
          switch (key) {
            case 'id':
              saleRow[idx] = saleId;
              break;
            case 'date':
              saleRow[idx] = timestamp;
              break;
            case 'seller':
              saleRow[idx] = seller;
              break;
            case 'client':
              saleRow[idx] = row[quoteIndex['client']];
              break;
            case 'company':
              saleRow[idx] = row[quoteIndex['company']];
              break;
            case 'product':
              saleRow[idx] = row[quoteIndex['product']];
              break;
            case 'value':
              saleRow[idx] = value;
              break;
            case 'status':
              saleRow[idx] = 'Pending';
              break;
            case 'attempts':
              saleRow[idx] = 0;
              break;
            case 'paid':
              saleRow[idx] = 0;
              break;
            case 'updated at':
              saleRow[idx] = timestamp;
              break;
            case 'log':
              saleRow[idx] = `Converted from ${id} by ${obterUsuarioAtual()} — ${timestamp.toLocaleString()}`;
              break;
            case 'commission':
              saleRow[idx] = commission;
              break;
            case 'type':
              saleRow[idx] = row[quoteIndex['type']];
              break;
            default:
              break;
          }
        }

        sheetSales.appendRow(saleRow);
        const statusIndex = quoteIndex['status'];
        if (statusIndex !== undefined) {
          sheetQuotes.getRange(i + 1, statusIndex + 1).setValue('Converted to Sale');
        }
        writeAudit('QUOTE_CONVERTED', `Quote ${id} converted to sale ${saleId}`, 'SUCCESS');
        return { success: true, idVenda: saleId };
      }
    }

    return { success: false, message: 'Quote not found.' };
  } catch (error) {
    return registerGlobalError('converterOrcamentoParaVenda', error, { id: id });
  }
}

/**
 * Maps a quote row into an object ready for the UI.
 * @param {Array<*>} row
 * @param {Array<string>} headerRow
 * @param {number} linha
 * @returns {Object<string, *>}
 */
function mapQuoteRow(row, headerRow, linha) {
  if (!row) return null;
  const data = { linha: linha };
  for (var idx = 0; idx < headerRow.length; idx++) {
    const key = normaliseHeader(headerRow[idx]);
    switch (key) {
      case 'id':
        data.id = row[idx];
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
