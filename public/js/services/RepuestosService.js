import { FirebaseService } from '../firebase/services/FirebaseService.js';
import { COLLECTIONS } from '../firebase/collections.js';

export class RepuestosService extends FirebaseService {
    constructor() {
        super(COLLECTIONS.REPUESTOS);
    }

    async actualizarStock(repuestoId, cantidad, operacion = 'restar') {
        const repuesto = await this.getById(repuestoId);
        const nuevoStock = operacion === 'sumar' ? 
            repuesto.stock + cantidad : 
            repuesto.stock - cantidad;

        if (nuevoStock < 0) {
            throw new Error('Stock insuficiente');
        }

        return await this.update(repuestoId, {
            stock: nuevoStock,
            ultima_actualizacion: new Date()
        });
    }

    async getRepuestosBajoStock(stockMinimo = 5) {
        return await this.getAll([
            { field: 'stock', operator: '<=', value: stockMinimo }
        ]);
    }

    validarRepuesto(data) {
        const errores = [];
        if (!data.descripcion?.trim()) errores.push('La descripción es requerida');
        if (!data.precio || isNaN(data.precio)) errores.push('El precio debe ser un número válido');
        if (!data.stock || isNaN(data.stock)) errores.push('El stock debe ser un número válido');
        
        if (errores.length > 0) {
            throw new Error(errores.join(', '));
        }
    }
} 