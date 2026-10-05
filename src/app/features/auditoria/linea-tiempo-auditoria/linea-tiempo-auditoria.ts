import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { RegistroAuditoria } from '../../../core/models/auditoria.model';
import { ETIQUETAS_MODULO } from '../../../core/models/etiquetas-modulo';
import {
  RUTA_ENTIDAD,
  accionAuditoria,
  autorAuditoria,
  diaAuditoria,
  horaAuditoria,
  tituloDiaAuditoria,
} from '../auditoria-ui';

/** Lista agrupada por día con filas expandibles (Campo | Antes | Después). La usan la pantalla central y el modal Historial. */
@Component({
  selector: 'app-linea-tiempo-auditoria',
  standalone: true,
  imports: [RouterLink, Badge, Icon],
  templateUrl: './linea-tiempo-auditoria.html',
  styleUrl: './linea-tiempo-auditoria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineaTiempoAuditoria {
  readonly registros = input.required<RegistroAuditoria[]>();
  /** En el modal de un registro no tiene sentido enlazar al mismo registro. */
  readonly mostrarEnlace = input(true);

  protected readonly expandidos = signal<ReadonlySet<string>>(new Set());
  protected readonly accion = accionAuditoria;
  protected readonly autor = autorAuditoria;
  protected readonly hora = horaAuditoria;
  protected readonly modulo = (r: RegistroAuditoria) => ETIQUETAS_MODULO[r.modulo] ?? r.modulo;
  protected readonly ruta = (r: RegistroAuditoria) => RUTA_ENTIDAD[r.entidad] ?? null;

  protected readonly dias = computed(() => {
    const grupos: { dia: string; titulo: string; registros: RegistroAuditoria[] }[] = [];
    for (const r of this.registros()) {
      const dia = diaAuditoria(r.createdAt);
      const ultimo = grupos.at(-1);
      if (ultimo?.dia === dia) ultimo.registros.push(r);
      else grupos.push({ dia, titulo: tituloDiaAuditoria(r.createdAt), registros: [r] });
    }
    return grupos;
  });

  protected alternar(id: string): void {
    const abiertos = new Set(this.expandidos());
    if (abiertos.has(id)) abiertos.delete(id);
    else abiertos.add(id);
    this.expandidos.set(abiertos);
  }
}
