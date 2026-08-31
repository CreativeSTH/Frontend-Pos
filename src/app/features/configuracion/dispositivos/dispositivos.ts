import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Topbar } from '../../../layout/topbar/topbar';
import { Button } from '../../../shared/ui/atoms/button/button';
import { Icon } from '../../../shared/ui/atoms/icon/icon';
import { Badge } from '../../../shared/ui/atoms/badge/badge';
import { Select } from '../../../shared/ui/atoms/select/select';
import { FormField } from '../../../shared/ui/molecules/form-field/form-field';
import { SearchBar } from '../../../shared/ui/molecules/search-bar/search-bar';
import { PrintAgentService } from '../../../core/services/print-agent.service';
import { ToastService } from '../../../core/services/toast.service';

interface EscaneoDetectado {
  codigo: string;
  hora: string;
}

@Component({
  selector: 'app-dispositivos',
  standalone: true,
  imports: [Topbar, Button, Icon, Badge, Select, FormField, SearchBar, FormsModule],
  templateUrl: './dispositivos.html',
  styleUrl: './dispositivos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dispositivos {
  private readonly printAgent = inject(PrintAgentService);
  private readonly toast = inject(ToastService);

  private readonly campoEscaneo = viewChild<SearchBar>('campoEscaneo');

  protected readonly cargando = signal(true);
  protected readonly agenteConectado = signal(false);
  protected readonly impresoras = signal<string[]>([]);
  protected readonly errorImpresoras = signal<string | null>(null);

  protected readonly printerType = signal<'epson' | 'star'>('epson');
  protected readonly printerName = signal<string>('');
  protected readonly paperWidth = signal<58 | 80>(58);
  protected readonly guardando = signal(false);
  protected readonly probandoImpresion = signal(false);

  protected readonly codigoEscaneado = signal('');
  protected readonly historialEscaneos = signal<EscaneoDetectado[]>([]);

  constructor() {
    this.cargarEstadoYConfig();
  }

  private cargarEstadoYConfig(): void {
    this.cargando.set(true);
    this.printAgent.estado().subscribe((estado) => {
      this.agenteConectado.set(estado.ok);
      this.cargando.set(false);
      if (!estado.ok) return;

      this.printAgent.listarImpresoras().subscribe((resultado) => {
        this.impresoras.set(resultado.impresoras);
        this.errorImpresoras.set(resultado.error ?? null);
      });

      this.printAgent.obtenerConfig().subscribe((config) => {
        this.printerType.set(config.printerType ?? 'epson');
        this.printerName.set(config.printerName ?? '');
        this.paperWidth.set(config.paperWidth ?? 58);
      });
    });
  }

  /** `ds-select` proyecta `<option value="...">` como string plano — hay que convertir a número antes de guardarlo. */
  protected setPaperWidth(valor: string): void {
    this.paperWidth.set(Number(valor) === 80 ? 80 : 58);
  }

  protected reintentar(): void {
    this.cargarEstadoYConfig();
  }

  protected guardarConfig(): void {
    this.guardando.set(true);
    this.printAgent
      .guardarConfig({
        printerType: this.printerType(),
        printerName: this.printerName() || undefined,
        paperWidth: this.paperWidth(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toast.success('Configuración de impresora guardada en esta PC');
        },
        error: () => {
          this.guardando.set(false);
          this.toast.error('No se pudo guardar la configuración');
        },
      });
  }

  protected probarImpresion(): void {
    this.probandoImpresion.set(true);
    this.printAgent.imprimirPrueba().subscribe((resultado) => {
      this.probandoImpresion.set(false);
      if (resultado.impreso) {
        this.toast.success('Ticket de prueba enviado a la impresora');
      } else {
        this.toast.error(resultado.error ?? 'No se pudo imprimir la prueba');
      }
    });
  }

  protected onEscaneoSubmit(codigo: string): void {
    this.historialEscaneos.update((h) => [{ codigo, hora: new Date().toLocaleTimeString('es-CO') }, ...h].slice(0, 5));
    this.codigoEscaneado.set('');
    this.campoEscaneo()?.focus();
  }

  protected limpiarHistorial(): void {
    this.historialEscaneos.set([]);
  }
}
