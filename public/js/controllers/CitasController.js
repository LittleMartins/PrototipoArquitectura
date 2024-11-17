import { BaseController } from './BaseController.js';
import { CitasService } from '../services/CitasService.js';
import { MecanicosService } from '../services/MecanicosService.js';
import { VehiculosService } from '../services/VehiculosService.js';

export class CitasController extends BaseController {
    constructor() {
        super();
        this.citasService = new CitasService();
        this.mecanicosService = new MecanicosService();
        this.vehiculosService = new VehiculosService();
        
        this.form = document.getElementById('citaForm');
        this.listaCitas = document.getElementById('listaCitas');
    }

    async initializeComponents() {
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        await this.setupFilters();
        this.setupRealTimeUpdates();
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.cargarMecanicos(),
                this.cargarVehiculos(),
                this.cargarCitas()
            ]);
        } catch (error) {
            this.handleError(error, 'Error al cargar datos iniciales');
        }
    }

    async cargarMecanicos() {
        const mecanicoSelect = document.getElementById('mecanico');
        if (!mecanicoSelect) return;

        const mecanicos = await this.mecanicosService.getMecanicosDisponibles();
        
        mecanicoSelect.innerHTML = `
            <option value="">Seleccione un mecánico</option>
            ${mecanicos.map(mecanico => `
                <option value="${mecanico.id}">
                    ${mecanico.nombre} ${mecanico.apellido} - ${mecanico.especialidad}
                </option>
            `).join('')}
        `;
    }

    async cargarVehiculos() {
        const vehiculoSelect = document.getElementById('vehiculo');
        if (!vehiculoSelect) return;

        const vehiculos = await this.vehiculosService.getVehiculosConClientes();
        
        vehiculoSelect.innerHTML = `
            <option value="">Seleccione un vehículo</option>
            ${vehiculos.map(vehiculo => `
                <option value="${vehiculo.id}" data-cliente="${vehiculo.cliente_id}">
                    ${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.placa} 
                    (${vehiculo.cliente?.nombre} ${vehiculo.cliente?.apellido})
                </option>
            `).join('')}
        `;
    }

    async cargarCitas() {
        if (!this.listaCitas) return;

        const citas = await this.citasService.getAll([], { 
            field: 'fecha', 
            direction: 'asc' 
        });

        this.listaCitas.innerHTML = await Promise.all(citas.map(async cita => {
            const mecanico = await this.mecanicosService.getById(cita.mecanico_id);
            const vehiculo = await this.vehiculosService.getById(cita.vehiculo_id);
            
            return this.renderCitaCard(cita, mecanico, vehiculo);
        }));

        this.setupCardListeners();
    }

    renderCitaCard(cita, mecanico, vehiculo) {
        return `
            <div class="card cita-card ${this.getEstadoClase(cita.estado)}" data-id="${cita.id}">
                <div class="card-header">
                    <span class="fecha">${new Date(cita.fecha).toLocaleString()}</span>
                    <span class="badge badge-${this.getEstadoBadge(cita.estado)}">
                        ${this.formatearEstado(cita.estado)}
                    </span>
                </div>
                <div class="card-body">
                    <p><strong>Mecánico:</strong> ${mecanico.nombre} ${mecanico.apellido}</p>
                    <p><strong>Vehículo:</strong> ${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.placa}</p>
                    ${cita.notas ? `<p><strong>Notas:</strong> ${cita.notas}</p>` : ''}
                </div>
                <div class="card-footer">
                    ${this.renderAcciones(cita)}
                </div>
            </div>
        `;
    }

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const citaData = {
                fecha: new Date(formData.get('fecha')),
                mecanico_id: formData.get('mecanico'),
                vehiculo_id: formData.get('vehiculo'),
                estado: 'pendiente',
                notas: formData.get('notas') || ''
            };

            await this.citasService.crearCita(citaData);
            this.showNotification('Cita agendada exitosamente', 'success');
            this.form.reset();
        } catch (error) {
            this.handleError(error, 'Error al agendar cita');
        }
    }

    setupCardListeners() {
        this.listaCitas?.querySelectorAll('.btn-accion').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const { id, accion } = e.target.dataset;
                try {
                    await this.citasService.actualizarEstadoCita(id, accion);
                    this.showNotification('Estado actualizado correctamente', 'success');
                } catch (error) {
                    this.handleError(error, 'Error al actualizar estado');
                }
            });
        });
    }

    setupRealTimeUpdates() {
        this.citasService.subscribeToChanges((citas) => {
            this.cargarCitas();
        });
    }
}

// Inicializar controlador
new CitasController(); 