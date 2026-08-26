import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { TiendaOnlineService } from '../../../core/services/tienda-online.service';
import { BodegasService } from '../../../core/services/bodegas.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfiguracionTiendaOnline } from '../../../core/models/tienda-online.model';
import { Bodega } from '../../../core/models/bodega.model';
import { Sucursal } from '../../../core/models/sucursal.model';

const NUEVA_BODEGA = '__nueva__';

@Component({
  selector: 'app-tienda-online',
  standalone: true,
  imports: [Topbar, Button, Input, Select, Switch, FormField, FormsModule],
  templateUrl: './tienda-online.html',
  styleUrl: './tienda-online.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaOnlineConfig {
  protected readonly NUEVA_BODEGA = NUEVA_BODEGA;

  private readonly tiendaOnlineService = inject(TiendaOnlineService);
  private readonly bodegasService = inject(BodegasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toast = inject(ToastService);

  protected readonly cargando = signal(true);
  protected readonly cambiandoEstado = signal(false);
  protected readonly guardandoBodega = signal(false);
  protected readonly configuracion = signal<ConfiguracionTiendaOnline | null>(null);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);

  protected readonly bodegaSeleccionada = signal<string>('');
  protected readonly sucursalNuevaBodega = signal('');
  protected readonly nombreNuevaBodega = signal('');

  protected readonly activo = computed(() => this.configuracion()?.activo ?? false);
  protected readonly hayBodega = computed(() => !!this.configuracion()?.bodegaId);

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.tiendaOnlineService.obtenerConfiguracion().subscribe({
      next: (config) => {
        this.configuracion.set(config);
        this.bodegaSeleccionada.set(config.bodegaId ?? '');
        this.cargarBodegasYSucursales();
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la configuración de la tienda online');
      },
    });
  }

  private cargarBodegasYSucursales(): void {
    this.bodegasService.findAll().subscribe({
      next: (bodegas) => this.bodegas.set(bodegas),
    });
    this.sucursalesService.findAll().subscribe({
      next: (sucursales) => {
        this.sucursales.set(sucursales);
        this.cargando.set(false);
      },
    });
  }

  protected guardarBodega(): void {
    const seleccion = this.bodegaSeleccionada();
    if (!seleccion) return;

    if (seleccion === NUEVA_BODEGA) {
      const sucursalId = this.sucursalNuevaBodega();
      const nombre = this.nombreNuevaBodega().trim();
      if (!sucursalId || !nombre) {
        this.toast.error('Elegí la sucursal y el nombre de la bodega nueva');
        return;
      }
      this.guardandoBodega.set(true);
      this.bodegasService.create({ sucursalId, nombre }).subscribe({
        next: (bodegaCreada) => this.asignarBodega(bodegaCreada.id),
        error: (err) => {
          this.guardandoBodega.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo crear la bodega');
        },
      });
      return;
    }

    this.asignarBodega(seleccion);
  }

  private asignarBodega(bodegaId: string): void {
    this.guardandoBodega.set(true);
    this.tiendaOnlineService.elegirBodega(bodegaId).subscribe({
      next: () => {
        this.guardandoBodega.set(false);
        this.toast.success('Bodega de la tienda online guardada');
        this.cargar();
      },
      error: (err) => {
        this.guardandoBodega.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la bodega');
      },
    });
  }

  protected alternarActivo(valor: boolean): void {
    if (!this.hayBodega()) return;

    this.cambiandoEstado.set(true);
    const request$ = valor ? this.tiendaOnlineService.activar() : this.tiendaOnlineService.desactivar();
    request$.subscribe({
      next: () => {
        this.cambiandoEstado.set(false);
        this.configuracion.update((c) => (c ? { ...c, activo: valor } : c));
        this.toast.success(valor ? 'Tienda online activada' : 'Tienda online desactivada');
      },
      error: (err) => {
        this.cambiandoEstado.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cambiar el estado de la tienda online');
      },
    });
  }
}
