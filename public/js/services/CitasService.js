import { FirebaseService } from '../firebase/services/FirebaseService.js';
import { COLLECTIONS } from '../firebase/collections.js';

export class CitasService extends FirebaseService {
    constructor() {
        super(COLLECTIONS.CITAS);
        this.mecanicosService = new FirebaseService(COLLECTIONS.MECANICOS);
        this.clientesService = new FirebaseService(COLLECTIONS.CLIENTES);
        this.vehiculosService = new FirebaseService(COLLECTIONS.VEHICULOS);
    }

    async getCitasPendientes() {
        return await this.getAll([
            { field: 'estado', operator: '==', value: 'pendiente' }
        ], { field: 'fecha', direction: 'asc' });
    }

    async crearCita(citaData) {
        // Validar disponibilidad del mecánico
        const disponible = await this.verificarDisponibilidadMecanico(
            citaData.mecanico_id,
            citaData.fecha
        );

        if (!disponible) {
            throw new Error('El mecánico no está disponible en ese horario');
        }

        return await this.create({
            ...citaData,
            estado: 'pendiente'
        });
    }

    async actualizarEstadoCita(citaId, nuevoEstado) {
        return await this.update(citaId, { estado: nuevoEstado });
    }

    async verificarDisponibilidadMecanico(mecanicoId, fecha) {
        const fechaInicio = new Date(fecha);
        const fechaFin = new Date(fechaInicio.getTime() + (2 * 60 * 60 * 1000));

        const citasExistentes = await this.getAll([
            { field: 'mecanico_id', operator: '==', value: mecanicoId },
            { field: 'fecha', operator: '>=', value: fechaInicio },
            { field: 'fecha', operator: '<=', value: fechaFin },
            { field: 'estado', operator: 'in', value: ['pendiente', 'en_proceso'] }
        ]);

        return citasExistentes.length === 0;
    }
} 