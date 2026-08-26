import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClienteAuthService } from '../../../core/services/cliente-auth.service';
import { ClientePerfilService, DireccionTienda } from '../../../core/services/cliente-perfil.service';

@Component({
  selector: 'app-tienda-cuenta',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cuenta.html',
  styleUrl: './cuenta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TiendaCuenta implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly clienteAuthService = inject(ClienteAuthService);
  private readonly perfilService = inject(ClientePerfilService);

  protected readonly negocioId = this.route.snapshot.paramMap.get('negocioId')!;
  protected readonly direcciones = signal<DireccionTienda[]>([]);
  protected readonly nuevaDireccion = signal('');
  protected readonly guardandoDireccion = signal(false);

  ngOnInit(): void {
    this.perfilService.listarDirecciones().subscribe((direcciones) => this.direcciones.set(direcciones));
  }

  protected agregarDireccion(): void {
    const direccionLinea1 = this.nuevaDireccion().trim();
    if (!direccionLinea1) return;

    this.guardandoDireccion.set(true);
    this.perfilService.agregarDireccion({ direccionLinea1 }).subscribe({
      next: (direccion) => {
        this.direcciones.update((actuales) => [...actuales, direccion]);
        this.nuevaDireccion.set('');
        this.guardandoDireccion.set(false);
      },
      error: () => this.guardandoDireccion.set(false),
    });
  }

  protected cerrarSesion(): void {
    this.clienteAuthService.logout();
    this.router.navigate(['/tienda', this.negocioId]);
  }
}
