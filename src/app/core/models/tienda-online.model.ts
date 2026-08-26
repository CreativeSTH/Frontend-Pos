export type PlantillaTienda = 'aurora' | 'atelier' | 'foundry' | 'nocturne' | 'meadow';

export const PLANTILLAS: { id: PlantillaTienda; nombre: string; descripcion: string }[] = [
  { id: 'aurora', nombre: 'Órbita', descripcion: 'Tecnología y gadgets — oscura, con acentos teal y violeta' },
  { id: 'atelier', nombre: 'Atelier', descripcion: 'Moda y boutique — editorial, serif elegante' },
  { id: 'foundry', nombre: 'Foundry', descripcion: 'Ferretería y catálogo denso — industrial, con SKU visibles' },
  { id: 'nocturne', nombre: 'Nocturne', descripcion: 'Audio y electrónica premium — negro cálido, ámbar' },
  { id: 'meadow', nombre: 'Meadow', descripcion: 'Panadería y artesanal — cálida, verde bosque y mostaza' },
];

export interface ConfiguracionTiendaOnline {
  bodegaId: string | null;
  activo: boolean;
  plantilla: PlantillaTienda;
  logoUrl: string | null;
  banners: string[];
  terminos: string | null;
  tratamientoDatos: string | null;
  politicaEnvios: string | null;
}
