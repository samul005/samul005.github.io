class DatabaseValidator {
    constructor() {
        this.timestamp = "2025-02-02 04:52:16";
        this.currentUser = "samul005";
        
        this.schemas = {
            user: {
                required: ['uid', 'email', 'username', 'created'],
                types: {
                    uid: 'string',
                    email: 'string',
                    username: 'string',
                    created: 'string',
                    level: 'number',
                    experience: 'number',
                    coins: 'number'
                },
                constraints: {
                    username: {
                        minLength: 3,
                        maxLength: 16,
                        pattern: /^[A-Za-z0-9_]+$/
                    },
                    level: {
                        min: 1,
                        max: 100
                    },
                    coins: {
                        min: 0
                    }
                }
            },
            gameResult: {
                required: ['userId', 'score', 'duration', 'mode'],
                types: {
                    userId: 'string',
                    score: 'number',
                    duration: 'number',
                    mode: 'string',
                    won: 'boolean'
                },
                constraints: {
                    score: {
                        min: 0
                    },
                    duration: {
                        min: 0
                    },
                    mode: {
                        enum: ['classic', 'timeChallenge', 'extreme']
                    }
                }
            },
            transaction: {
                required: ['userId', 'itemId', 'cost'],
                types: {
                    userId: 'string',
                    itemId: 'string',
                    cost: 'number',
                    timestamp: 'string'
                },
                constraints: {
                    cost: {
                        min: 0
                    }
                }
            }
        };
    }

    validateData(data, schemaName) {
        const schema = this.schemas[schemaName];
        if (!schema) {
            throw new Error(`Schema '${schemaName}' not found`);
        }

        const errors = [];

        // Check required fields
        schema.required.forEach(field => {
            if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        // Check types
        Object.entries(schema.types).forEach(([field, type]) => {
            if (field in data && typeof data[field] !== type) {
                errors.push(`Invalid type for ${field}: expected ${type}, got ${typeof data[field]}`);
            }
        });

        // Check constraints
        if (schema.constraints) {
            Object.entries(schema.constraints).forEach(([field, constraints]) => {
                if (field in data) {
                    const value = data[field];

                    if ('minLength' in constraints && value.length < constraints.minLength) {
                        errors.push(`${field} must be at least ${constraints.minLength} characters long`);
                    }

                    if ('maxLength' in constraints && value.length > constraints.maxLength) {
                        errors.push(`${field} must be no more than ${constraints.maxLength} characters long`);
                    }

                    if ('pattern' in constraints && !constraints.pattern.test(value)) {
                        errors.push(`${field} contains invalid characters`);
                    }

                    if ('min' in constraints && value < constraints.min) {
                        errors.push(`${field} must be at least ${constraints.min}`);
                    }

                    if ('max' in constraints && value > constraints.max) {
                        errors.push(`${field} must be no more than ${constraints.max}`);
                    }

                    if ('enum' in constraints && !constraints.enum.includes(value)) {
                        errors.push(`${field} must be one of: ${constraints.enum.join(', ')}`);
                    }
                }
            });
        }

        if (errors.length > 0) {
            throw new ValidationError(errors);
        }

        return true;
    }

    sanitizeData(data, schemaName) {
        const schema = this.schemas[schemaName];
        if (!schema) {
            throw new Error(`Schema '${schemaName}' not found`);
        }

        const sanitized = {};

        // Only include fields defined in the schema
        Object.entries(schema.types).forEach(([field, type]) => {
            if (field in data) {
                let value = data[field];

                // Basic sanitization based on type
                switch (type) {
                    case 'string':
                        value = this.sanitizeString(value);
                        break;
                    case 'number':
                        value = this.sanitizeNumber(value);
                        break;
                    case 'boolean':
                        value = Boolean(value);
                        break;
                }

                sanitized[field] = value;
            }
        });

        return sanitized;
    }

    sanitizeString(value) {
        // Convert to string and trim
        value = String(value).trim();
        
        // Remove any HTML tags
        value = value.replace(/<[^>]*>/g, '');
        
        // Remove multiple spaces
        value = value.replace(/\s+/g, ' ');
        
        return value;
    }

    sanitizeNumber(value) {
        // Convert to number
        const num = Number(value);
        
        // Return 0 if not a valid number
        return isNaN(num) ? 0 : num;
    }

    async validateDocumentExists(collection, docId) {
        const doc = await firebase.firestore().collection(collection).doc(docId).get();
        return doc.exists;
    }

    async validateUniqueness(collection, field, value, excludeId = null) {
        const query = await firebase.firestore()
            .collection(collection)
            .where(field, '==', value)
            .get();

        if (excludeId) {
            return query.docs.every(doc => doc.id !== excludeId);
        }

        return query.empty;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password) {
        const requirements = {
            minLength: 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*]/.test(password)
        };

        const errors = [];

        if (password.length < requirements.minLength) {
            errors.push(`Password must be at least ${requirements.minLength} characters long`);
        }
        if (!requirements.hasUpperCase) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!requirements.hasLowerCase) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!requirements.hasNumber) {
            errors.push('Password must contain at least one number');
        }
        if (!requirements.hasSpecialChar) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors,
            strength: this.calculatePasswordStrength(password, requirements)
        };
    }

    calculatePasswordStrength(password, requirements) {
        let strength = 0;
        
        // Length contribution (up to 40%)
        strength += Math.min(password.length / 20, 1) * 40;
        
        // Character type contribution (15% each)
        if (requirements.hasUpperCase) strength += 15;
        if (requirements.hasLowerCase) strength += 15;
        if (requirements.hasNumber) strength += 15;
        if (requirements.hasSpecialChar) strength += 15;

        return Math.min(strength, 100);
    }

    logValidationError(error, context) {
        const errorLog = {
            timestamp: this.timestamp,
            userId: this.currentUser,
            error: {
                message: error.message,
                details: error.errors || [],
                stack: error.stack
            },
            context: context
        };

        firebase.firestore()
            .collection('validation_errors')
            .add(errorLog)
            .catch(err => console.error('Error logging validation error:', err));
    }
}

class ValidationError extends Error {
    constructor(errors) {
        super('Validation failed');
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

export { DatabaseValidator, ValidationError };
