const http              = require('http');
const express           = require('express');
const cors              = require('cors');
const helmet            = require('helmet');
const mongoSanitize     = require('express-mongo-sanitize');
const rateLimit         = require('express-rate-limit');
const app               = express();

module.exports = class UserServer {
    constructor({config, managers}){
        this.config        = config;
        this.userApi       = managers.userApi;
    }
    
    use(args){
        app.use(args);
    }

    run(){
        app.set('trust proxy', 1);
        app.use(helmet());
        app.use(cors({origin: '*'}));
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        app.use(mongoSanitize());
        app.use('/static', express.static('public'));

        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            message: 'Too many requests from this IP, please try again later'
        });

        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 5,
            message: 'Too many authentication attempts, please try again later'
        });

        // Register rate limiters
        app.use('/api/', limiter);
        app.use('/api/admin/login', authLimiter);
        app.use('/api/admin/register', authLimiter);

        app.use((err, req, res, next) => {
            console.error(err.stack)
            res.status(500).send('Something broke!')
        });
        
        /** Register route handlers */
        app.all('/api/:moduleName/:fnName', this.userApi.mw);

        let server = http.createServer(app);
        server.listen(this.config.dotEnv.USER_PORT, () => {
            console.log(`${(this.config.dotEnv.SERVICE_NAME).toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`);
        });
    }
}