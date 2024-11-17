import { BaseController } from './BaseController.js';
import { MecanicosService } from '../services/MecanicosService.js';

export class MecanicosController extends BaseController {
    constructor() {
        super();
        this.mecanicosService = new MecanicosService();
        this.form = document.getElementById('mecanicoForm');
        this.listaMecanicos = document.getElementById('listaMecanicos');
    }

    async initializeComponents() {
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupRealTimeUpdates();
        this.setupFiltros();
    }

    async loadInitialData() {
        await this.cargarMecanicos();
    }

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const mecanicoData = {
                nombre: formData.get('nombre'),
                apellido: formData.get('apellido'),
                especialidad: formData.get('especialidad'),
                disponibilidad: formData.get('disponibilidad') === 'true',
                email: formData.get('email'),
                telefono: formData.get('telefono'),
                servicios_completados: 0,
                calificacion_promedio: 0
            };

            await this.mecanicosService.create(mecanicoData);
            this.showNotification('Mecánico registrado exitosamente', 'success');
            this.form.reset();
        } catch (error) {
            this.handleError(error, 'Error al registrar mecánico');
        }
    }

    async cargarMecanicos() {
        if (!this.listaMecanicos) return;

        try {
            const mecanicos = await this.mecanicosService.getAll([], {
                field: 'apellido',
                direction: 'asc'
            });

            this.listaMecanicos.innerHTML = mecanicos.map(mecanico => this.renderMecanicoCard(mecanico)).join('');
            this.setupCardListeners();
        } catch (error) {
            this.handleError(error, 'Error al cargar mecánicos');
        }
    }

    renderMecanicoCard(mecanico) {
        return `
            <div class="card mecanico-card ${mecanico.disponibilidad ? 'disponible' : 'no-disponible'}" 
                 data-id="${mecanico.id}">
                <div class="card-header">
                    <h3>${mecanico.nombre} ${mecanico.apellido}</h3>
                    <span class="badge badge-${mecanico.disponibilidad ? 'success' : 'warning'}">
                        ${mecanico.disponibilidad ? 'Disponible' : 'No Disponible'}
                    </span>
                </div>
                <div class="card-body">
                    <p><strong>Especialidad:</strong> ${mecanico.especialidad}</p>
                    <p><strong>Email:</strong> ${mecanico.email}</p>
                    <p><strong>Teléfono:</strong> ${mecanico.telefono}</p>
                    <p><strong>Servicios Completados:</strong> ${mecanico.servicios_completados}</p>
                    <p><strong>Calificación:</strong> ${this.renderCalificacion(mecanico.calificacion_promedio)}</p>
                </div>
                <div class="card-footer">
                    ${this.renderAcciones(mecanico)}
                </div>
            </div>
        `;
    }

    renderCalificacion(calificacion) {
        const estrellas = '★'.repeat(Math.round(calificacion)) + 
                         '☆'.repeat(5 - Math.round(calificacion));
        return `<span class="calificacion">${estrellas} (${calificacion.toFixed(1)})</span>`;
    }

    renderAcciones(mecanico) {
        return `
            <button class="btn btn-primary btn-editar" data-id="${mecanico.id}">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-${mecanico.disponibilidad ? 'warning' : 'success'} btn-disponibilidad" 
                    data-id="${mecanico.id}" 
                    data-disponibilidad="${!mecanico.disponibilidad}">
                <i class="fas fa-toggle-${mecanico.disponibilidad ? 'off' : 'on'}"></i>
                ${mecanico.disponibilidad ? 'Marcar No Disponible' : 'Marcar Disponible'}
            </button>
        `;
    }

    setupCardListeners() {
        this.listaMecanicos?.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleEditar(e.target.dataset.id));
        });

        this.listaMecanicos?.querySelectorAll('.btn-disponibilidad').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const { id, disponibilidad } = e.target.dataset;
                this.handleCambiarDisponibilidad(id, disponibilidad === 'true');
            });
        });
    }

    async handleEditar(mecanicoId) {
        try {
            const mecanico = await this.mecanicosService.getById(mecanicoId);
            // Implementar lógica de edición (modal o redirección)
            this.showEditModal(mecanico);
        } catch (error) {
            this.handleError(error, 'Error al cargar datos del mecánico');
        }
    }

    async handleCambiarDisponibilidad(mecanicoId, nuevaDisponibilidad) {
        try {
            await this.mecanicosService.actualizarDisponibilidad(mecanicoId, nuevaDisponibilidad);
            this.showNotification(
                `Mecánico marcado como ${nuevaDisponibilidad ? 'disponible' : 'no disponible'}`,
                'success'
            );
        } catch (error) {
            this.handleError(error, 'Error al actualizar disponibilidad');
        }
    }

    setupFiltros() {
        const filtroEspecialidad = document.getElementById('filtroEspecialidad');
        const filtroDisponibilidad = document.getElementById('filtroDisponibilidad');

        [filtroEspecialidad, filtroDisponibilidad].forEach(filtro => {
            filtro?.addEventListener('change', () => this.aplicarFiltros());
        });
    }

    async aplicarFiltros() {
        const especialidad = document.getElementById('filtroEspecialidad')?.value;
        const disponibilidad = document.getElementById('filtroDisponibilidad')?.value;

        const filtros = [];
        if (especialidad) {
            filtros.push({ field: 'especialidad', operator: '==', value: especialidad });
        }
        if (disponibilidad !== '') {
            filtros.push({ field: 'disponibilidad', operator: '==', value: disponibilidad === 'true' });
        }

        try {
            const mecanicos = await this.mecanicosService.getAll(filtros);
            this.listaMecanicos.innerHTML = mecanicos.map(mecanico => 
                this.renderMecanicoCard(mecanico)
            ).join('');
            this.setupCardListeners();
        } catch (error) {
            this.handleError(error, 'Error al aplicar filtros');
        }
    }

    setupRealTimeUpdates() {
        this.mecanicosService.subscribeToChanges((mecanicos) => {
            this.listaMecanicos.innerHTML = mecanicos.map(mecanico => 
                this.renderMecanicoCard(mecanico)
            ).join('');
            this.setupCardListeners();
        });
    }
}

// Inicializar controlador
new MecanicosController(); 