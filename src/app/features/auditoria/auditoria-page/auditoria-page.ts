import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Select } from '../../../shared/ui/atoms/select/select';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { ToastService } from '../../../core/services/toast.service';
import { AccionAuditoria, PaginaAuditoria } from '../../../core/models/auditoria.model';
import { ModuloPermiso } from '../../../core/models/auth.model';
import { ETIQUETAS_MODULO } from '../../../core/models/etiquetas-modulo';
import { ACCIONES_AUDITORIA } from '../auditoria-ui';
import { LineaTiempoAuditoria } from '../linea-tiempo-auditoria/linea-tiempo-auditoria';

type FiltroTexto = 'desde' | 'hasta' | 'usuarioId' | 'modulo' | 'accion';

/** Pantalla central de auditoría (spec 2026-10-02 §9): quién cambió qué y cuándo, con filtros. */
@Component({
  selector: 'app-auditoria-page',
  standalone: true,
  imports: [Topbar, Icon, Button, Select, SearchBar, EmptyState, Paginator, FormsModule, LineaTiempoAuditoria],
  templateUrl: './auditoria-page.html',
  styleUrl: './auditoria-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaPage {
  private readonly auditoria = inject(AuditoriaService);
  private readonly toast = inject(ToastService);

  protected readonly acciones = ACCIONES_AUDITORIA;
  /** Sin los módulos de plataforma (tier SISTEMA): la auditoría es por negocio. */
  protected readonly modulos = (Object.entries(ETIQUETAS_MODULO) as [ModuloPermiso, string][])
    .filter(([m]) => m !== 'NEGOCIOS' && m !== 'PAQUETES')
    .sort((a, b) => a[1].localeCompare(b[1], 'es'));

  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly datos = signal<PaginaAuditoria | null>(null);
  protected readonly usuarios = signal<{ id: string; nombre: string }[]>([]);

  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly usuarioId = signal('');
  protected readonly modulo = signal<ModuloPermiso | ''>('');
  protected readonly accion = signal<AccionAuditoria | ''>('');
  protected readonly busqueda = signal('');
  protected readonly pagina = signal(1);
  protected readonly porPagina = signal(50);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.auditoria.usuarios().subscribe({ next: (u) => this.usuarios.set(u) });
    this.cargar();
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizador) clearTimeout(this.temporizador);
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.auditoria
      .consultar({
        desde: this.desde() || undefined,
        hasta: this.hasta() || undefined,
        usuarioId: this.usuarioId() || undefined,
        modulo: this.modulo() || undefined,
        accion: this.accion() || undefined,
        buscar: this.busqueda().trim() || undefined,
        pagina: this.pagina(),
        porPagina: this.porPagina(),
      })
      .subscribe({
        next: (d) => {
          this.datos.set(d);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(true);
          this.toast.error(err.error?.message ?? 'No se pudo cargar la auditoría');
        },
      });
  }

  protected filtrar(campo: FiltroTexto, valor: string): void {
    switch (campo) {
      case 'desde':
        this.desde.set(valor);
        break;
      case 'hasta':
        this.hasta.set(valor);
        break;
      case 'usuarioId':
        this.usuarioId.set(valor);
        break;
      case 'modulo':
        this.modulo.set(valor as ModuloPermiso | '');
        break;
      case 'accion':
        this.accion.set(valor as AccionAuditoria | '');
        break;
    }
    this.pagina.set(1);
    this.cargar();
  }

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.pagina.set(1);
      this.cargar();
    }, 350);
  }

  protected limpiarFiltros(): void {
    this.desde.set('');
    this.hasta.set('');
    this.usuarioId.set('');
    this.modulo.set('');
    this.accion.set('');
    this.busqueda.set('');
    this.pagina.set(1);
    this.cargar();
  }

  protected irAPagina(p: number): void {
    this.pagina.set(p);
    this.cargar();
  }

  protected cambiarPorPagina(n: number): void {
    this.porPagina.set(n);
    this.pagina.set(1);
    this.cargar();
  }

  protected totalPaginas(): number {
    const d = this.datos();
    return d ? Math.max(1, Math.ceil(d.total / d.porPagina)) : 1;
  }

  protected hayFiltros(): boolean {
    return !!(this.desde() || this.hasta() || this.usuarioId() || this.modulo() || this.accion() || this.busqueda());
  }
}
