import { BaseController } from './BaseController.js';
import { RepuestosService } from '../services/RepuestosService.js';

export class RepuestosController extends BaseController {
    constructor() {
        super();
        this.repuestosService = new RepuestosService();
        this.form = document.getElementById('repuestoForm');
        this.listaRepuestos = document.getElementById('listaRepuestos');
        this.stockForm = document.getElementById('stockForm');
    }

    async initializeComponents() {
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        this.stockForm?.addEventListener('submit', (e) => this.handleStockUpdate(e));
        this.setupRealTimeUpdates();
        this.setupFiltros();
    }

    async loadInitialData() {
        await this.cargarRepuestos();
        this.verificarStockBajo();
    }

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const repuestoData = {
                codigo: formData.get('codigo'),
                descripcion: formData.get('descripcion'),
                precio: parseFloat(formData.get('precio')),
                stock: parseInt(formData.get('stock')),
                stock_minimo: parseInt(formData.get('stock_minimo')),
                proveedor: formData.get('proveedor'),
                categoria: formData.get('categoria'),
                ubicacion: formData.get('ubicacion')
            };

            this.repuestosService.validarRepuesto(repuestoData);
            await this.repuestosService.create(repuestoData);
            this.showNotification('Repuesto registrado exitosamente', 'success');
            this.form.reset();
        } catch (error) {
            this.handleError(error, 'Error al registrar repuesto');
        }
    }

    async handleStockUpdate(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const repuestoId = formData.get('repuesto_id');
            const cantidad = parseInt(formData.get('cantidad'));
            const operacion = formData.get('operacion');

            await this.repuestosService.actualizarStock(repuestoId, cantidad, operacion);
            this.showNotification('Stock actualizado correctamente', 'success');
            this.stockForm.reset();
        } catch (error) {
            this.handleError(error, 'Error al actualizar stock');
        }
    }

    async cargarRepuestos() {
        if (!this.listaRepuestos) return;

        try {
            const repuestos = await this.repuestosService.getAll([], {
                field: 'descripcion',
                direction: 'asc'
            });

            this.listaRepuestos.innerHTML = repuestos.map(repuesto => 
                this.renderRepuestoCard(repuesto)
            ).join('');
            
            this.setupCardListeners();
        } catch (error) {
            this.handleError(error, 'Error al cargar repuestos');
        }
    }

    renderRepuestoCard(repuesto) {
        const stockBajo = repuesto.stock <= repuesto.stock_minimo;
        
        return `
            <div class="card repuesto-card ${stockBajo ? 'stock-bajo' : ''}" data-id="${repuesto.id}">
                <div class="card-header">
                    <h3>${repuesto.descripcion}</h3>
                    <span class="codigo">${repuesto.codigo}</span>
                </div>
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">Precio:</span>
                            <span class="value">$${repuesto.precio.toFixed(2)}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Stock:</span>
                            <span class="value ${stockBajo ? 'text-danger' : ''}">
                                ${repuesto.stock} unidades
                                ${stockBajo ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="label">Proveedor:</span>
                            <span class="value">${repuesto.proveedor}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Categoría:</span>
                            <span class="value">${repuesto.categoria}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Ubicación:</span>
                            <span class="value">${repuesto.ubicacion}</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    ${this.renderAcciones(repuesto)}
                </div>
            </div>
        `;
    }

    renderAcciones(repuesto) {
        return `
            <button class="btn btn-primary btn-editar" data-id="${repuesto.id}">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-success btn-stock" data-id="${repuesto.id}">
                <i class="fas fa-plus"></i> Ajustar Stock
            </button>
            <button class="btn btn-info btn-historial" data-id="${repuesto.id}">
                <i class="fas fa-history"></i> Historial
            </button>
        `;
    }

    async verificarStockBajo() {
        try {
            const repuestosBajoStock = await this.repuestosService.getRepuestosBajoStock();
            if (repuestosBajoStock.length > 0) {
                this.showNotification(
                    `Hay ${repuestosBajoStock.length} repuestos con stock bajo`,
                    'warning'
                );
            }
        } catch (error) {
            console.error('Error al verificar stock bajo:', error);
        }
    }

    setupFiltros() {
        const filtroCategoria = document.getElementById('filtroCategoria');
        const filtroStockBajo = document.getElementById('filtroStockBajo');

        [filtroCategoria, filtroStockBajo].forEach(filtro => {
            filtro?.addEventListener('change', () => this.aplicarFiltros());
        });
    }

    async aplicarFiltros() {
        const categoria = document.getElementById('filtroCategoria')?.value;
        const mostrarStockBajo = document.getElementById('filtroStockBajo')?.checked;

        try {
            let filtros = [];
            if (categoria) {
                filtros.push({ field: 'categoria', operator: '==', value: categoria });
            }
            if (mostrarStockBajo) {
                const repuestos = await this.repuestosService.getAll(filtros);
                const repuestosFiltrados = repuestos.filter(r => r.stock <= r.stock_minimo);
                this.actualizarListaRepuestos(repuestosFiltrados);
            } else {
                const repuestos = await this.repuestosService.getAll(filtros);
                this.actualizarListaRepuestos(repuestos);
            }
        } catch (error) {
            this.handleError(error, 'Error al aplicar filtros');
        }
    }

    actualizarListaRepuestos(repuestos) {
        this.listaRepuestos.innerHTML = repuestos.map(repuesto => 
            this.renderRepuestoCard(repuesto)
        ).join('');
        this.setupCardListeners();
    }

    setupRealTimeUpdates() {
        this.repuestosService.subscribeToChanges((repuestos) => {
            this.actualizarListaRepuestos(repuestos);
            this.verificarStockBajo();
        });
    }
}

// Inicializar controlador
new RepuestosController(); 