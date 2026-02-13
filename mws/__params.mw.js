module.exports = () => {
    return ({ req, _res, next }) => {
        next(req.params);
    };
};
