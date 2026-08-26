import { Injectable, computed, inject, signal } from '@angular/core';
import { CatalogoPublicoService } from './catalogo-publico.service';
import { ProductoCatalogo } from '../models/catalogo-publico.model';
import { PlantillaTienda } from '../models/tienda-online.model';

@Injectable({ providedIn: 'root' })
export class TiendaContextService {
  private readonly catalogoService = inject(CatalogoPublicoService);

  private negocioIdCargado = '';
  private readonly _cargando = signal(true);
  private readonly _activa = signal(true);
  private readonly _plantilla = signal<PlantillaTienda>('aurora');
  private readonly _logoUrl = signal<string | null>(null);
  private readonly _banners = signal<string[]>([]);
  private readonly _terminos = signal<string | null>(null);
  private readonly _tratamientoDatos = signal<string | null>(null);
  private readonly _politicaEnvios = signal<string | null>(null);
  private readonly _productos = signal<ProductoCatalogo[]>([]);

  readonly negocioId = computed(() => this.negocioIdCargado);
  readonly cargando = this._cargando.asReadonly();
  readonly activa = this._activa.asReadonly();
  readonly plantilla = this._plantilla.asReadonly();
  readonly logoUrl = this._logoUrl.asReadonly();
  readonly banners = this._banners.asReadonly();
  readonly terminos = this._terminos.asReadonly();
  readonly tratamientoDatos = this._tratamientoDatos.asReadonly();
  readonly politicaEnvios = this._politicaEnvios.asReadonly();
  readonly productos = this._productos.asReadonly();

  /** Se llama desde `StorefrontLayout` al entrar a `/tienda/:negocioId` — no repite la carga si ya se hizo para ese negocio. */
  cargar(negocioId: string): void {
    if (this.negocioIdCargado === negocioId) return;
    this.negocioIdCargado = negocioId;
    this._cargando.set(true);
    this.catalogoService.obtenerCatalogo(negocioId).subscribe({
      next: (catalogo) => {
        this._activa.set(catalogo.activa);
        this._plantilla.set(catalogo.plantilla);
        this._logoUrl.set(catalogo.logoUrl);
        this._banners.set(catalogo.banners);
        this._terminos.set(catalogo.terminos);
        this._tratamientoDatos.set(catalogo.tratamientoDatos);
        this._politicaEnvios.set(catalogo.politicaEnvios);
        this._productos.set(catalogo.productos);
        this._cargando.set(false);
      },
      error: () => {
        this._activa.set(false);
        this._cargando.set(false);
      },
    });
  }
}
