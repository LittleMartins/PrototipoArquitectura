import { FirebaseService } from '../firebase/services/FirebaseService.js';
import { COLLECTIONS } from '../firebase/collections.js';

export class VehiculosService extends FirebaseService {
    constructor() {
        super(COLLECTIONS.VEHICULOS);
    }

    async getVehiculosConClientes() {
        const vehiculos = await this.getAll();
        const clientesService = new FirebaseService(COLLECTIONS.CLIENTES);
        
        const vehiculosConClientes = await Promise.all(
            vehiculos.map(async vehiculo => {
                if (vehiculo.cliente_id) {
                    const cliente = await clientesService.getById(vehiculo.cliente_id);
                    return {
                        ...vehiculo,
                        cliente: cliente
                    };
                }
                return vehiculo;
            })
        );

        return vehiculosConClientes;
    }

    validarVehiculo(data) {
        const errores = [];
        if (!data.marca?.trim()) errores.push('La marca es requerida');
        if (!data.modelo?.trim()) errores.push('El modelo es requerido');
        if (!data.año || isNaN(data.año)) errores.push('El año debe ser un número válido');
        if (!data.placa?.trim()) errores.push('La placa es requerida');
        if (!data.cliente_id) errores.push('El cliente es requerido');
        
        if (errores.length > 0) {
            throw new Error(errores.join(', '));
        }
    }
} 