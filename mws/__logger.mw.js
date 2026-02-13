const logger = require('../libs/logger');

module.exports = ({ meta, config, managers }) => {
    return ({ req, res, next }) => {
        const startTime = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const logData = {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
                userAgent: req.get('user-agent')
            };

            if (res.statusCode >= 500) {
                logger.error(logData, 'HTTP Request');
            } else if (res.statusCode >= 400) {
                logger.warn(logData, 'HTTP Request');
            } else {
                logger.info(logData, 'HTTP Request');
            }
        });

        next();
    };
};
