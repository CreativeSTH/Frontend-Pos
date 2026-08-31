import { Injectable } from '@angular/core';

export interface DatosTarjeta {
  numero: string;
  cvc: string;
  mesVencimiento: string;
  anioVencimiento: string;
  nombreTitular: string;
}

const WOMPI_API_URL = 'https://production.wompi.co/v1';

/**
 * Llave PÚBLICA de la plataforma (no confundir con la privada, que nunca sale
 * del backend) — mismo valor que `WOMPI_PLATAFORMA_LLAVE_PUBLICA` en
 * `pos-backend/.env`. Angular no tiene variables de entorno en runtime como
 * Node; se define acá como constante y se actualiza a mano si la llave
 * cambia — mismo patrón que cualquier llave pública de terceros embebida en
 * un bundle de frontend (no es un secreto).
 *
 * Valor real pendiente de reemplazo manual (sandbox primero, producción
 * después) — no es un TODO vago, es el único paso que falta y no puede
 * automatizarse desde este repo.
 */
const WOMPI_LLAVE_PUBLICA_PLATAFORMA = 'pub_CAMBIAR_POR_LA_LLAVE_PUBLICA_REAL_DE_WOMPI';

@Injectable({ providedIn: 'root' })
export class WompiTokenizacionService {
  /**
   * Llama DIRECTO a la API de Wompi con la llave pública — la tarjeta nunca
   * pasa por nuestro backend.
   */
  async tokenizar(datos: DatosTarjeta): Promise<{ token: string; ultimosCuatroDigitos: string }> {
    const res = await fetch(`${WOMPI_API_URL}/tokens/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WOMPI_LLAVE_PUBLICA_PLATAFORMA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: datos.numero.replace(/\s/g, ''),
        cvc: datos.cvc,
        exp_month: datos.mesVencimiento,
        exp_year: datos.anioVencimiento,
        card_holder: datos.nombreTitular,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.reason ?? 'No se pudo validar la tarjeta con Wompi');
    }
    const { data } = await res.json();
    return { token: data.id as string, ultimosCuatroDigitos: data.last_four as string };
  }
}
