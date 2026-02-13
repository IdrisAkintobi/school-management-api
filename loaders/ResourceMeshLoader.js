const loader = require('./_common/fileLoader');

module.exports = class ResourceMeshLoader {
    constructor(injectable) {
        this.injectable = injectable;
    }

    load() {
        loader('./mws/**/*.rnode.js');

        return this.nodes;
    }
};
