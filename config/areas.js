// config/areas.js
// Configuración centralizada de todas las Secretarías y Direcciones del municipio

export const SECRETARIAS = [
  'Secretaría General Municipal',
  'Secretaría de Tesorería Municipal',
  'Secretaría de Obras Públicas y Desarrollo Urbano',
  'Secretaría de Planeación y Evaluación',
  'Secretaría de Bienestar Social',
  'Secretaría de Seguridad Pública, Tránsito Municipal, Auxilio Vial y Protección Civil',
  'Secretaría de Desarrollo de Pueblos y Comunidades Indígenas',
  'Secretaría de Desarrollo Económico y Turismo',
  'Secretaría Ejecutiva de SIPINNA',
];

export const DIRECCIONES = [
  'Dirección Jurídica',
  'Dirección de Comunicación Social y Marketing Digital',
  'Dirección de Gobierno',
  'Dirección de Reglamentos, Comercio, Mercado y Espectáculos',
  'Dirección de Recursos Materiales y Patrimonio',
  'Dirección de Atención al Migrante',
  'Dirección de Enlace de la Secretaría de Relaciones Exteriores',
  'Dirección de Control y Seguimiento de Egresos',
  'Dirección de Ingresos y Estrategias de Recaudación',
  'Dirección de Recursos Humanos y Nómina',
  'Dirección de Cuenta Pública',
  'Dirección de Catastro',
  'Dirección de Administración',
  'Dirección de Medio Ambiente y Desarrollo Sostenible',
  'Dirección de Obras Públicas',
  'Dirección de Servicios Municipales',
  'Dirección de Servicios Públicos y Limpias',
  'Dirección de Desarrollo Urbano y Ordenamiento Territorial',
  'Dirección Técnica de Planeación y Evaluación',
  'Dirección de Tecnologías de la Información',
  'Dirección de Educación',
  'Dirección de Salud',
  'Dirección de Programas Sociales',
  'Dirección del Deporte',
  'Dirección de Cultura',
  'Dirección de Prevención del Delito',
  'Dirección de Protección Civil y Bomberos',
  'Dirección Administrativa (Seguridad Pública)',
  'Dirección Preventiva de Tránsito Municipal y Auxilio Vial',
  'Dirección de Desarrollo Económico',
  'Dirección de Desarrollo Agropecuario y Proyectos Productivos',
  'Dirección de Turismo',
];

// Todas las áreas (Secretarías + Direcciones) ordenadas alfabéticamente
export const TODAS_LAS_AREAS = [...SECRETARIAS, ...DIRECCIONES].sort();

// Mapeo simplificado para mantener compatibilidad con código existente
export const AREAS = TODAS_LAS_AREAS;

// Función para obtener el tipo de área
export const getAreaType = (area) => {
  if (SECRETARIAS.includes(area)) {
    return 'secretaria';
  }
  if (DIRECCIONES.includes(area)) {
    return 'direccion';
  }
  return 'unknown';
};

// Función para obtener áreas filtradas por tipo
export const getAreasByType = (type) => {
  if (type === 'secretaria') return SECRETARIAS;
  if (type === 'direccion') return DIRECCIONES;
  return TODAS_LAS_AREAS;
};
