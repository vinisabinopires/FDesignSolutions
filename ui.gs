/**
 * =============================================================
 * UI helpers responsible for rendering the HTML interfaces using
 * HtmlService. All dialogs are modal to keep the experience
 * consistent with Google Workspace add-ons.
 * =============================================================
 */

/**
 * Displays a modal dialog using a template file.
 * @param {string} template
 * @param {number} width
 * @param {number} height
 * @param {string} title
 */
function showDialog(template, width, height, title) {
  const html = HtmlService.createTemplateFromFile(template).evaluate();
  SpreadsheetApp.getUi().showModalDialog(html.setWidth(width).setHeight(height), title);
}

/**
 * Opens the login screen.
 */
function abrirLoginSistema() {
  showDialog('loginSistema', 520, 540, 'Sign in — F/Design Solutions');
}

/**
 * Opens the primary dashboard for sellers.
 */
function abrirPainelVendas() {
  showDialog('homeFDesign', 1280, 760, 'Sales Workspace — F/Design Solutions');
}

/**
 * Opens the administrative cockpit.
 */
function abrirPainelAdmin() {
  showDialog('painelAdmin', 1300, 760, 'Admin Control Center — F/Design Solutions');
}

/**
 * Opens the sale registration form.
 */
function abrirFormVendas() {
  showDialog('formVendas', 1024, 760, 'Register Sale — F/Design Solutions');
}

/**
 * Opens the sales dashboard (detailed view).
 */
function abrirDashboardVendas() {
  showDialog('dashboardVendas', 1100, 760, 'Sales Dashboard — F/Design Solutions');
}

/**
 * Opens the quotes management console.
 */
function abrirFormGerenciar() {
  showDialog('orcamentosDashboard', 1100, 760, 'Quotes Pipeline — F/Design Solutions');
}

/**
 * Handles the "return" action from child dialogs and routes the
 * user back to the appropriate landing page.
 * @returns {{success: boolean, message?: string}}
 */
function retornarAoMenuPrincipal() {
  const session = getActiveSession();
  if (!session) {
    abrirLoginSistema();
    return { success: false, message: 'Session expired. Please sign in again.' };
  }
  abrirPainelPorTipo(session);
  return { success: true };
}
