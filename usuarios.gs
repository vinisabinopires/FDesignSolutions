/**
 * =============================================================
 * Authentication and session management for the F/Design
 * Solutions platform.
 * =============================================================
 */

/**
 * Fetches all registered users from the USUARIOS sheet.
 * @returns {Array<Object<string, *>>}
 */
function fetchUsers() {
  try {
    const sheet = getRequiredSheet(SHEET_NAMES.USERS);
    const headerIndex = buildHeaderIndex(sheet, DEFAULT_HEADERS.USERS);
    const values = sheet.getDataRange().getValues();
    values.shift();

    const getIndex = (variants) => {
      for (var i = 0; i < variants.length; i++) {
        const normalised = normaliseHeader(variants[i]);
        if (headerIndex[normalised]) {
          return headerIndex[normalised] - 1;
        }
      }
      return -1;
    };

    const idIdx = getIndex(['id', 'codigo']);
    const nameIdx = getIndex(['name', 'nome']);
    const roleIdx = getIndex(['role', 'tipo', 'perfil']);
    const emailIdx = getIndex(['email', 'e-mail']);
    const phoneIdx = getIndex(['phone', 'telefone']);
    const pinIdx = getIndex(['pin', 'senha', 'password']);
    const commissionIdx = getIndex(['commission', 'comissao']);
    const statusIdx = getIndex(['status', 'situacao']);

    return values
      .filter(function (row) { return row.join('').trim() !== ''; })
      .map(function (row) {
        return {
          id: String(idIdx >= 0 ? row[idIdx] : '').trim(),
          name: String(nameIdx >= 0 ? row[nameIdx] : '').trim(),
          role: String(roleIdx >= 0 ? row[roleIdx] : 'Seller').trim(),
          email: normaliseEmail(emailIdx >= 0 ? row[emailIdx] : ''),
          phone: String(phoneIdx >= 0 ? row[phoneIdx] : '').trim(),
          pin: String(pinIdx >= 0 ? row[pinIdx] : '').trim(),
          commission: roundCurrency(commissionIdx >= 0 ? row[commissionIdx] : 0),
          status: String(statusIdx >= 0 ? row[statusIdx] : 'Active').trim().toLowerCase(),
        };
      });
  } catch (error) {
    registerGlobalError('fetchUsers', error);
    return [];
  }
}

/**
 * Persists the session information using CacheService and UserProperties.
 * @param {Object<string, *>} user
 */
function startSession(user) {
  const session = {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    commission: user.commission,
    startedAt: nowIso(),
  };

  const serialised = JSON.stringify(session);
  CacheService.getUserCache().put(SESSION_CACHE_KEY, serialised, SESSION_TTL_SECONDS);
  PropertiesService.getUserProperties().setProperty(SESSION_CACHE_KEY, serialised);
  writeAudit('LOGIN', `User ${session.email || session.name} logged in`, 'SUCCESS');
}

/**
 * Returns the active session or null when the user is unauthenticated.
 * @returns {Object<string, *> | null}
 */
function getActiveSession() {
  try {
    var raw = CacheService.getUserCache().get(SESSION_CACHE_KEY);
    if (!raw) {
      raw = PropertiesService.getUserProperties().getProperty(SESSION_CACHE_KEY);
    }
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    registerGlobalError('getActiveSession', error);
    return null;
  }
}

/**
 * Maintains compatibility with previous code paths.
 * @returns {Object<string, *> | null}
 */
function obterSessaoAtual() {
  return getActiveSession();
}

/**
 * Clears the current session from cache and properties.
 * @returns {{success: boolean}}
 */
function encerrarSessao() {
  try {
    CacheService.getUserCache().remove(SESSION_CACHE_KEY);
    PropertiesService.getUserProperties().deleteProperty(SESSION_CACHE_KEY);
    writeAudit('LOGOUT', 'User logged out', 'SUCCESS');
    return { success: true };
  } catch (error) {
    return registerGlobalError('encerrarSessao', error);
  }
}

/**
 * Wrapper used when the UI calls logout directly.
 * @returns {{success: boolean}}
 */
function logout() {
  return encerrarSessao();
}

/**
 * Extends the session duration when the user interacts with the system.
 */
function renovarSessao() {
  const session = getActiveSession();
  if (!session) {
    return;
  }
  const serialised = JSON.stringify(session);
  CacheService.getUserCache().put(SESSION_CACHE_KEY, serialised, SESSION_TTL_SECONDS);
  PropertiesService.getUserProperties().setProperty(SESSION_CACHE_KEY, serialised);
}

/**
 * Performs manual login using email + pin credentials.
 * @param {string} email
 * @param {string} pin
 * @returns {{success: boolean, message?: string}}
 */
function loginManual(email, pin) {
  try {
    const normalisedEmail = normaliseEmail(email);
    const sanitizedPin = String(pin || '').trim();
    if (!normalisedEmail || !sanitizedPin) {
      return { success: false, message: 'Please provide both e-mail and PIN.' };
    }

    const users = fetchUsers();
    const user = users.find(function (item) {
      return (
        item.email === normalisedEmail &&
        item.pin === sanitizedPin &&
        (item.status === 'ativo' || item.status === 'active')
      );
    });

    if (!user) {
      writeAudit('LOGIN_FAIL', `Invalid login attempt for ${normalisedEmail}`, 'DENIED');
      return { success: false, message: 'Invalid credentials or inactive account.' };
    }

    startSession(user);
    return {
      success: true,
      id: user.id,
      nome: user.name,
      nomeCompleto: user.name,
      nomeExibicao: user.name,
      tipo: user.role,
      email: user.email,
      comissaoPadrao: user.commission,
    };
  } catch (error) {
    return registerGlobalError('loginManual', error, { email: email });
  }
}

/**
 * Attempts to log the active Google Workspace user automatically.
 * @returns {{success: boolean, type: string, message?: string}}
 */
function loginAutomatico() {
  try {
    const email = normaliseEmail(Session.getActiveUser().getEmail());
    if (!email) {
      return { success: false, type: 'anonymous', message: 'No authenticated Google user.' };
    }

    const users = fetchUsers();
    const user = users.find(function (item) {
      return item.email === email && (item.status === 'ativo' || item.status === 'active');
    });

    if (!user) {
      return { success: false, type: 'unregistered', message: 'User not registered in the system.' };
    }

    startSession(user);
    return { success: true, type: 'registered' };
  } catch (error) {
    return registerGlobalError('loginAutomatico', error);
  }
}

/**
 * Opens the correct dashboard based on the authenticated role.
 * @returns {{success: boolean, message?: string}}
 */
function iniciarSistemaFDesign() {
  try {
    const session = getActiveSession();
    if (!session) {
      abrirLoginSistema();
      return { success: false, message: 'Authentication required.' };
    }
    abrirPainelPorTipo(session);
    return { success: true };
  } catch (error) {
    return registerGlobalError('iniciarSistemaFDesign', error);
  }
}

/**
 * Routes the user to the appropriate panel based on their role.
 * @param {Object<string, *>} session
 */
function abrirPainelPorTipo(session) {
  const role = String(session && session.role || '').toLowerCase();
  if (role === 'admin' || role === 'administrator') {
    abrirPainelAdmin();
    return;
  }
  abrirPainelVendas();
}

/**
 * Provides a lightweight permission summary to the front-end.
 * @returns {{autenticado: boolean, podeGerenciar: boolean, podeRegistrar: boolean, usuario?: Object}}
 */
function obterPermissoesAtuais() {
  const session = getActiveSession();
  if (!session) {
    return { autenticado: false, podeGerenciar: false, podeRegistrar: false };
  }
  const role = String(session.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'administrator';
  const canManage = isAdmin || role === 'supervisor';
  return {
    autenticado: true,
    podeGerenciar: canManage,
    podeRegistrar: true,
    usuario: session,
  };
}

/**
 * Returns the display name of the active session for logging purposes.
 * @returns {string}
 */
function obterUsuarioAtual() {
  const session = getActiveSession();
  if (session && session.name) {
    return session.name;
  }
  return Session.getActiveUser().getEmail() || 'Unknown user';
}
