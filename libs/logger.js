const pino = require('pino');
const path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';
const logDir = path.join(__dirname, '../logs');

const getTransport = () => {
    if (isDevelopment) {
        return {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname'
            }
        };
    } else {
        return {
            target: 'pino-roll',
            options: {
                file: path.join(logDir, 'app.log'),
                frequency: 'daily',
                size: '10m',
                mkdir: true,
                dateFormat: 'yyyy-MM-dd',
                limit: {
                    count: 30
                }
            }
        };
    }
};

const logger = pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: getTransport(),
    formatters: {
        level: label => {
            return { level: label };
        }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
        env: process.env.NODE_ENV || 'development'
    },
    redact: {
        paths: [
            'password',
            'token',
            'accessToken',
            'refreshToken',
            'authorization',
            'cookie',
            'email',
            '*.password',
            '*.token',
            '*.accessToken',
            '*.refreshToken',
            '*.email',
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]'
        ],
        censor: (value, path) => {
            // Custom censor function for emails
            if (path.includes('email') && typeof value === 'string' && value.includes('@')) {
                const [local, domain] = value.split('@');
                if (local.length > 2) {
                    return `${local.substring(0, 2)}***@${domain}`;
                }
                return `**@${domain}`;
            }
            return '[REDACTED]';
        }
    }
});

// Helper to redact email addresses in log data
logger.redactEmail = email => {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return email;
    }
    const [local, domain] = email.split('@');
    if (local.length > 2) {
        return `${local.substring(0, 2)}***@${domain}`;
    }
    return `**@${domain}`;
};

// Helper to redact PII in objects before logging
logger.sanitize = obj => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in sanitized) {
        if (key === 'email' && typeof sanitized[key] === 'string') {
            sanitized[key] = logger.redactEmail(sanitized[key]);
        } else if (key === 'password' || key === 'token') {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = logger.sanitize(sanitized[key]);
        }
    }

    return sanitized;
};

module.exports = logger;
