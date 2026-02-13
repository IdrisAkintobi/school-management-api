const mongoose = require('mongoose');
const logger = require('../libs/logger');
mongoose.Promise = global.Promise;

module.exports = ({ uri }) => {
    //database connection
    mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    mongoose.connection.on('connected', function () {
        logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', function (err) {
        logger.error({ error: err.message }, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', function () {
        logger.warn('MongoDB connection disconnected');
    });

    process.on('SIGINT', function () {
        mongoose.connection.close(function () {
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });
    });
};
