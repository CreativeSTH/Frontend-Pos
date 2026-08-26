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
import { AuthService } from '../../../core/services/auth.service';
import { TiendaContextService } from '../../../core/services/tienda-context.service';
import { ConfiguracionTiendaOnline, PLANTILLAS, PlantillaTienda } from '../../../core/models/tienda-online.model';
import { Bodega } from '../../../core/models/bodega.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { TiendaHomeSwitch } from '../../tienda/home-switch/home-switch';
import { environment } from '../../../../environments/environment';

const NUEVA_BODEGA = '__nueva__';

@Component({
  selector: 'app-tienda-online',
  standalone: true,
  imports: [Topbar, Button, Input, Select, Switch, FormField, FormsModule, TiendaHomeSwitch],
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
  private readonly authService = inject(AuthService);

  protected readonly plantillas = PLANTILLAS;
  private readonly tiendaContext = inject(TiendaContextService);
  protected readonly guardandoPlantilla = signal(false);
  protected readonly subiendoLogo = signal(false);
  protected readonly subiendoBanner = signal(false);
  protected readonly guardandoLegales = signal(false);
  protected readonly terminos = signal('');
  protected readonly tratamientoDatos = signal('');
  protected readonly politicaEnvios = signal('');

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

  /** Origen actual del panel (no hardcodeado) — funciona igual en localhost que el día que esto viva en un dominio real. */
  protected readonly linkTienda = computed(() => {
    const negocioId = this.authService.usuario()?.negocioId;
    return negocioId ? `${window.location.origin}/tienda/${negocioId}` : '';
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.tiendaOnlineService.obtenerConfiguracion().subscribe({
      next: (config) => {
        this.configuracion.set(config);
        this.bodegaSeleccionada.set(config.bodegaId ?? '');
        this.terminos.set(config.terminos ?? '');
        this.tratamientoDatos.set(config.tratamientoDatos ?? '');
        this.politicaEnvios.set(config.politicaEnvios ?? '');
        this.cargarBodegasYSucursales();
        this.actualizarPreview();
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

  protected elegirPlantilla(plantilla: PlantillaTienda): void {
    this.guardandoPlantilla.set(true);
    this.tiendaOnlineService.actualizarPlantilla(plantilla).subscribe({
      next: () => {
        this.guardandoPlantilla.set(false);
        this.configuracion.update((c) => (c ? { ...c, plantilla } : c));
        this.actualizarPreview();
        this.toast.success('Plantilla guardada');
      },
      error: (err) => {
        this.guardandoPlantilla.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la plantilla');
      },
    });
  }

  /** El backend devuelve rutas relativas (`/uploads/...`) — se resuelven acá para las miniaturas de logo/banners que muestra este mismo editor. */
  protected resolverImagen(url: string): string {
    return `${environment.assetsUrl}${url}`;
  }

  protected subirLogo(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    this.subiendoLogo.set(true);
    this.tiendaOnlineService.subirLogo(archivo).subscribe({
      next: ({ logoUrl }) => {
        this.subiendoLogo.set(false);
        this.configuracion.update((c) => (c ? { ...c, logoUrl } : c));
        this.actualizarPreview();
        this.toast.success('Logo actualizado');
      },
      error: (err) => {
        this.subiendoLogo.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo subir el logo');
      },
    });
  }

  protected subirBanner(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    this.subiendoBanner.set(true);
    this.tiendaOnlineService.subirBanner(archivo).subscribe({
      next: ({ banners }) => {
        this.subiendoBanner.set(false);
        this.configuracion.update((c) => (c ? { ...c, banners } : c));
        this.actualizarPreview();
        this.toast.success('Banner agregado');
      },
      error: (err) => {
        this.subiendoBanner.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo subir el banner');
      },
    });
  }

  protected eliminarBanner(index: number): void {
    this.tiendaOnlineService.eliminarBanner(index).subscribe({
      next: ({ banners }) => {
        this.configuracion.update((c) => (c ? { ...c, banners } : c));
        this.actualizarPreview();
      },
      error: (err) => this.toast.error(err.error?.message ?? 'No se pudo quitar el banner'),
    });
  }

  protected guardarLegales(): void {
    this.guardandoLegales.set(true);
    this.tiendaOnlineService
      .actualizarLegales({
        terminos: this.terminos(),
        tratamientoDatos: this.tratamientoDatos(),
        politicaEnvios: this.politicaEnvios(),
      })
      .subscribe({
        next: () => {
          this.guardandoLegales.set(false);
          this.toast.success('Textos legales guardados');
        },
        error: (err) => {
          this.guardandoLegales.set(false);
          this.toast.error(err.error?.message ?? 'No se pudieron guardar los textos');
        },
      });
  }

  /** Sincroniza `TiendaContextService` con la config actual del editor para que el preview embebido (`TiendaHomeSwitch`) refleje selecciones sin guardar todavía. */
  private actualizarPreview(): void {
    const config = this.configuracion();
    if (!config) return;
    this.tiendaContext.establecerPreview({
      activa: true,
      plantilla: config.plantilla,
      logoUrl: config.logoUrl,
      banners: config.banners,
      productos: [],
    });
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

  protected copiarLink(): void {
    navigator.clipboard.writeText(this.linkTienda()).then(
      () => this.toast.success('Link copiado'),
      () => this.toast.error('No se pudo copiar el link'),
    );
  }

  protected abrirTienda(): void {
    window.open(this.linkTienda(), '_blank', 'noopener');
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
