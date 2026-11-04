/* Configurare pentru publicare. Se completează după ce există botul, Worker-ul și blocul Adsgram.
 * Câmpurile goale dezactivează funcția respectivă (jocul merge oricum).
 */
window.FO_CONFIG = {
  // URL-ul Cloudflare Worker-ului (fără / la final), ex. "https://orbita-bot.<cont>.workers.dev"
  API_BASE: 'https://orbita-bot.dragos-o-harea.workers.dev',
  // ID-ul blocului de reclamă recompensată din partner.adsgram.ai, ex. "12345"
  ADSGRAM_BLOCK_ID: ''
};
