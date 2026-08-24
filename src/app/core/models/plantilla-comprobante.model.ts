export type TipoComprobante = 'RECIBO' | 'FACTURA';

export interface CampoExtraDian {
  etiqueta: string;
  valor: string;
}

/** Informativo — no configura facturación electrónica ante la DIAN. Solo aplica si tipo=FACTURA. */
export interface DatosDianPlantilla {
  resolucionNumero?: string;
  prefijo?: string;
  rangoDesde?: number;
  rangoHasta?: number;
  fechaVigencia?: string;
  regimenFiscal?: string;
  camposExtra?: CampoExtraDian[];
}

export interface ConfiguracionPlantilla {
  nombrePersonaNatural?: string;
  direccion?: string;
  telefono?: string;
  mensajeCierre?: string;
  terminos?: string;
  dian?: DatosDianPlantilla;
}

export interface PlantillaComprobante {
  id: string;
  tipo: TipoComprobante;
  nombre: string;
  esPredeterminada: boolean;
  logoUrl?: string;
  configuracion: ConfiguracionPlantilla;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}
