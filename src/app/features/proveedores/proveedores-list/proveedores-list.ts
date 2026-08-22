import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Table } from '../../../shared/ui/organisms/data-table/table';
import { Modal } from '../../../shared/ui/organisms/modal/modal';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { Input } from '../../../shared/ui/atoms/input/input';
import { DocumentUpload } from '../../../shared/ui/molecules/document-upload/document-upload';
import { EmptyState } from '../../../shared/ui/molecules/empty-state/empty-state';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Proveedor, ProveedorDocumentos } from '../../../core/models/proveedor.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-proveedores-list',
  standalone: true,
  imports: [Topbar, Button, Icon, Table, Modal, FormField, Input, DocumentUpload, EmptyState, ReactiveFormsModule],
  templateUrl: './proveedores-list.html',
  styleUrl: './proveedores-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProveedoresList {
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingProveedor = signal<Proveedor | null>(null);
  protected readonly saving = signal(false);

  protected readonly documentos: ProveedorDocumentos = {};

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    nit: [''],
    contactoNombre: [''],
    telefono: [''],
    email: [''],
    direccion: [''],
    rutNumero: [''],
    camaraComercioNumero: [''],
    certificacionBancariaInfo: [''],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.proveedoresService.findAll().subscribe({
      next: (proveedores) => {
        this.proveedores.set(proveedores);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudieron cargar los proveedores');
      },
    });
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.editingProveedor.set(null);
    this.limpiarDocumentos();
    this.form.reset({
      nombre: '',
      nit: '',
      contactoNombre: '',
      telefono: '',
      email: '',
      direccion: '',
      rutNumero: '',
      camaraComercioNumero: '',
      certificacionBancariaInfo: '',
    });
    this.showForm.set(true);
  }

  protected openEdit(proveedor: Proveedor): void {
    this.editingId.set(proveedor.id);
    this.editingProveedor.set(proveedor);
    this.limpiarDocumentos();
    this.form.reset({
      nombre: proveedor.nombre,
      nit: proveedor.nit ?? '',
      contactoNombre: proveedor.contactoNombre ?? '',
      telefono: proveedor.telefono ?? '',
      email: proveedor.email ?? '',
      direccion: proveedor.direccion ?? '',
      rutNumero: proveedor.rutNumero ?? '',
      camaraComercioNumero: proveedor.camaraComercioNumero ?? '',
      certificacionBancariaInfo: proveedor.certificacionBancariaInfo ?? '',
    });
    this.showForm.set(true);
  }

  private limpiarDocumentos(): void {
    this.documentos.rutDocumento = null;
    this.documentos.camaraComercioDocumento = null;
    this.documentos.certificacionBancariaDocumento = null;
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre,
      nit: raw.nit || undefined,
      contactoNombre: raw.contactoNombre || undefined,
      telefono: raw.telefono || undefined,
      email: raw.email || undefined,
      direccion: raw.direccion || undefined,
      rutNumero: raw.rutNumero || undefined,
      camaraComercioNumero: raw.camaraComercioNumero || undefined,
      certificacionBancariaInfo: raw.certificacionBancariaInfo || undefined,
    };
    const editingId = this.editingId();
    const request$ = editingId
      ? this.proveedoresService.update(editingId, payload, this.documentos)
      : this.proveedoresService.create(payload, this.documentos);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success(editingId ? 'Proveedor actualizado' : 'Proveedor creado');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo guardar el proveedor');
      },
    });
  }

  protected documentoUrl(url?: string | null): string | null {
    if (!url) return null;
    return `${environment.assetsUrl}${url}`;
  }

  protected async eliminar(proveedor: Proveedor): Promise<void> {
    if (!(await this.confirmService.ask({ message: `¿Eliminar "${proveedor.nombre}"?`, danger: true }))) return;
    this.proveedoresService.remove(proveedor.id).subscribe({
      next: () => {
        this.toast.success('Proveedor eliminado');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar el proveedor'),
    });
  }
}
