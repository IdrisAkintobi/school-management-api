const Redis = require('ioredis');

const createClient = ({ prefix, url }) => {
    const redis = new Redis(url, {
        keyPrefix: prefix + ':',
        lazyConnect: false,
        showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
    });

    //register client events
    redis.on('error', error => {
        console.error(`Redis error [${prefix}]:`, error.message);
    });

    redis.on('end', () => {
        console.error(`Redis connection closed [${prefix}]`);
    });

    redis.on('connect', () => {
        console.log(`Redis connected [${prefix}]`);
    });

    return redis;
};

exports.createClient = createClient;
