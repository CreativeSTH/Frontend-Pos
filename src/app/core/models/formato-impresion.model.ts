/** `GET /facturacion/formato` — el logo es el del negocio (el mismo del PDF). */
export interface FormatoImpresion {
  logoUrl: string | null;
  mensajeCierre: string | null;
  terminos: string | null;
}
