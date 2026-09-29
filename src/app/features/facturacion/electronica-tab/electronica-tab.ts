import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { PerfilFiscalForm } from '../../politica-facturacion/perfil-fiscal-form/perfil-fiscal-form';
import { FacturacionElectronicaWizard } from '../../facturacion-electronica/facturacion-electronica';
import { PoliticaFacturacionService } from '../../../core/services/politica-facturacion.service';
import { SuscripcionService } from '../../../core/services/suscripcion.service';
import { AuthService } from '../../../core/services/auth.service';
import { MedicionTopeUvt } from '../../../core/models/comprobante-facturacion.model';
import { ModoFacturacion } from '../../../core/models/politica-facturacion.model';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const TEXTO_MODO: Record<ModoFacturacion, string> = {
  ELECTRONICA: 'Cada venta sale con factura electrónica.',
  RECIBO: 'Tu negocio no está obligado a facturar electrónicamente: cada venta sale con recibo.',
  GRACIA: 'Tu negocio está obligado a facturar electrónicamente. Mientras la activas, vendes con recibo.',
  BLOQUEADO: 'Tu negocio no puede cobrar hasta activar la facturación electrónica.',
  SIN_DECLARAR: 'Declara tu perfil fiscal para saber si debes facturar electrónicamente.',
};

/** Estado, perfil fiscal, tope de UVT y habilitación DIAN en un solo lugar (spec 6.3). */
@Component({
  selector: 'app-electronica-tab',
  standalone: true,
  imports: [Button, Icon, RouterLink, PerfilFiscalForm, FacturacionElectronicaWizard],
  templateUrl: './electronica-tab.html',
  styleUrl: './electronica-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectronicaTab {
  private readonly politica = inject(PoliticaFacturacionService);
  private readonly auth = inject(AuthService);

  protected readonly estado = this.politica.estado;
  protected readonly textoModo = computed(() => {
    const e = this.estado();
    return e ? TEXTO_MODO[e.modo] : '';
  });
  protected readonly puedeEditarPerfil = computed(() => this.auth.tienePermiso('NEGOCIO', 'EDITAR'));
  protected readonly editandoPerfil = signal(false);
  protected readonly tope = signal<MedicionTopeUvt | null>(null);
  /** null mientras carga — el asistente se muestra solo si el paquete incluye facturación DIAN. */
  protected readonly paqueteConDian = signal<boolean | null>(null);

  protected readonly anchoBarra = computed(() => Math.min(100, this.tope()?.porcentaje ?? 0));
  protected readonly nivelBarra = computed(() => {
    const p = this.tope()?.porcentaje ?? 0;
    return p >= 90 ? 'alto' : p >= 70 ? 'medio' : 'bajo';
  });

  constructor() {
    this.politica.cargar();
    this.cargarTope();
    inject(SuscripcionService)
      .miEstado()
      .subscribe({
        next: (s) => this.paqueteConDian.set(s.paquete.facturacionDianHabilitada === true),
        error: () => this.paqueteConDian.set(false),
      });
  }

  protected alGuardarPerfil(): void {
    this.editandoPerfil.set(false);
    this.cargarTope();
  }

  protected etiquetaPersona(tipo: string): string {
    return tipo === 'JURIDICA' ? 'Persona jurídica' : 'Persona natural';
  }

  protected etiquetaIva(r: string): string {
    if (r === 'RESPONSABLE') return 'Responsable de IVA (48)';
    if (r === 'REGIMEN_SIMPLE') return 'Régimen Simple (47)';
    return 'No responsable de IVA (49)';
  }

  /** '2026-11-07' → '7 de noviembre de 2026' (día calendario, sin pasar por Date para no correrlo). */
  protected fechaLarga(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return `${dia} de ${MESES[mes - 1]} de ${anio}`;
  }

  protected formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
  }

  protected floor(valor: number): number {
    return Math.floor(valor);
  }

  private cargarTope(): void {
    this.politica.topeUvt().subscribe({
      next: (m) => this.tope.set(m),
      error: () => this.tope.set(null),
    });
  }
}
