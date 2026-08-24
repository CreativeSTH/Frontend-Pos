import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Switch } from '../../../shared/ui/atoms/switch/switch';
import { ImageUpload } from '../../../shared/ui/molecules/image-upload/image-upload';
import { Stepper, PasoStepper } from '../../../shared/ui/molecules/stepper/stepper';
import { ReciboPreview } from '../../../shared/ui/organisms/recibo-preview/recibo-preview';
import { PlantillasComprobanteService } from '../../../core/services/plantillas-comprobante.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { SucursalContextService } from '../../../core/services/sucursal-context.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfiguracionPlantilla, TipoComprobante } from '../../../core/models/plantilla-comprobante.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { environment } from '../../../../environments/environment';

type PasoWizard = 1 | 2 | 3 | 4 | 5;

/**
 * Crear/editar una plantilla de recibo/factura — mismo patrón de wizard que
 * `features/asistente` y `features/graficos/graficos-wizard`: un componente,
 * `paso = signal<N>(1)`, avance explícito por paso.
 */
@Component({
  selector: 'app-facturacion-wizard',
  standalone: true,
  imports: [
    Topbar,
    Button,
    Icon,
    FormField,
    Input,
    Switch,
    ImageUpload,
    Stepper,
    ReciboPreview,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './facturacion-wizard.html',
  styleUrl: './facturacion-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturacionWizard {
  private readonly plantillasService = inject(PlantillasComprobanteService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly sucursalContext = inject(SucursalContextService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly paso = signal<PasoWizard>(1);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly logoUrlExistente = signal<string | null>(null);
  protected readonly logoSeleccionado = signal<File | null>(null);

  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly sucursalesSeleccionadas = signal<Set<string>>(new Set());
  private sucursalesOriginales = new Set<string>();

  protected readonly formPrincipal = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipo: ['RECIBO' as TipoComprobante, Validators.required],
  });

  protected readonly formNegocio = this.fb.nonNullable.group({
    nombrePersonaNatural: [''],
    direccion: [''],
    telefono: [''],
  });

  protected readonly formMensajes = this.fb.nonNullable.group({
    mensajeCierre: [''],
    terminos: [''],
  });

  protected readonly formDian = this.fb.nonNullable.group({
    resolucionNumero: [''],
    prefijo: [''],
    rangoDesde: [null as number | null],
    rangoHasta: [null as number | null],
    fechaVigencia: [''],
    regimenFiscal: [''],
  });

  protected readonly camposExtra = this.fb.array<FormGroup<{ etiqueta: FormControl<string>; valor: FormControl<string> }>>(
    [],
  );

  protected readonly esPredeterminada = signal(false);

  private previewNegocioNombre = 'Mi negocio';

  constructor() {
    this.cargar();
  }

  /**
   * Métodos planos (no signals/computed) a propósito: los `FormGroup` de
   * Reactive Forms no son signals, así que `computed()` nunca detectaría
   * cambios en `tipo`. Los eventos de los form directives sí marcan el
   * componente para re-chequeo (incluso con OnPush), así que llamarlos
   * directo desde el template alcanza.
   */
  protected esFactura(): boolean {
    return this.formPrincipal.controls.tipo.value === 'FACTURA';
  }

  protected pasosStepper(): PasoStepper[] {
    const base: PasoStepper[] = [
      { numero: 1, etiqueta: 'Tipo' },
      { numero: 2, etiqueta: 'Negocio' },
      { numero: 3, etiqueta: 'Mensajes' },
    ];
    if (this.esFactura()) {
      base.push({ numero: 4, etiqueta: 'DIAN' });
    }
    base.push({ numero: 5, etiqueta: 'Revisar' });
    return base;
  }

  private nuevoCampoExtra() {
    return this.fb.nonNullable.group({
      etiqueta: ['', Validators.required],
      valor: ['', Validators.required],
    });
  }

  protected agregarCampoExtra(): void {
    this.camposExtra.push(this.nuevoCampoExtra());
  }

  protected quitarCampoExtra(index: number): void {
    this.camposExtra.removeAt(index);
  }

  private cargar(): void {
    const plantillaId = this.route.snapshot.queryParamMap.get('plantillaId');
    this.editandoId.set(plantillaId);
    const usuario = this.auth.usuario();
    this.previewNegocioNombre = usuario?.nombre ?? 'Mi negocio';

    forkJoin({
      sucursales: this.sucursalesService.findAll(),
    }).subscribe({
      next: ({ sucursales }) => {
        this.sucursales.set(sucursales);
        if (plantillaId) {
          this.cargarExistente(plantillaId, sucursales);
        } else {
          this.prefillDesdeSucursalActual(sucursales);
          this.cargando.set(false);
        }
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la información necesaria');
      },
    });
  }

  private prefillDesdeSucursalActual(sucursales: Sucursal[]): void {
    const sucursalId = this.sucursalContext.sucursalId();
    const sucursal = sucursales.find((s) => s.id === sucursalId);
    if (sucursal) {
      this.formNegocio.patchValue({ direccion: sucursal.direccion ?? '', telefono: sucursal.telefono ?? '' });
    }
  }

  private cargarExistente(id: string, sucursales: Sucursal[]): void {
    this.plantillasService.findOne(id).subscribe({
      next: (plantilla) => {
        this.formPrincipal.setValue({ nombre: plantilla.nombre, tipo: plantilla.tipo });
        this.formNegocio.patchValue({
          nombrePersonaNatural: plantilla.configuracion.nombrePersonaNatural ?? '',
          direccion: plantilla.configuracion.direccion ?? '',
          telefono: plantilla.configuracion.telefono ?? '',
        });
        this.formMensajes.patchValue({
          mensajeCierre: plantilla.configuracion.mensajeCierre ?? '',
          terminos: plantilla.configuracion.terminos ?? '',
        });
        const dian = plantilla.configuracion.dian;
        this.formDian.patchValue({
          resolucionNumero: dian?.resolucionNumero ?? '',
          prefijo: dian?.prefijo ?? '',
          rangoDesde: dian?.rangoDesde ?? null,
          rangoHasta: dian?.rangoHasta ?? null,
          fechaVigencia: dian?.fechaVigencia ?? '',
          regimenFiscal: dian?.regimenFiscal ?? '',
        });
        this.camposExtra.clear();
        for (const campo of dian?.camposExtra ?? []) {
          this.camposExtra.push(
            this.fb.nonNullable.group({
              etiqueta: [campo.etiqueta, Validators.required],
              valor: [campo.valor, Validators.required],
            }),
          );
        }
        this.esPredeterminada.set(plantilla.esPredeterminada);
        this.logoUrlExistente.set(plantilla.logoUrl ?? null);

        const campo = plantilla.tipo === 'FACTURA' ? 'plantillaFacturaDefectoId' : 'plantillaReciboDefectoId';
        const seleccionadas = new Set(sucursales.filter((s) => s[campo] === id).map((s) => s.id));
        this.sucursalesSeleccionadas.set(seleccionadas);
        this.sucursalesOriginales = new Set(seleccionadas);

        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la plantilla');
      },
    });
  }

  protected toggleSucursal(sucursalId: string): void {
    const actual = new Set(this.sucursalesSeleccionadas());
    if (actual.has(sucursalId)) {
      actual.delete(sucursalId);
    } else {
      actual.add(sucursalId);
    }
    this.sucursalesSeleccionadas.set(actual);
  }

  protected logoUrlPreview(): string | null {
    const existente = this.logoUrlExistente();
    return existente ? `${environment.assetsUrl}${existente}` : null;
  }

  protected siguiente(): void {
    const actual = this.paso();
    if (!this.puedeAvanzar(actual)) {
      this.marcarPasoInvalido(actual);
      return;
    }
    const pasos = this.pasosStepper().map((p) => p.numero);
    const idx = pasos.indexOf(actual);
    this.paso.set(pasos[idx + 1] as PasoWizard);
  }

  protected anterior(): void {
    const pasos = this.pasosStepper().map((p) => p.numero);
    const idx = pasos.indexOf(this.paso());
    if (idx > 0) this.paso.set(pasos[idx - 1] as PasoWizard);
  }

  private puedeAvanzar(paso: PasoWizard): boolean {
    if (paso === 1) return this.formPrincipal.valid;
    if (paso === 4) return this.formDian.valid && this.camposExtra.valid;
    return true;
  }

  private marcarPasoInvalido(paso: PasoWizard): void {
    if (paso === 1) this.formPrincipal.markAllAsTouched();
    if (paso === 4) {
      this.formDian.markAllAsTouched();
      this.camposExtra.markAllAsTouched();
    }
  }

  private construirConfiguracion(): ConfiguracionPlantilla {
    const negocio = this.formNegocio.getRawValue();
    const mensajes = this.formMensajes.getRawValue();
    const configuracion: ConfiguracionPlantilla = {
      nombrePersonaNatural: negocio.nombrePersonaNatural || undefined,
      direccion: negocio.direccion || undefined,
      telefono: negocio.telefono || undefined,
      mensajeCierre: mensajes.mensajeCierre || undefined,
      terminos: mensajes.terminos || undefined,
    };
    if (this.esFactura()) {
      const dian = this.formDian.getRawValue();
      configuracion.dian = {
        resolucionNumero: dian.resolucionNumero || undefined,
        prefijo: dian.prefijo || undefined,
        rangoDesde: dian.rangoDesde ?? undefined,
        rangoHasta: dian.rangoHasta ?? undefined,
        fechaVigencia: dian.fechaVigencia || undefined,
        regimenFiscal: dian.regimenFiscal || undefined,
        camposExtra: this.camposExtra.getRawValue(),
      };
    }
    return configuracion;
  }

  /**
   * Método plano (no signal) a propósito: los `FormGroup` de Reactive Forms
   * no son signals, así que `computed()` nunca detectaría los cambios de
   * texto. Los eventos de los form directives sí marcan el componente para
   * re-chequeo (incluso con OnPush), así que llamarlo directo desde el
   * template alcanza para que la vista previa se actualice en vivo.
   */
  protected previewConfiguracion(): ConfiguracionPlantilla {
    return this.construirConfiguracion();
  }

  protected get previewNombreNegocio(): string {
    return this.previewNegocioNombre;
  }

  protected guardar(): void {
    if (this.formPrincipal.invalid) {
      this.toast.error('Revisá el paso 1 antes de guardar');
      return;
    }
    this.guardando.set(true);
    const payload = {
      nombre: this.formPrincipal.controls.nombre.value,
      tipo: this.formPrincipal.controls.tipo.value,
      esPredeterminada: this.esPredeterminada(),
      configuracion: this.construirConfiguracion(),
    };
    const editandoId = this.editandoId();
    const request$ = editandoId
      ? this.plantillasService.update(editandoId, payload, this.logoSeleccionado())
      : this.plantillasService.create(payload, this.logoSeleccionado());

    request$.subscribe({
      next: (plantilla) => {
        this.aplicarSeleccionSucursales(plantilla.id, plantilla.tipo);
      },
      error: (err) => {
        this.guardando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la plantilla');
      },
    });
  }

  private aplicarSeleccionSucursales(plantillaId: string, tipo: TipoComprobante): void {
    const campo = tipo === 'FACTURA' ? 'plantillaFacturaDefectoId' : 'plantillaReciboDefectoId';
    const actuales = this.sucursalesSeleccionadas();
    const cambios: { sucursalId: string; valor: string | null }[] = [];

    for (const sucursal of this.sucursales()) {
      const marcada = actuales.has(sucursal.id);
      const eraOriginal = this.sucursalesOriginales.has(sucursal.id);
      if (marcada && !eraOriginal) cambios.push({ sucursalId: sucursal.id, valor: plantillaId });
      if (!marcada && eraOriginal) cambios.push({ sucursalId: sucursal.id, valor: null });
    }

    if (cambios.length === 0) {
      this.finalizarGuardado();
      return;
    }

    const peticiones = cambios.map((c) =>
      this.sucursalesService.updateDefaultPlantilla(c.sucursalId, campo, c.valor),
    );
    forkJoin(peticiones).subscribe({
      next: () => this.finalizarGuardado(),
      error: () => {
        this.guardando.set(false);
        this.toast.error('La plantilla se guardó, pero no se pudo actualizar el default de alguna sucursal');
        this.router.navigate(['/configuracion/facturacion']);
      },
    });
  }

  private finalizarGuardado(): void {
    this.guardando.set(false);
    this.toast.success(this.editandoId() ? 'Plantilla actualizada' : 'Plantilla creada');
    this.router.navigate(['/configuracion/facturacion']);
  }

  protected salir(): void {
    this.router.navigate(['/configuracion/facturacion']);
  }
}
