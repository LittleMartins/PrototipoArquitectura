export class Validator {
    static async validate(data, rules) {
        const errors = [];
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = data[field];
            
            try {
                await this.validateField(field, value, fieldRules);
            } catch (error) {
                errors.push({
                    field,
                    message: error.message
                });
            }
        }
        
        return errors;
    }

    static async validateField(field, value, rules) {
        // Validación requerida primero
        if (rules.required && !this.rules.required.validate(value)) {
            throw new Error(rules.required.message || `El campo ${field} es requerido`);
        }

        // Si el campo está vacío y no es requerido, no validar más reglas
        if (!value && !rules.required) {
            return;
        }

        // Validar resto de reglas
        for (const [ruleName, ruleConfig] of Object.entries(rules)) {
            if (ruleName === 'required') continue;

            const rule = this.rules[ruleName];
            if (!rule) continue;

            const isValid = await rule.validate(value, ruleConfig.params);
            if (!isValid) {
                throw new Error(ruleConfig.message || rule.message);
            }
        }
    }

    static rules = {
        required: {
            validate: value => value !== null && value !== undefined && value !== '',
            message: 'Este campo es requerido'
        },
        email: {
            validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            message: 'Correo electrónico inválido'
        },
        phone: {
            validate: value => /^\+?[\d\s-]{8,}$/.test(value),
            message: 'Número de teléfono inválido'
        },
        numeric: {
            validate: value => !isNaN(value) && value !== '',
            message: 'Debe ser un número válido'
        },
        min: {
            validate: (value, min) => Number(value) >= min,
            message: min => `El valor debe ser mayor o igual a ${min}`
        },
        max: {
            validate: (value, max) => Number(value) <= max,
            message: max => `El valor debe ser menor o igual a ${max}`
        },
        minLength: {
            validate: (value, min) => value.length >= min,
            message: min => `Debe tener al menos ${min} caracteres`
        },
        maxLength: {
            validate: (value, max) => value.length <= max,
            message: max => `Debe tener máximo ${max} caracteres`
        },
        pattern: {
            validate: (value, regex) => regex.test(value),
            message: regex => `Formato inválido`
        }
    };
} 