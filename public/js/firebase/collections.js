// Definición de colecciones y sus relaciones
export const COLLECTIONS = {
    MECANICOS: 'mecanicos',
    CLIENTES: 'clientes',
    VEHICULOS: 'vehiculos',
    REPUESTOS: 'repuestos',
    SERVICIOS: 'servicios',
    CITAS: 'citas',
    HISTORIAL_SERVICIOS: 'historial_servicios'
};

// Validadores y transformadores de datos
export const validators = {
    required: (value) => value !== undefined && value !== null && value !== '',
    isNumber: (value) => !isNaN(value) && typeof value === 'number',
    isDate: (value) => value instanceof Date && !isNaN(value),
    isEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    isPhone: (value) => /^\+?[\d\s-]{8,}$/.test(value)
}; 