/**
 * =============================================================
 * Dashboard and analytics utilities.
 * =============================================================
 */

/**
 * Builds the main dashboard payload consumed by homeFDesign.html.
 * @returns {Object<string, *>}
 */
function obterDadosDashboard() {
  try {
    const session = getActiveSession();
    if (!session) {
      return { erro: true, mensagem: 'Authentication required.' };
    }

    const sales = buscarVendas({});
    const quotes = buscarOrcamentos({});
    const userName = session.name || session.email;

    const mySales = sales.filter(function (sale) {
      return normaliseEmail(sale.vendedor) === normaliseEmail(session.email) ||
        normaliseEmail(sale.vendedor) === normaliseEmail(session.name);
    });

    const totalSalesValue = mySales.reduce(function (acc, sale) {
      return acc + toNumber(sale.valor);
    }, 0);

    const totalCommission = mySales.reduce(function (acc, sale) {
      const commission = sale.percentual ? toNumber(sale.percentual) : toNumber(sale.valor) * getCommissionRate(sale.tipo);
      return acc + commission;
    }, 0);

    const monthlySeries = buildMonthlySeries(mySales, 'valor', 'Sales Value');
    const quoteByStatus = buildStatusSeries(quotes);

    const convertedQuotes = quotes.filter(function (quote) {
      const status = String(quote.status || '').toLowerCase();
      return status.indexOf('convert') >= 0 || status === 'closed' || status === 'won';
    }).length;
    const conversionRate = quotes.length ? roundCurrency((convertedQuotes / quotes.length) * 100) : 0;

    return {
      erro: false,
      nome: userName,
      totalVendas: roundCurrency(totalSalesValue),
      totalComissao: roundCurrency(totalCommission),
      totalOrcamentos: quotes.length,
      taxaConversao: conversionRate,
      graficoVendas: monthlySeries,
      graficoOrcamentos: quoteByStatus,
    };
  } catch (error) {
    registerGlobalError('obterDadosDashboard', error);
    return { erro: true, mensagem: 'Unable to load dashboard data.' };
  }
}

/**
 * Returns a comprehensive dataset for the administrative dashboard.
 * @returns {{success: boolean, message?: string, reports?: Object, settings?: Object, budgets?: Array, sales?: Array, users?: Array}}
 */
function obterDadosAdmin() {
  try {
    const session = getActiveSession();
    if (!session) {
      return { success: false, message: 'Authentication required.' };
    }

    const sales = buscarVendas({});
    const quotes = buscarOrcamentos({});
    const users = fetchUsers();
    const settings = fetchConfiguration();

    const totalSalesValue = sales.reduce(function (acc, sale) { return acc + toNumber(sale.valor); }, 0);
    const totalCommissions = sales.reduce(function (acc, sale) {
      const commission = sale.percentual ? toNumber(sale.percentual) : toNumber(sale.valor) * getCommissionRate(sale.tipo);
      return acc + commission;
    }, 0);
    const totalQuotes = quotes.length;
    const convertedQuotes = quotes.filter(function (quote) {
      const status = String(quote.status || '').toLowerCase();
      return status.indexOf('convert') >= 0 || status === 'closed' || status === 'won';
    }).length;

    const reports = {
      totals: {
        salesValue: roundCurrency(totalSalesValue),
        salesCount: sales.length,
        quotesCount: totalQuotes,
        commissionTotal: roundCurrency(totalCommissions),
      },
      conversionRate: totalQuotes ? roundCurrency((convertedQuotes / totalQuotes) * 100) : 0,
    };

    const userMetrics = users.map(function (user) {
      const userSales = sales.filter(function (sale) {
        return normaliseEmail(sale.vendedor) === normaliseEmail(user.email) ||
          normaliseEmail(sale.vendedor) === normaliseEmail(user.name);
      });
      const userQuotes = quotes.filter(function (quote) {
        return normaliseEmail(quote.vendedor) === normaliseEmail(user.email) ||
          normaliseEmail(quote.vendedor) === normaliseEmail(user.name);
      });
      const salesValue = userSales.reduce(function (acc, sale) { return acc + toNumber(sale.valor); }, 0);
      const commissions = userSales.reduce(function (acc, sale) {
        const commission = sale.percentual ? toNumber(sale.percentual) : toNumber(sale.valor) * getCommissionRate(sale.tipo);
        return acc + commission;
      }, 0);
      const conversion = userQuotes.length ? roundCurrency((userSales.length / userQuotes.length) * 100) : 0;
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        status: user.status,
        metrics: {
          salesCount: userSales.length,
          salesValue: roundCurrency(salesValue),
          quotesCount: userQuotes.length,
          commissionTotal: roundCurrency(commissions),
          conversionRate: conversion,
        },
      };
    });

    return {
      success: true,
      reports: reports,
      settings: settings,
      budgets: quotes,
      sales: sales,
      users: userMetrics,
    };
  } catch (error) {
    return registerGlobalError('obterDadosAdmin', error);
  }
}

/**
 * Groups numeric values by month for chart consumption.
 * @param {Array<Object>} rows
 * @param {string} field
 * @param {string} label
 * @returns {Array<Array<*>>}
 */
function buildMonthlySeries(rows, field, label) {
  const data = {};
  rows.forEach(function (row) {
    const date = row.data instanceof Date ? row.data : new Date(row.data);
    if (isNaN(date.getTime())) {
      return;
    }
    const key = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
    data[key] = (data[key] || 0) + toNumber(row[field]);
  });

  const series = [['Month', label]];
  Object.keys(data).sort().forEach(function (key) {
    series.push([key, roundCurrency(data[key])]);
  });
  return series;
}

/**
 * Builds a status based series for quotes.
 * @param {Array<Object>} quotes
 * @returns {Array<Array<*>>}
 */
function buildStatusSeries(quotes) {
  const data = {};
  quotes.forEach(function (quote) {
    const status = String(quote.status || 'Open');
    data[status] = (data[status] || 0) + 1;
  });
  const series = [['Status', 'Count']];
  Object.keys(data).forEach(function (status) {
    series.push([status, data[status]]);
  });
  return series;
}

/**
 * Reads key/value configuration pairs from the CONFIG sheet.
 * @returns {Object<string, string>}
 */
function fetchConfiguration() {
  try {
    const sheet = getSheet(SHEET_NAMES.CONFIG);
    if (!sheet) {
      return {};
    }
    const values = sheet.getDataRange().getValues();
    const config = {};
    for (var i = 0; i < values.length; i++) {
      var key = String(values[i][0] || '').trim();
      if (!key) continue;
      config[key] = values[i][1];
    }
    return config;
  } catch (error) {
    registerGlobalError('fetchConfiguration', error);
    return {};
  }
}
