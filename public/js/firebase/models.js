// Definición de las colecciones
const collections = {
    MECANICOS: 'mecanicos',
    CLIENTES: 'clientes',
    VEHICULOS: 'vehiculos',
    REPUESTOS: 'repuestos',
    SERVICIOS: 'servicios',
    CITAS: 'citas'
};

// Estructura de datos para cada colección
const schemas = {
    mecanico: {
        nombre: '',
        apellido: '',
        especialidad: '',
        disponibilidad: true,
        fecha_registro: null,
        servicios_completados: 0,
        calificacion_promedio: 0
    },
    
    cliente: {
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        direccion: '',
        tipo_cliente: 'regular',
        fecha_registro: null,
        vehiculos: []
    },
    
    vehiculo: {
        marca: '',
        modelo: '',
        anio: 0,
        matricula: '',
        cliente_id: '',
        historial_servicios: [],
        ultima_revision: null
    },
    
    repuesto: {
        codigo: '',
        descripcion: '',
        precio: 0,
        stock: 0,
        stock_minimo: 5,
        proveedor: '',
        categoria: '',
        ubicacion: ''
    },
    
    servicio: {
        descripcion: '',
        valor_base: 0,
        repuestos: [],
        duracion_estimada: 0,
        categoria: '',
        requiere_especialista: false
    },
    
    cita: {
        fecha: null,
        cliente_id: '',
        vehiculo_id: '',
        mecanico_id: '',
        servicio_id: '',
        estado: 'pendiente',
        notas: '',
        costo_total: 0
    }
};

export { collections, schemas }; 