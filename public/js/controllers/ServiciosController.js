import { BaseController } from './BaseController.js';
import { ServiciosService } from '../services/ServiciosService.js';
import { RepuestosService } from '../services/RepuestosService.js';
import { MecanicosService } from '../services/MecanicosService.js';

export class ServiciosController extends BaseController {
    constructor() {
        super();
        this.serviciosService = new ServiciosService();
        this.repuestosService = new RepuestosService();
        this.mecanicosService = new MecanicosService();
        
        this.form = document.getElementById('servicioForm');
        this.listaServicios = document.getElementById('listaServicios');
        this.repuestosSeleccionados = [];
        this.costoTotal = 0;
    }

    async initializeComponents() {
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupRepuestosListeners();
        this.setupCalculadoraCostos();
        this.setupRealTimeUpdates();
    }

    async loadInitialData() {
        await Promise.all([
            this.cargarRepuestos(),
            this.cargarMecanicos(),
            this.cargarServicios()
        ]);
    }

    setupRepuestosListeners() {
        document.getElementById('btnAgregarRepuesto')?.addEventListener('click', 
            () => this.agregarRepuestoALista()
        );

        document.getElementById('repuesto_cantidad')?.addEventListener('input', 
            (e) => this.validarCantidadRepuesto(e.target.value)
        );
    }

    setupCalculadoraCostos() {
        document.getElementById('valor_servicio')?.addEventListener('input', 
            () => this.calcularCostoTotal()
        );
    }

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const servicioData = {
                descripcion: formData.get('descripcion'),
                mecanico_id: formData.get('mecanico'),
                vehiculo_id: formData.get('vehiculo'),
                tipo_servicio: formData.get('tipo_servicio'),
                valor_base: parseFloat(formData.get('valor_servicio')),
                repuestos: this.repuestosSeleccionados,
                costo_total: this.costoTotal,
                estado: 'pendiente',
                fecha_inicio: new Date(),
                notas: formData.get('notas') || ''
            };

            await this.serviciosService.crearServicio(servicioData);
            this.showNotification('Servicio registrado exitosamente', 'success');
            this.form.reset();
            this.repuestosSeleccionados = [];
            this.actualizarListaRepuestosSeleccionados();
        } catch (error) {
            this.handleError(error, 'Error al registrar servicio');
        }
    }

    async agregarRepuestoALista() {
        const repuestoSelect = document.getElementById('repuesto_select');
        const cantidad = parseInt(document.getElementById('repuesto_cantidad').value);
        
        try {
            const repuestoId = repuestoSelect.value;
            const repuesto = await this.repuestosService.getById(repuestoId);
            
            if (repuesto.stock < cantidad) {
                throw new Error('Stock insuficiente');
            }

            this.repuestosSeleccionados.push({
                id: repuesto.id,
                descripcion: repuesto.descripcion,
                cantidad: cantidad,
                precio: repuesto.precio,
                subtotal: repuesto.precio * cantidad
            });

            this.actualizarListaRepuestosSeleccionados();
            this.calcularCostoTotal();
        } catch (error) {
            this.handleError(error, 'Error al agregar repuesto');
        }
    }

    actualizarListaRepuestosSeleccionados() {
        const listaRepuestos = document.getElementById('listaRepuestosSeleccionados');
        if (!listaRepuestos) return;

        listaRepuestos.innerHTML = this.repuestosSeleccionados.map((repuesto, index) => `
            <div class="repuesto-item">
                <span class="descripcion">${repuesto.descripcion}</span>
                <span class="cantidad">${repuesto.cantidad} unidades</span>
                <span class="precio">$${repuesto.precio.toFixed(2)}</span>
                <span class="subtotal">$${repuesto.subtotal.toFixed(2)}</span>
                <button type="button" class="btn btn-danger btn-sm" 
                        onclick="serviciosController.removerRepuesto(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    removerRepuesto(index) {
        this.repuestosSeleccionados.splice(index, 1);
        this.actualizarListaRepuestosSeleccionados();
        this.calcularCostoTotal();
    }

    calcularCostoTotal() {
        const valorBase = parseFloat(document.getElementById('valor_servicio').value) || 0;
        const costoRepuestos = this.repuestosSeleccionados.reduce(
            (total, repuesto) => total + repuesto.subtotal, 
            0
        );
        
        this.costoTotal = valorBase + costoRepuestos;
        document.getElementById('costoTotal').textContent = this.costoTotal.toFixed(2);
    }

    async cargarServicios() {
        if (!this.listaServicios) return;

        try {
            const servicios = await this.serviciosService.getAll([], {
                field: 'fecha_inicio',
                direction: 'desc'
            });

            this.listaServicios.innerHTML = await Promise.all(
                servicios.map(servicio => this.renderServicioCard(servicio))
            );
            
            this.setupCardListeners();
        } catch (error) {
            this.handleError(error, 'Error al cargar servicios');
        }
    }

    async renderServicioCard(servicio) {
        const mecanico = await this.mecanicosService.getById(servicio.mecanico_id);
        
        return `
            <div class="card servicio-card ${this.getEstadoClase(servicio.estado)}" 
                 data-id="${servicio.id}">
                <div class="card-header">
                    <h3>${servicio.tipo_servicio}</h3>
                    <span class="badge badge-${this.getEstadoBadge(servicio.estado)}">
                        ${this.formatearEstado(servicio.estado)}
                    </span>
                </div>
                <div class="card-body">
                    <p><strong>Mecánico:</strong> ${mecanico.nombre} ${mecanico.apellido}</p>
                    <p><strong>Fecha Inicio:</strong> ${new Date(servicio.fecha_inicio).toLocaleString()}</p>
                    <p><strong>Descripción:</strong> ${servicio.descripcion}</p>
                    <p><strong>Costo Total:</strong> $${servicio.costo_total.toFixed(2)}</p>
                    ${this.renderRepuestosUsados(servicio.repuestos)}
                </div>
                <div class="card-footer">
                    ${this.renderAccionesServicio(servicio)}
                </div>
            </div>
        `;
    }

    renderRepuestosUsados(repuestos) {
        if (!repuestos || repuestos.length === 0) return '';

        return `
            <div class="repuestos-usados">
                <h4>Repuestos Utilizados:</h4>
                <ul>
                    ${repuestos.map(repuesto => `
                        <li>
                            ${repuesto.descripcion} - 
                            ${repuesto.cantidad} unidades x $${repuesto.precio.toFixed(2)} = 
                            $${repuesto.subtotal.toFixed(2)}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    renderAccionesServicio(servicio) {
        const acciones = [];

        switch (servicio.estado) {
            case 'pendiente':
                acciones.push(`
                    <button class="btn btn-success btn-iniciar" data-id="${servicio.id}">
                        <i class="fas fa-play"></i> Iniciar
                    </button>
                `);
                break;
            case 'en_proceso':
                acciones.push(`
                    <button class="btn btn-success btn-completar" data-id="${servicio.id}">
                        <i class="fas fa-check"></i> Completar
                    </button>
                `);
                break;
        }

        acciones.push(`
            <button class="btn btn-info btn-detalles" data-id="${servicio.id}">
                <i class="fas fa-info-circle"></i> Detalles
            </button>
        `);

        return acciones.join('');
    }

    setupRealTimeUpdates() {
        this.serviciosService.subscribeToChanges((servicios) => {
            this.cargarServicios();
        });
    }
}

// Inicializar controlador
const serviciosController = new ServiciosController();
window.serviciosController = serviciosController; // Para acceder desde el HTML 