const Joi = require('joi');

const validators = {
    create: Joi.object({
        name: Joi.string().min(2).required(),
        address: Joi.string().allow(''),
        phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow(''),
        email: Joi.string().email().allow(''),
        principal: Joi.string().allow(''),
        establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear())
    }),

    update: Joi.object({
        schoolId: Joi.string().required(),
        name: Joi.string().min(2),
        address: Joi.string().allow(''),
        phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow(''),
        email: Joi.string().email().allow(''),
        principal: Joi.string().allow(''),
        establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()),
        isActive: Joi.boolean()
    }),

    getById: Joi.object({
        schoolId: Joi.string().required()
    }),

    list: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        isActive: Joi.boolean()
    }),

    delete: Joi.object({
        schoolId: Joi.string().required()
    })
};

module.exports = validators;
