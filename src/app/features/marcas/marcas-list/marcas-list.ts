import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { Select } from '../../../shared/ui/atoms/select/select';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { Paginator } from '../../../shared/ui/molecules/paginator/paginator';
import { usePaginacion } from '../../../shared/utils/paginacion.util';
import { MarcasService } from '../../../core/services/marcas.service';
import { LineasService } from '../../../core/services/lineas.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Marca } from '../../../core/models/marca.model';
import { Linea } from '../../../core/models/linea.model';

@Component({
  selector: 'app-marcas-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, Modal, FormField, Input, Select, EmptyState, Paginator, ReactiveFormsModule, FormsModule],
  templateUrl: './marcas-list.html',
  styleUrl: './marcas-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarcasList {
  private readonly marcasService = inject(MarcasService);
  private readonly lineasService = inject(LineasService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly marcas = signal<Marca[]>([]);
  protected readonly lineas = signal<Linea[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    marcaPadreId: [''],
  });

  /** Marcas principales (sin padre) — únicas elegibles como "marca padre" de otra. */
  protected readonly marcasPrincipales = () => this.marcas().filter((m) => !m.marcaPadreId);

  /** Marcas ordenadas con cada sub-marca justo debajo de su marca padre. */
  protected readonly marcasOrdenadas = () => {
    const todas = this.marcas();
    const resultado: Marca[] = [];
    for (const principal of this.marcasPrincipales()) {
      resultado.push(principal);
      resultado.push(...todas.filter((m) => m.marcaPadreId === principal.id));
    }
    return resultado;
  };

  protected readonly pag = usePaginacion(this.marcasOrdenadas);
  protected readonly marcasPaginadas = this.pag.itemsPaginados;

  protected readonly showLineas = signal(false);
  protected readonly marcaLineas = signal<Marca | null>(null);
  protected readonly showLineaForm = signal(false);
  protected readonly editingLineaId = signal<string | null>(null);
  protected readonly lineaNombre = signal('');
  protected readonly savingLinea = signal(false);

  protected readonly lineasDeMarcaActual = () => {
    const marca = this.marcaLineas();
    if (!marca) return [];
    return this.lineasDe(marca.id);
  };

  protected lineasDe(marcaId: string): Linea[] {
    return this.lineas().filter((l) => l.marcaId === marcaId);
  }

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      marcas: this.marcasService.findAll(),
      lineas: this.lineasService.findAll(),
    }).subscribe({
      next: ({ marcas, lineas }) => {
        this.marcas.set(marcas);
        this.lineas.set(lineas);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar las marcas');
      },
    });
  }

  protected esSubMarca(marca: Marca): boolean {
    return !!marca.marcaPadreId;
  }

  protected nombreMarcaPadre(id?: string): string {
    if (!id) return '—';
    return this.marcas().find((m) => m.id === id)?.nombre ?? '—';
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', marcaPadreId: '' });
    this.showForm.set(true);
  }

  protected openEdit(marca: Marca): void {
    this.editingId.set(marca.id);
    this.form.reset({ nombre: marca.nombre, marcaPadreId: marca.marcaPadreId ?? '' });
    this.showForm.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = { nombre: raw.nombre, marcaPadreId: raw.marcaPadreId || undefined };
    const editingId = this.editingId();
    const request$ = editingId
      ? this.marcasService.update(editingId, payload)
      : this.marcasService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Marca actualizada' : 'Marca creada');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la marca');
      },
    });
  }

  protected async eliminar(marca: Marca): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar "${marca.nombre}"?`, danger: true }))) return;
    this.marcasService.remove(marca.id).subscribe({
      next: () => {
        this.toast.success('Marca eliminada');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar la marca'),
    });
  }

  protected abrirLineas(marca: Marca): void {
    this.marcaLineas.set(marca);
    this.showLineas.set(true);
  }

  protected abrirNuevaLinea(): void {
    this.editingLineaId.set(null);
    this.lineaNombre.set('');
    this.showLineaForm.set(true);
  }

  protected abrirEditarLinea(linea: Linea): void {
    this.editingLineaId.set(linea.id);
    this.lineaNombre.set(linea.nombre);
    this.showLineaForm.set(true);
  }

  protected guardarLinea(): void {
    const marca = this.marcaLineas();
    if (!marca || !this.lineaNombre().trim()) return;
    this.savingLinea.set(true);
    const editingLineaId = this.editingLineaId();
    const request$ = editingLineaId
      ? this.lineasService.update(editingLineaId, this.lineaNombre())
      : this.lineasService.create(marca.id, this.lineaNombre());

    request$.subscribe({
      next: (linea) => {
        this.savingLinea.set(false);
        this.showLineaForm.set(false);
        this.toast.success(editingLineaId ? 'Línea actualizada' : 'Línea creada');
        if (editingLineaId) {
          this.lineas.update((filas) => filas.map((l) => (l.id === editingLineaId ? linea : l)));
        } else {
          this.lineas.update((filas) => [...filas, linea]);
        }
      },
      error: (err) => {
        this.savingLinea.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la línea');
      },
    });
  }

  protected async eliminarLinea(linea: Linea): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar la línea "${linea.nombre}"?`, danger: true }))) return;
    this.lineasService.remove(linea.id).subscribe({
      next: () => {
        this.toast.success('Línea eliminada');
        this.lineas.update((filas) => filas.filter((l) => l.id !== linea.id));
      },
      error: () => this.toast.error('No se pudo eliminar la línea'),
    });
  }
}
