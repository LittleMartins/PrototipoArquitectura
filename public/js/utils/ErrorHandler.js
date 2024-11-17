export class ErrorHandler {
    static async handle(error, context = '') {
        console.error(`Error en ${context}:`, error);
        
        const message = this.getErrorMessage(error);
        await this.logError(error, context);
        
        this.notifyUser(message);
        
        return {
            message,
            originalError: error,
            context
        };
    }

    static getErrorMessage(error) {
        if (error.code) {
            return this.getMessageForCode(error.code);
        }
        
        if (error.message) {
            return this.sanitizeErrorMessage(error.message);
        }
        
        return 'Ha ocurrido un error inesperado';
    }

    static getMessageForCode(code) {
        const errorMessages = {
            // Firebase Auth
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/email-already-in-use': 'El correo ya está en uso',
            
            // Firestore
            'permission-denied': 'No tienes permisos para realizar esta acción',
            'not-found': 'El recurso solicitado no existe',
            'invalid-argument': 'Los datos proporcionados no son válidos',
            'failed-precondition': 'No se cumplen las condiciones necesarias',
            'already-exists': 'El registro ya existe',
            'resource-exhausted': 'Se ha excedido el límite de recursos',
            'cancelled': 'La operación fue cancelada',
            'data-loss': 'Se han perdido datos irrecuperables',
            'unknown': 'Error desconocido',
            'internal': 'Error interno del servidor',
            'unavailable': 'Servicio no disponible',
            'deadline-exceeded': 'Tiempo de espera agotado'
        };

        return errorMessages[code] || 'Ha ocurrido un error inesperado';
    }

    static sanitizeErrorMessage(message) {
        // Eliminar información sensible o técnica
        return message.replace(/firebase|firestore|auth/gi, 'sistema');
    }

    static async logError(error, context) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            context,
            message: error.message,
            stack: error.stack,
            code: error.code,
            userId: this.getCurrentUserId()
        };

        // Aquí se podría implementar el logging a un servicio
        console.error('Error Log:', errorLog);
    }

    static notifyUser(message) {
        if (window.notificationSystem) {
            window.notificationSystem.show(message, 'error');
        }
    }

    static getCurrentUserId() {
        // Implementar obtención del usuario actual
        return 'anonymous';
    }
} 