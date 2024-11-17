import { firestoreService } from '../firebase/firestore.js';

export class BaseService {
    constructor() {
        this.firestoreService = firestoreService;
        this.listeners = new Map();
    }

    async init() {
        try {
            await this.loadInitialData();
            this.setupEventListeners();
            this.setupRealTimeUpdates();
        } catch (error) {
            console.error('Error initializing service:', error);
            this.showNotification('Error al inicializar', 'error');
        }
    }

    setupEventListeners() {
        // Implementar en las clases hijas
    }

    setupRealTimeUpdates() {
        // Implementar en las clases hijas
    }

    async loadInitialData() {
        // Implementar en las clases hijas
    }

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    cleanupListeners() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners.clear();
    }
} 