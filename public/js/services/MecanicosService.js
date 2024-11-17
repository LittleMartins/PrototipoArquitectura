import { FirebaseService } from '../firebase/services/FirebaseService.js';
import { COLLECTIONS } from '../firebase/collections.js';

export class MecanicosService extends FirebaseService {
    constructor() {
        super(COLLECTIONS.MECANICOS);
    }

    async getMecanicosDisponibles() {
        return await this.getAll([
            { field: 'disponibilidad', operator: '==', value: true }
        ], { field: 'nombre', direction: 'asc' });
    }

    async actualizarDisponibilidad(mecanicoId, disponible) {
        return await this.update(mecanicoId, {
            disponibilidad: disponible,
            ultima_actualizacion: new Date()
        });
    }

    async actualizarEstadisticas(mecanicoId, servicioCompletado = true) {
        const mecanico = await this.getById(mecanicoId);
        return await this.update(mecanicoId, {
            servicios_completados: (mecanico.servicios_completados || 0) + (servicioCompletado ? 1 : 0),
            ultima_actualizacion: new Date()
        });
    }

    validarMecanico(data) {
        const errores = [];
        if (!data.nombre?.trim()) errores.push('El nombre es requerido');
        if (!data.apellido?.trim()) errores.push('El apellido es requerido');
        if (!data.especialidad?.trim()) errores.push('La especialidad es requerida');
        
        if (errores.length > 0) {
            throw new Error(errores.join(', '));
        }
    }
} 