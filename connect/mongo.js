const mongoose = require('mongoose');
const logger = require('../libs/logger');

module.exports = ({ uri }) => {
    //database connection
    mongoose.connect(uri);

    mongoose.connection.on('connected', function () {
        logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', function (err) {
        logger.error({ error: err.message }, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', function () {
        logger.warn('MongoDB connection disconnected');
    });

    process.on('SIGINT', async function () {
        try {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        } catch (err) {
            logger.error({ error: err.message }, 'Error closing MongoDB connection');
            process.exit(1);
        }
    });
};
