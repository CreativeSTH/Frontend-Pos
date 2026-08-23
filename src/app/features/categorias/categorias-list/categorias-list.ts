import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { CategoriasService } from '../../../core/services/categorias.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Categoria } from '../../../core/models/categoria.model';

@Component({
  selector: 'app-categorias-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, Modal, FormField, Input, Select, EmptyState, Paginator, ReactiveFormsModule],
  templateUrl: './categorias-list.html',
  styleUrl: './categorias-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasList {
  private readonly categoriasService = inject(CategoriasService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    categoriaPadreId: [''],
  });

  /** Categorías principales (sin padre) — únicas elegibles como "categoría padre" de otra. */
  protected readonly categoriasPrincipales = () => this.categorias().filter((c) => !c.categoriaPadreId);

  /** Categorías ordenadas con cada sub-categoría justo debajo de su categoría padre. */
  protected readonly categoriasOrdenadas = () => {
    const todas = this.categorias();
    const resultado: Categoria[] = [];
    for (const principal of this.categoriasPrincipales()) {
      resultado.push(principal);
      resultado.push(...todas.filter((c) => c.categoriaPadreId === principal.id));
    }
    return resultado;
  };

  private readonly pageSize = 20;
  protected readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.categoriasOrdenadas().length / this.pageSize)),
  );
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly categoriasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize;
    return this.categoriasOrdenadas().slice(inicio, inicio + this.pageSize);
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.categoriasService.findAll().subscribe({
      next: (data) => {
        this.categorias.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar las categorías');
      },
    });
  }

  protected esSubCategoria(categoria: Categoria): boolean {
    return !!categoria.categoriaPadreId;
  }

  protected nombreCategoriaPadre(id?: string): string {
    if (!id) return '—';
    return this.categorias().find((c) => c.id === id)?.nombre ?? '—';
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', categoriaPadreId: '' });
    this.showForm.set(true);
  }

  protected openEdit(categoria: Categoria): void {
    this.editingId.set(categoria.id);
    this.form.reset({ nombre: categoria.nombre, categoriaPadreId: categoria.categoriaPadreId ?? '' });
    this.showForm.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = { nombre: raw.nombre, categoriaPadreId: raw.categoriaPadreId || undefined };
    const editingId = this.editingId();
    const request$ = editingId
      ? this.categoriasService.update(editingId, payload)
      : this.categoriasService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Categoría actualizada' : 'Categoría creada');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar la categoría');
      },
    });
  }

  protected async eliminar(categoria: Categoria): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar "${categoria.nombre}"?`, danger: true }))) return;
    this.categoriasService.remove(categoria.id).subscribe({
      next: () => {
        this.toast.success('Categoría eliminada');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar la categoría'),
    });
  }
}
