import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    increment,
    writeBatch,
    onSnapshot
} from 'firebase/firestore';
import { db } from './config.js';
import { COLLECTIONS, validators } from './collections.js';

class FirestoreService {
    constructor() {
        this.db = db;
        this.listeners = new Map();
    }

    // Método genérico para obtener documentos con filtros y ordenamiento
    async getDocuments(collectionName, options = {}) {
        try {
            let q = collection(this.db, collectionName);

            if (options.filters) {
                options.filters.forEach(filter => {
                    q = query(q, where(filter.field, filter.operator, filter.value));
                });
            }

            if (options.orderBy) {
                q = query(q, orderBy(options.orderBy.field, options.orderBy.direction));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error getting documents from ${collectionName}:`, error);
            throw error;
        }
    }

    // Método para escuchar cambios en tiempo real
    subscribeToCollection(collectionName, callback, options = {}) {
        const q = this.buildQuery(collectionName, options);
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const documents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(documents);
        }, (error) => {
            console.error(`Error in subscription to ${collectionName}:`, error);
        });

        this.listeners.set(`${collectionName}-${Date.now()}`, unsubscribe);
        return unsubscribe;
    }

    // Métodos específicos para cada colección
    async addCita(citaData) {
        try {
            // Validaciones
            if (!validators.required(citaData.fecha) || !validators.isDate(new Date(citaData.fecha))) {
                throw new Error('Fecha inválida');
            }

            // Verificar disponibilidad del mecánico
            const disponible = await this.verificarDisponibilidadMecanico(
                citaData.mecanico_id, 
                citaData.fecha
            );
            
            if (!disponible) {
                throw new Error('Mecánico no disponible en ese horario');
            }

            const citaRef = await addDoc(collection(this.db, COLLECTIONS.CITAS), {
                ...citaData,
                fecha_creacion: serverTimestamp(),
                estado: 'pendiente'
            });

            // Actualizar contador de citas del mecánico
            await this.actualizarEstadisticasMecanico(citaData.mecanico_id);

            return citaRef.id;
        } catch (error) {
            console.error('Error adding cita:', error);
            throw error;
        }
    }

    async actualizarEstadoRepuesto(repuestoId, cantidad, operacion) {
        const batch = writeBatch(this.db);
        
        try {
            const repuestoRef = doc(this.db, COLLECTIONS.REPUESTOS, repuestoId);
            const repuestoDoc = await getDoc(repuestoRef);

            if (!repuestoDoc.exists()) {
                throw new Error('Repuesto no encontrado');
            }

            const repuestoData = repuestoDoc.data();
            const nuevoStock = operacion === 'add' ? 
                repuestoData.stock + cantidad : 
                repuestoData.stock - cantidad;

            if (nuevoStock < 0) {
                throw new Error('Stock insuficiente');
            }

            batch.update(repuestoRef, { 
                stock: nuevoStock,
                ultima_actualizacion: serverTimestamp()
            });

            // Registrar movimiento en historial
            const historialRef = collection(this.db, COLLECTIONS.HISTORIAL_SERVICIOS);
            batch.set(doc(historialRef), {
                tipo: operacion,
                repuesto_id: repuestoId,
                cantidad: cantidad,
                fecha: serverTimestamp(),
                stock_resultante: nuevoStock
            });

            await batch.commit();
        } catch (error) {
            console.error('Error actualizando stock:', error);
            throw error;
        }
    }

    async gestionarServicio(servicioData) {
        const batch = writeBatch(this.db);
        
        try {
            // Validar datos del servicio
            this.validarServicio(servicioData);

            // Crear referencia del servicio
            const servicioRef = doc(collection(this.db, COLLECTIONS.SERVICIOS));
            
            // Verificar y actualizar stock de repuestos
            await this.verificarStockRepuestos(servicioData.repuestos);
            
            // Preparar actualizaciones en batch
            batch.set(servicioRef, {
                ...servicioData,
                fecha_creacion: serverTimestamp(),
                estado: 'pendiente',
                costo_total: this.calcularCostoTotal(servicioData)
            });

            // Actualizar stock de repuestos
            for (const repuesto of servicioData.repuestos) {
                const repuestoRef = doc(this.db, COLLECTIONS.REPUESTOS, repuesto.id);
                batch.update(repuestoRef, {
                    stock: increment(-repuesto.cantidad),
                    ultima_actualizacion: serverTimestamp()
                });
            }

            // Actualizar estadísticas del mecánico
            if (servicioData.mecanico_id) {
                const mecanicoRef = doc(this.db, COLLECTIONS.MECANICOS, servicioData.mecanico_id);
                batch.update(mecanicoRef, {
                    servicios_completados: increment(1),
                    ultima_actualizacion: serverTimestamp()
                });
            }

            await batch.commit();
            return servicioRef.id;

        } catch (error) {
            console.error('Error al gestionar servicio:', error);
            throw error;
        }
    }

    async obtenerEstadisticasDashboard() {
        try {
            const [citas, servicios, repuestos, mecanicos] = await Promise.all([
                this.getDocuments(COLLECTIONS.CITAS, {
                    filters: [{ field: 'fecha', operator: '>=', value: new Date() }]
                }),
                this.getDocuments(COLLECTIONS.SERVICIOS),
                this.getDocuments(COLLECTIONS.REPUESTOS),
                this.getDocuments(COLLECTIONS.MECANICOS)
            ]);

            return {
                citasPendientes: citas.filter(c => c.estado === 'pendiente').length,
                serviciosCompletados: servicios.filter(s => s.estado === 'completado').length,
                repuestosBajoStock: repuestos.filter(r => r.stock <= r.stock_minimo),
                mecanicosDisponibles: mecanicos.filter(m => m.disponibilidad).length,
                ingresosTotales: servicios
                    .filter(s => s.estado === 'completado')
                    .reduce((total, s) => total + s.costo_total, 0)
            };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    }

    async gestionarCliente(clienteData, vehiculos = []) {
        const batch = writeBatch(this.db);
        
        try {
            // Validar datos del cliente
            this.validarCliente(clienteData);

            // Crear o actualizar cliente
            const clienteRef = clienteData.id ? 
                doc(this.db, COLLECTIONS.CLIENTES, clienteData.id) :
                doc(collection(this.db, COLLECTIONS.CLIENTES));

            batch.set(clienteRef, {
                ...clienteData,
                ultima_actualizacion: serverTimestamp()
            }, { merge: true });

            // Gestionar vehículos del cliente
            for (const vehiculo of vehiculos) {
                const vehiculoRef = vehiculo.id ?
                    doc(this.db, COLLECTIONS.VEHICULOS, vehiculo.id) :
                    doc(collection(this.db, COLLECTIONS.VEHICULOS));

                batch.set(vehiculoRef, {
                    ...vehiculo,
                    cliente_id: clienteRef.id,
                    ultima_actualizacion: serverTimestamp()
                }, { merge: true });
            }

            await batch.commit();
            return clienteRef.id;

        } catch (error) {
            console.error('Error al gestionar cliente:', error);
            throw error;
        }
    }

    // Métodos de validación
    #validarServicio(servicioData) {
        if (!validators.required(servicioData.descripcion)) {
            throw new Error('La descripción del servicio es requerida');
        }
        if (!validators.isNumber(servicioData.valor_base)) {
            throw new Error('El valor base debe ser un número válido');
        }
        if (!Array.isArray(servicioData.repuestos)) {
            throw new Error('La lista de repuestos debe ser un array');
        }
    }

    #validarCliente(clienteData) {
        if (!validators.required(clienteData.nombre) || 
            !validators.required(clienteData.apellido)) {
            throw new Error('Nombre y apellido son requeridos');
        }
        if (!validators.isEmail(clienteData.email)) {
            throw new Error('Email inválido');
        }
        if (!validators.isPhone(clienteData.telefono)) {
            throw new Error('Teléfono inválido');
        }
    }

    async #verificarStockRepuestos(repuestos) {
        for (const repuesto of repuestos) {
            const repuestoDoc = await getDoc(
                doc(this.db, COLLECTIONS.REPUESTOS, repuesto.id)
            );
            
            if (!repuestoDoc.exists()) {
                throw new Error(`Repuesto ${repuesto.id} no encontrado`);
            }

            const stockActual = repuestoDoc.data().stock;
            if (stockActual < repuesto.cantidad) {
                throw new Error(`Stock insuficiente para ${repuestoDoc.data().descripcion}`);
            }
        }
    }

    #calcularCostoTotal(servicioData) {
        const costoRepuestos = servicioData.repuestos.reduce(
            (total, repuesto) => total + (repuesto.precio * repuesto.cantidad), 
            0
        );
        return servicioData.valor_base + costoRepuestos;
    }
}

export const firestoreService = new FirestoreService(); 