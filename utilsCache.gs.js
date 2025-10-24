// ===============================================================
// 🧹 Função utilitária para limpar o cache do painel
// ===============================================================
function resetarCachePainel() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove("dadosAdminCache");
    PropertiesService.getScriptProperties().deleteAllProperties();
    Logger.log("✅ Cache do painel limpo com sucesso!");
  } catch (e) {
    Logger.log("❌ Erro ao limpar cache: " + e.message);
  }
}
