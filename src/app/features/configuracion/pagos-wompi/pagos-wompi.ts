import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { PagosWompiService } from '../../../core/services/pagos-wompi.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ConfiguracionWompi } from '../../../core/models/pago-wompi.model';

@Component({
  selector: 'app-pagos-wompi',
  standalone: true,
  imports: [Topbar, Button, Icon, Input, Switch, FormField, FormsModule],
  templateUrl: './pagos-wompi.html',
  styleUrl: './pagos-wompi.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagosWompi {
  private readonly pagosWompiService = inject(PagosWompiService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly cambiandoEstado = signal(false);
  protected readonly configuracion = signal<ConfiguracionWompi | null>(null);

  // Solo `llavePublica` se precarga: es la única de las 4 credenciales que el
  // backend devuelve (`obtenerConfiguracionPublica`). `llavePrivada`,
  // `llaveSecretaEventos` y `llaveIntegridad` nunca viajan de vuelta, así que
  // siempre arrancan vacías — a diferencia del form de editar Usuario, acá el
  // backend exige las 4 no-vacías en cada guardado (no hay "dejar en blanco
  // para no cambiar"): si el negocio ya está configurado y solo quiere tocar
  // la llave pública, igual tiene que volver a pegar las otras tres.
  protected readonly llavePublica = signal('');
  protected readonly llavePrivada = signal('');
  protected readonly llaveSecretaEventos = signal('');
  protected readonly llaveIntegridad = signal('');

  // Métodos habilitados: a diferencia de las 3 credenciales de arriba, estos
  // 4 sí viajan de vuelta en cada GET, así que se precargan igual que
  // `llavePublica` (no como `llavePrivada`/`llaveSecretaEventos`, que el
  // backend nunca reenvía).
  protected readonly qrHabilitado = signal(true);
  protected readonly nequiHabilitado = signal(true);
  protected readonly pseHabilitado = signal(true);
  protected readonly tarjetaHabilitado = signal(true);

  protected readonly configurado = computed(() => this.configuracion()?.configurado ?? false);
  protected readonly activo = computed(() => this.configuracion()?.activo ?? false);

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.pagosWompiService.obtenerConfiguracion().subscribe({
      next: (config) => {
        this.configuracion.set(config);
        this.llavePublica.set(config.llavePublica ?? '');
        this.llavePrivada.set('');
        this.llaveSecretaEventos.set('');
        this.llaveIntegridad.set('');
        this.qrHabilitado.set(config.qrHabilitado);
        this.nequiHabilitado.set(config.nequiHabilitado);
        this.pseHabilitado.set(config.pseHabilitado);
        this.tarjetaHabilitado.set(config.tarjetaHabilitado);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la configuración de Wompi');
      },
    });
  }

  protected guardar(): void {
    const llavePublica = this.llavePublica().trim();
    const llavePrivada = this.llavePrivada().trim();
    const llaveSecretaEventos = this.llaveSecretaEventos().trim();
    const llaveIntegridad = this.llaveIntegridad().trim();

    if (!llavePublica || !llavePrivada || !llaveSecretaEventos || !llaveIntegridad) {
      this.toast.error('Completá las 4 credenciales para guardar');
      return;
    }

    this.guardando.set(true);
    this.pagosWompiService
      .guardarConfiguracion({
        llavePublica,
        llavePrivada,
        llaveSecretaEventos,
        llaveIntegridad,
        qrHabilitado: this.qrHabilitado(),
        nequiHabilitado: this.nequiHabilitado(),
        pseHabilitado: this.pseHabilitado(),
        tarjetaHabilitado: this.tarjetaHabilitado(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toast.success('Configuración de Wompi guardada');
          this.cargar();
        },
        error: (err) => {
          this.guardando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo guardar la configuración');
        },
      });
  }

  protected async alternarActivo(valor: boolean): Promise<void> {
    // El switch queda deshabilitado mientras `!configurado()`, pero por si
    // igual llega un evento (ej. binding stale), no se dispara ninguna
    // llamada sin las 3 credenciales guardadas.
    if (!this.configurado()) return;

    if (!valor) {
      const confirmado = await this.confirmService.ask({
        message: 'Se van a dejar de aceptar pagos con Wompi en el punto de venta. ¿Desactivarlo de todas formas?',
        danger: true,
      });
      if (!confirmado) return;
    }

    this.cambiandoEstado.set(true);
    const request$ = valor ? this.pagosWompiService.activar() : this.pagosWompiService.desactivar();
    request$.subscribe({
      next: () => {
        this.cambiandoEstado.set(false);
        this.configuracion.update((c) => (c ? { ...c, activo: valor } : c));
        this.toast.success(valor ? 'Wompi activado' : 'Wompi desactivado');
      },
      error: (err) => {
        this.cambiandoEstado.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cambiar el estado de Wompi');
      },
    });
  }
}
