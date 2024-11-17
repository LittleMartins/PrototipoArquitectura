import { ErrorHandler } from '../utils/ErrorHandler.js';
import { Validator } from '../utils/Validator.js';

export class BaseController {
    constructor() {
        this.notifications = [];
        this.errorHandler = ErrorHandler;
        this.validator = Validator;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeComponents();
            this.loadInitialData();
        });
    }

    async initializeComponents() {
        // Implementar en clases hijas
    }

    async loadInitialData() {
        // Implementar en clases hijas
    }

    async handleAsyncOperation(operation, context = '') {
        try {
            return await operation();
        } catch (error) {
            await this.errorHandler.handle(error, context);
            throw error;
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            duration
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        setTimeout(() => {
            this.removeNotification(notification.id);
        }, duration);
    }

    renderNotification(notification) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${notification.type}`;
        toast.id = `toast-${notification.id}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon fas ${this.getNotificationIcon(notification.type)}"></i>
                <span class="toast-message">${notification.message}</span>
            </div>
            <button class="toast-close" aria-label="Cerrar notificación">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);
        
        // Añadir listener para cerrar
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeNotification(notification.id);
        });
    }

    removeNotification(id) {
        const toast = document.getElementById(`toast-${id}`);
        if (toast) {
            toast.remove();
        }
        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    async validateForm(formData, rules) {
        const errors = await this.validator.validate(formData, rules);
        
        if (errors.length > 0) {
            this.showFormErrors(errors);
            return false;
        }
        
        return true;
    }

    showFormErrors(errors) {
        errors.forEach(error => {
            const field = document.getElementById(error.field);
            if (field) {
                field.classList.add('is-invalid');
                
                const errorElement = document.createElement('div');
                errorElement.className = 'invalid-feedback';
                errorElement.textContent = error.message;
                
                field.parentNode.appendChild(errorElement);
            }
        });
    }

    clearFormErrors() {
        document.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
            const errorElement = field.parentNode.querySelector('.invalid-feedback');
            if (errorElement) {
                errorElement.remove();
            }
        });
    }
} 