import { FirebaseService } from '../firebase/services/FirebaseService.js';
import { COLLECTIONS } from '../firebase/collections.js';
import { validators } from '../firebase/collections.js';

export class ClientesService extends FirebaseService {
    constructor() {
        super(COLLECTIONS.CLIENTES);
        this.vehiculosService = new FirebaseService(COLLECTIONS.VEHICULOS);
    }

    async crearClienteConVehiculos(clienteData, vehiculos = []) {
        try {
            this.validarCliente(clienteData);
            
            // Crear cliente
            const clienteId = await this.create(clienteData);

            // Crear vehículos asociados
            const promesasVehiculos = vehiculos.map(vehiculo => 
                this.vehiculosService.create({
                    ...vehiculo,
                    cliente_id: clienteId
                })
            );

            await Promise.all(promesasVehiculos);
            return clienteId;
        } catch (error) {
            console.error('Error al crear cliente con vehículos:', error);
            throw error;
        }
    }

    async getVehiculosCliente(clienteId) {
        return await this.vehiculosService.getAll([
            { field: 'cliente_id', operator: '==', value: clienteId }
        ]);
    }

    validarCliente(data) {
        const errores = [];
        if (!validators.required(data.nombre)) errores.push('El nombre es requerido');
        if (!validators.required(data.apellido)) errores.push('El apellido es requerido');
        if (!validators.isEmail(data.email)) errores.push('Email inválido');
        if (!validators.isPhone(data.telefono)) errores.push('Teléfono inválido');
        
        if (errores.length > 0) {
            throw new Error(errores.join(', '));
        }
    }
} 