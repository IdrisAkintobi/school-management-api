module.exports = ({ meta, config, managers, logger }) =>{
    return ({req, res, next})=>{
        const token = req.headers.authorization?.replace('Bearer ', '') || req.headers.token;
        
        if(!token){
            logger.warn({ headers: req.headers }, 'Long token required but not found');
            return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
        }
        let decoded = null;
        try {
            decoded = managers.token.verifyLongToken({token});
            if(!decoded){
                logger.warn({ token: token.substring(0, 20) + '...' }, 'Failed to decode long token');
                return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
            };
        } catch(err){
            logger.error({ error: err.message }, 'Error verifying long token');
            return managers.responseDispatcher.dispatch(res, {ok: false, code:401, errors: 'unauthorized'});
        }
        next(decoded);
    }
}