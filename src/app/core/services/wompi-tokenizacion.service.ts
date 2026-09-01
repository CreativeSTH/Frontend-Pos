import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface DatosTarjeta {
  numero: string;
  cvc: string;
  mesVencimiento: string;
  anioVencimiento: string;
  nombreTitular: string;
}

@Injectable({ providedIn: 'root' })
export class WompiTokenizacionService {
  /**
   * Llama DIRECTO a la API de Wompi con la llave pública — la tarjeta nunca
   * pasa por nuestro backend. URL y llave salen de `environment.ts` (mismo
   * mecanismo que `apiUrl`/`assetsUrl`), así sandbox y producción apuntan a
   * ambientes distintos de Wompi sin tocar código — a diferencia de una
   * constante hardcodeada al módulo, que forzaría siempre producción.
   */
  async tokenizar(datos: DatosTarjeta): Promise<{ token: string; ultimosCuatroDigitos: string }> {
    const res = await fetch(`${environment.wompiApiUrl}/tokens/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.wompiLlavePublica}`,
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
