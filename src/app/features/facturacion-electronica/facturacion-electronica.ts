import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../layout/topbar/topbar';
import { Button } from '../../shared/ui/atoms/button/button';
import { FormField } from '../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../shared/ui/atoms/input/input';
import { Switch } from '../../shared/ui/atoms/switch/switch';
import { Icon } from '../../shared/ui/atoms/icon/icon';
import { Combobox, ComboboxOption } from '../../shared/ui/molecules/combobox/combobox';
import { Stepper, PasoStepper } from '../../shared/ui/molecules/stepper/stepper';
import { FacturacionElectronicaService } from '../../core/services/facturacion-electronica.service';
import { NegociosService } from '../../core/services/negocios.service';
import { SuscripcionService } from '../../core/services/suscripcion.service';
import { ToastService } from '../../core/services/toast.service';
import { EstadoHabilitacion, HabilitacionFacturacionElectronica } from '../../core/models/facturacion-electronica.model';
import { MUNICIPIOS_COLOMBIA } from '../../core/data/municipios-colombia.data';

/** ID público de sandbox para el testset "pos" — no depende de trámite real, ver AlegraClientService.crearTestSet. */
const GOVERNMENT_TEST_SET_ID_SANDBOX = 'a70562e0-631e-4ceb-aa65-36887b57dc17';

/**
 * El backend solo tiene un estado intermedio (ESPERANDO_TRAMITE_DIAN) para dos
 * pantallas distintas del wizard: Paso 2 (confirmar que se hizo el trámite,
 * puramente informativo — no cambia el estado) y Paso 3 (cargar la
 * resolución). Por eso ESPERANDO_TRAMITE_DIAN arranca en el Paso 2; la
 * transición a Paso 3 la maneja `pasoManual`, no este mapa.
 */
const PASO_POR_ESTADO: Record<EstadoHabilitacion, number> = {
  DATOS_NEGOCIO: 1,
  ESPERANDO_TRAMITE_DIAN: 2,
  RESOLUCION_CARGADA: 4,
  TESTSET_EN_CURSO: 4,
  HABILITADO: 4,
  ERROR: 4,
};

@Component({
  selector: 'app-facturacion-electronica',
  standalone: true,
  imports: [Topbar, Button, FormField, Input, Switch, Icon, Combobox, Stepper, ReactiveFormsModule],
  templateUrl: './facturacion-electronica.html',
  styleUrl: './facturacion-electronica.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturacionElectronicaWizard {
  private readonly facturacionService = inject(FacturacionElectronicaService);
  private readonly negociosService = inject(NegociosService);
  private readonly suscripcionService = inject(SuscripcionService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly cargando = signal(true);
  protected readonly habilitacion = signal<HabilitacionFacturacionElectronica | null>(null);
  protected readonly guardando = signal(false);
  protected readonly enPrueba = signal(false);
  protected readonly activandoSandbox = signal(false);
  protected readonly volviendoAReal = signal(false);
  /** Override del paso derivado del estado — solo hace falta para la transición Paso 2 → 3 (ver nota de `PASO_POR_ESTADO`). */
  protected readonly pasoManual = signal<number | null>(null);

  protected readonly pasosStepper: PasoStepper[] = [
    { numero: 1, etiqueta: 'Datos del negocio' },
    { numero: 2, etiqueta: 'Trámite DIAN' },
    { numero: 3, etiqueta: 'Resolución' },
    { numero: 4, etiqueta: 'Confirmación' },
  ];

  /** Opciones del combobox de municipio — código DIVIPOLA como value, nombre + departamento para buscar/mostrar. */
  protected readonly municipioOptions: ComboboxOption[] = MUNICIPIOS_COLOMBIA.map((m) => ({
    value: m.codigo,
    label: m.nombre,
    sublabel: m.departamentoNombre,
  }));

  protected readonly formDatosNegocio = this.fb.nonNullable.group({
    razonSocial: ['', Validators.required],
    nit: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    direccion: ['', Validators.required],
    municipioCodigo: ['', Validators.required],
    useAlegraCertificate: [true],
    certificadoPfxBase64: [''],
    certificadoPassword: [''],
  });

  protected readonly formResolucion = this.fb.nonNullable.group({
    numero: ['', Validators.required],
    prefijo: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
    rangoDesde: [1, Validators.required],
    rangoHasta: [100000, Validators.required],
    technicalKey: ['', Validators.required],
    // Precargado con el id público de sandbox como conveniencia — el negocio lo
    // reemplaza por el suyo real (emitido por la DIAN) al pasar a producción.
    governmentTestSetId: [GOVERNMENT_TEST_SET_ID_SANDBOX, Validators.required],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.cargando.set(true);
    // NIT/email viven en Negocio, no en la Habilitación — se precargan acá para
    // no obligar a re-escribirlos si el negocio ya los tenía cargados (por
    // ejemplo desde /mi-negocio, donde son opcionales para un negocio sin DIAN).
    this.negociosService.miNegocio().subscribe({
      next: (negocio) => {
        if (negocio.nit) this.formDatosNegocio.controls.nit.setValue(negocio.nit);
        if (negocio.email) this.formDatosNegocio.controls.email.setValue(negocio.email);
      },
    });
    this.facturacionService.miHabilitacion().subscribe({
      next: (data) => {
        this.habilitacion.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo cargar el estado de facturación electrónica');
      },
    });
    this.suscripcionService.miEstado().subscribe({
      next: (data) => this.enPrueba.set(data.estado === 'PRUEBA'),
      error: () => {},
    });
  }

  protected pasoActual(): number {
    if (this.pasoManual() !== null) return this.pasoManual()!;
    const estado = this.habilitacion()?.estado ?? 'DATOS_NEGOCIO';
    return PASO_POR_ESTADO[estado];
  }

  protected guardarDatosNegocio(): void {
    if (this.formDatosNegocio.invalid) {
      this.formDatosNegocio.markAllAsTouched();
      return;
    }
    const raw = this.formDatosNegocio.getRawValue();
    const municipio = MUNICIPIOS_COLOMBIA.find((m) => m.codigo === raw.municipioCodigo);
    if (!municipio) {
      this.toast.error('Elegí un municipio de la lista');
      return;
    }
    this.guardando.set(true);
    this.facturacionService
      .actualizarDatosNegocio({
        razonSocial: raw.razonSocial,
        nit: raw.nit,
        email: raw.email,
        direccion: raw.direccion,
        ciudadNombre: municipio.nombre,
        ciudadCodigo: municipio.codigo,
        departamentoCodigo: municipio.departamentoCodigo,
        useAlegraCertificate: raw.useAlegraCertificate,
        certificadoPfxBase64: raw.certificadoPfxBase64 || undefined,
        certificadoPassword: raw.certificadoPassword || undefined,
      })
      .subscribe({
        next: (data) => {
          this.guardando.set(false);
          this.habilitacion.set(data);
          this.toast.success('Datos guardados');
        },
        error: (err) => {
          this.guardando.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo guardar');
        },
      });
  }

  protected probarSandbox(): void {
    if (this.formDatosNegocio.invalid) {
      this.formDatosNegocio.markAllAsTouched();
      return;
    }
    const raw = this.formDatosNegocio.getRawValue();
    const municipio = MUNICIPIOS_COLOMBIA.find((m) => m.codigo === raw.municipioCodigo);
    if (!municipio) {
      this.toast.error('Elegí un municipio de la lista');
      return;
    }
    this.activandoSandbox.set(true);
    this.facturacionService
      .activarModoSandboxDePrueba({
        razonSocial: raw.razonSocial,
        nit: raw.nit,
        email: raw.email,
        direccion: raw.direccion,
        ciudadNombre: municipio.nombre,
        ciudadCodigo: municipio.codigo,
        departamentoCodigo: municipio.departamentoCodigo,
        useAlegraCertificate: true,
      })
      .subscribe({
        next: (data) => {
          this.activandoSandbox.set(false);
          this.habilitacion.set(data);
          this.pasoManual.set(null);
          if (data.estado === 'HABILITADO') this.toast.success('Modo sandbox activado — ya podés facturar de prueba');
        },
        error: (err) => {
          this.activandoSandbox.set(false);
          this.toast.error(err.error?.message ?? 'No se pudo activar el modo sandbox');
        },
      });
  }

  protected activarReal(): void {
    this.volviendoAReal.set(true);
    this.facturacionService.volverAModoReal().subscribe({
      next: (data) => {
        this.volviendoAReal.set(false);
        this.habilitacion.set(data);
        this.pasoManual.set(3);
      },
      error: (err) => {
        this.volviendoAReal.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo salir del modo sandbox');
      },
    });
  }

  protected abrirPortalDian(): void {
    window.open('https://muisca.dian.gov.co', '_blank', 'noopener,noreferrer');
  }

  protected confirmarTramite(): void {
    this.guardando.set(true);
    this.facturacionService.confirmarTramiteDian().subscribe({
      next: (data) => {
        this.guardando.set(false);
        this.habilitacion.set(data);
        // El estado sigue en ESPERANDO_TRAMITE_DIAN (Paso 2 es informativo, no lo cambia) —
        // el avance visual al formulario de resolución (Paso 3) lo maneja este override local.
        this.pasoManual.set(3);
      },
      error: (err) => {
        this.guardando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo continuar');
      },
    });
  }

  protected guardarResolucion(): void {
    if (this.formResolucion.invalid) {
      this.formResolucion.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.facturacionService.cargarResolucion(this.formResolucion.getRawValue()).subscribe({
      next: (data) => {
        this.guardando.set(false);
        this.habilitacion.set(data);
        // Ahora sí el estado cambió (RESOLUCION_CARGADA) — soltamos el override local.
        this.pasoManual.set(null);
        this.toast.success('Resolución cargada');
      },
      error: (err) => {
        this.guardando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la resolución');
      },
    });
  }

  protected confirmarTestSet(): void {
    this.guardando.set(true);
    this.facturacionService.confirmarTestSet().subscribe({
      next: (data) => {
        this.guardando.set(false);
        this.habilitacion.set(data);
        if (data.estado === 'HABILITADO') this.toast.success('¡Facturación electrónica habilitada!');
        else this.toast.error(data.errorMensaje ?? 'El testset no pasó — revisá los datos e intentá de nuevo');
      },
      error: (err) => {
        this.guardando.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo confirmar el testset');
      },
    });
  }
}
