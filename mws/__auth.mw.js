module.exports = ({ managers }) => {
    return ({ req, res, next }) => {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.headers.token;

        if (!token) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                message: 'Authentication required'
            });
        }

        try {
            const decoded = managers.token.verifyShortToken({ token });
            if (!decoded) {
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 401,
                    message: 'Invalid or expired token'
                });
            }
            next(decoded);
        } catch (err) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                message: 'Invalid or expired token'
            });
        }
    };
};
