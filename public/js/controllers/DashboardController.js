import { BaseController } from './BaseController.js';
import { CitasService } from '../services/CitasService.js';
import { ServiciosService } from '../services/ServiciosService.js';
import { RepuestosService } from '../services/RepuestosService.js';
import { MecanicosService } from '../services/MecanicosService.js';
import { ClientesService } from '../services/ClientesService.js';

export class DashboardController extends BaseController {
    constructor() {
        super();
        this.citasService = new CitasService();
        this.serviciosService = new ServiciosService();
        this.repuestosService = new RepuestosService();
        this.mecanicosService = new MecanicosService();
        this.clientesService = new ClientesService();
        
        this.stats = {
            citasPendientes: 0,
            serviciosEnProceso: 0,
            ingresosMensuales: 0,
            clientesNuevos: 0,
            repuestosBajoStock: 0
        };

        this.graficas = {};
    }

    async initializeComponents() {
        this.setupCharts();
        this.setupRealTimeUpdates();
        this.setupDateRangePicker();
    }

    async loadInitialData() {
        await Promise.all([
            this.cargarEstadisticas(),
            this.cargarCitasRecientes(),
            this.cargarRepuestosBajoStock(),
            this.cargarGraficas()
        ]);
    }

    async cargarEstadisticas() {
        try {
            const [citas, servicios, repuestos, clientes] = await Promise.all([
                this.citasService.getCitasPendientes(),
                this.serviciosService.getServiciosEnProceso(),
                this.repuestosService.getRepuestosBajoStock(),
                this.clientesService.getClientesNuevosMes()
            ]);

            this.stats = {
                citasPendientes: citas.length,
                serviciosEnProceso: servicios.length,
                ingresosMensuales: await this.calcularIngresosMensuales(),
                clientesNuevos: clientes.length,
                repuestosBajoStock: repuestos.length
            };

            this.actualizarUIEstadisticas();
        } catch (error) {
            this.handleError(error, 'Error al cargar estadísticas');
        }
    }

    async calcularIngresosMensuales() {
        const fechaInicio = new Date();
        fechaInicio.setDate(1); // Primer día del mes
        fechaInicio.setHours(0, 0, 0, 0);

        const servicios = await this.serviciosService.getAll([
            { field: 'fecha_fin', operator: '>=', value: fechaInicio },
            { field: 'estado', operator: '==', value: 'completado' }
        ]);

        return servicios.reduce((total, servicio) => total + servicio.costo_total, 0);
    }

    async cargarCitasRecientes() {
        try {
            const citasRecientes = await this.citasService.getAll(
                [], 
                { field: 'fecha', direction: 'asc' }
            );

            const contenedor = document.getElementById('citasRecientes');
            if (!contenedor) return;

            contenedor.innerHTML = await Promise.all(
                citasRecientes.slice(0, 5).map(async cita => {
                    const cliente = await this.clientesService.getById(cita.cliente_id);
                    return this.renderCitaReciente(cita, cliente);
                })
            );
        } catch (error) {
            this.handleError(error, 'Error al cargar citas recientes');
        }
    }

    async cargarRepuestosBajoStock() {
        try {
            const repuestos = await this.repuestosService.getRepuestosBajoStock();
            const contenedor = document.getElementById('repuestosBajoStock');
            if (!contenedor) return;

            contenedor.innerHTML = repuestos.map(repuesto => `
                <div class="warning-item">
                    <span class="descripcion">${repuesto.descripcion}</span>
                    <span class="stock">Stock: ${repuesto.stock}</span>
                    <span class="minimo">Mínimo: ${repuesto.stock_minimo}</span>
                    <button class="btn btn-sm btn-warning" 
                            onclick="dashboardController.solicitarRepuesto('${repuesto.id}')">
                        Solicitar
                    </button>
                </div>
            `).join('');
        } catch (error) {
            this.handleError(error, 'Error al cargar repuestos bajo stock');
        }
    }

    async cargarGraficas() {
        await Promise.all([
            this.cargarGraficaIngresos(),
            this.cargarGraficaServicios(),
            this.cargarGraficaMecanicos()
        ]);
    }

    async cargarGraficaIngresos() {
        try {
            const datos = await this.obtenerDatosIngresos();
            const ctx = document.getElementById('graficaIngresos')?.getContext('2d');
            if (!ctx) return;

            this.graficas.ingresos = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: datos.labels,
                    datasets: [{
                        label: 'Ingresos Mensuales',
                        data: datos.valores,
                        borderColor: '#4CAF50',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: value => `$${value}`
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error al cargar gráfica de ingresos:', error);
        }
    }

    async obtenerDatosIngresos() {
        // Últimos 6 meses
        const labels = [];
        const valores = [];
        const fecha = new Date();

        for (let i = 5; i >= 0; i--) {
            const mes = new Date(fecha.getFullYear(), fecha.getMonth() - i, 1);
            const nombreMes = mes.toLocaleString('es', { month: 'short' });
            labels.push(nombreMes);

            const servicios = await this.serviciosService.getServiciosPorMes(mes);
            const ingreso = servicios.reduce((total, s) => total + s.costo_total, 0);
            valores.push(ingreso);
        }

        return { labels, valores };
    }

    setupRealTimeUpdates() {
        // Suscribirse a cambios en tiempo real
        this.citasService.subscribeToChanges(() => this.cargarCitasRecientes());
        this.repuestosService.subscribeToChanges(() => this.cargarRepuestosBajoStock());
        
        // Actualizar estadísticas cada 5 minutos
        setInterval(() => this.cargarEstadisticas(), 5 * 60 * 1000);
    }

    actualizarUIEstadisticas() {
        Object.entries(this.stats).forEach(([key, value]) => {
            const elemento = document.getElementById(key);
            if (elemento) {
                if (key === 'ingresosMensuales') {
                    elemento.textContent = `$${value.toFixed(2)}`;
                } else {
                    elemento.textContent = value;
                }
            }
        });
    }

    solicitarRepuesto(repuestoId) {
        // Implementar lógica para solicitar repuesto
        // Por ejemplo, abrir un modal de solicitud
        this.showNotification('Función de solicitud en desarrollo', 'info');
    }
}

// Inicializar controlador
const dashboardController = new DashboardController();
window.dashboardController = dashboardController; // Para acceder desde el HTML 