/**
 * =============================================================
 * Core utilities shared by the F/Design Solutions Apps Script
 * backend. Provides strongly typed access to spreadsheet
 * resources, logging helpers and shared constants.
 * =============================================================
 */

/** @enum {string} */
const SHEET_NAMES = Object.freeze({
  USERS: 'USUARIOS',
  SALES: 'Client_List',
  QUOTES: 'ORÇAMENTOS',
  CONFIG: 'CONFIG',
  AUDIT: 'AUDITORIA',
});

/** Session configuration */
const SESSION_CACHE_KEY = 'fds::session';
const SESSION_TTL_SECONDS = 60 * 60; // 1 hour

/** Commission map used throughout the platform. */
const COMMISSION_RATES = Object.freeze({
  New: 0.30,
  Old: 0.20,
  'Walk-in': 0.10,
});

/** Default headers appended when the sheet misses an expected column. */
const DEFAULT_HEADERS = Object.freeze({
  SALES: ['ID', 'Date', 'Seller', 'Client', 'Company', 'Product', 'Value', 'Status', 'Attempts', 'Paid', 'Updated At', 'Log', 'Commission'],
  QUOTES: ['ID', 'Date', 'Seller', 'Client', 'Company', 'Product', 'Value', 'Status', 'Attempts', 'Notes', 'Updated At', 'Log', 'Commission'],
  USERS: ['ID', 'Name', 'Role', 'Email', 'Phone', 'Pin', 'Commission', 'Status'],
});

/**
 * Returns the active spreadsheet used by the project.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Retrieves a sheet by name, returning null when it is missing.
 * @param {string} name
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null}
 */
function getSheet(name) {
  return getSpreadsheet().getSheetByName(name) || null;
}

/**
 * Retrieves a sheet or throws an informative error when unavailable.
 * @param {string} name
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getRequiredSheet(name) {
  const sheet = getSheet(name);
  if (!sheet) {
    throw new Error(`Sheet "${name}" was not found. Please verify the Apps Script configuration.`);
  }
  return sheet;
}

/**
 * Normalises header names to make lookups robust against accents and
 * different casing.
 * @param {string} header
 * @returns {string}
 */
function normaliseHeader(header) {
  return String(header || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Builds a map of header -> column index for the provided sheet.
 * Missing headers can optionally be created using DEFAULT_HEADERS metadata.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<string>} fallbackHeaders
 * @returns {Object<string, number>}
 */
function buildHeaderIndex(sheet, fallbackHeaders) {
  const lastColumn = Math.max(1, sheet.getLastColumn());
  const header = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const index = {};

  header.forEach((value, idx) => {
    const key = normaliseHeader(value);
    if (key) {
      index[key] = idx + 1;
    }
  });

  if (fallbackHeaders && fallbackHeaders.length) {
    fallbackHeaders.forEach((name) => {
      const key = normaliseHeader(name);
      if (!index[key]) {
        const newColumn = sheet.getLastColumn() + 1;
        sheet.getRange(1, newColumn).setValue(name);
        index[key] = newColumn;
      }
    });
  }

  return index;
}

/**
 * Appends a row to the audit sheet when it exists. The function never throws
 * because audit logging should not disrupt the business flow.
 * @param {string} action
 * @param {string} detail
 * @param {string=} status
 */
function writeAudit(action, detail, status) {
  try {
    const sheet = getSheet(SHEET_NAMES.AUDIT);
    if (!sheet) {
      Logger.log(`ℹ️ Audit sheet missing while logging action: ${action}`);
      return;
    }
    sheet.appendRow([
      new Date(),
      action,
      status || 'OK',
      detail || '',
      Session.getActiveUser().getEmail() || '',
    ]);
  } catch (error) {
    Logger.log(`⚠️ Unable to write audit entry for ${action}: ${error}`);
  }
}

/**
 * Centralised error handler used across modules.
 * @param {string} functionName
 * @param {unknown} error
 * @param {Object=} context
 * @returns {{success: false, message: string}}
 */
function registerGlobalError(functionName, error, context) {
  const message = error && error.message ? error.message : String(error);
  Logger.log(`❌ [${functionName}] ${message}`);
  if (context) {
    Logger.log(`🧩 Context: ${JSON.stringify(context)}`);
  }
  writeAudit(`ERROR:${functionName}`, message, 'ERROR');
  return { success: false, message: 'An unexpected error occurred. Please try again later.' };
}

/**
 * Utility used to round currency values to two decimal places.
 * @param {number} value
 * @returns {number}
 */
function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Returns a consistent ISO string timestamp.
 * @returns {string}
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Retrieves the commission rate associated with the provided sale type.
 * Defaults to 10% when the type is unknown.
 * @param {string} type
 * @returns {number}
 */
function getCommissionRate(type) {
  const key = String(type || '').trim();
  return COMMISSION_RATES[key] || 0.10;
}

/**
 * Generates a readable identifier using the provided prefix.
 * @param {string} prefix
 * @returns {string}
 */
function generateBusinessId(prefix) {
  const date = new Date();
  const pad = (num, size) => String(num).padStart(size, '0');
  return [
    prefix,
    pad(date.getFullYear(), 4),
    pad(date.getMonth() + 1, 2),
    pad(date.getDate(), 2),
    pad(date.getHours(), 2),
    pad(date.getMinutes(), 2),
    pad(date.getSeconds(), 2),
  ].join('-');
}

/**
 * Creates a consistent success response payload.
 * @template T
 * @param {T} data
 * @param {string=} message
 * @returns {{success: true, data: T, message?: string}}
 */
function successResponse(data, message) {
  const payload = { success: true, data: data };
  if (message) {
    payload.message = message;
  }
  return payload;
}

/**
 * Returns a normalised email string.
 * @param {string} email
 * @returns {string}
 */
function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Parses numeric values coming from the UI ensuring NaN is never returned.
 * @param {number|string} value
 * @returns {number}
 */
function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
