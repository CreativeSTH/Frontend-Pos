export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000/api',
  assetsUrl: 'http://localhost:3000',
  agentUrl: 'http://localhost:9100',
  wompiApiUrl: 'https://production.wompi.co/v1',
  /**
   * Llave PÚBLICA de la plataforma (no confundir con la privada, que nunca
   * sale del backend) — mismo valor que `WOMPI_PLATAFORMA_LLAVE_PUBLICA` en
   * `pos-backend/.env`. No es sensible (Wompi la expone del lado del
   * navegador en cualquier integración), así que va acá igual que
   * `apiUrl`/`assetsUrl` — mismo mecanismo de config por ambiente.
   */
  wompiLlavePublica: 'pub_CAMBIAR_POR_LA_LLAVE_PUBLICA_REAL_DE_WOMPI',
};
