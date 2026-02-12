const Joi = require('joi');

const validators = {
    create: Joi.object({
        schoolId: Joi.string().required(),
        name: Joi.string().min(1).required(),
        grade: Joi.string().allow(''),
        section: Joi.string().allow(''),
        capacity: Joi.number().integer().min(1).required(),
        resources: Joi.array().items(Joi.string())
    }),

    update: Joi.object({
        classroomId: Joi.string().required(),
        name: Joi.string().min(1),
        grade: Joi.string().allow(''),
        section: Joi.string().allow(''),
        capacity: Joi.number().integer().min(1),
        resources: Joi.array().items(Joi.string()),
        isActive: Joi.boolean()
    }),

    getById: Joi.object({
        classroomId: Joi.string().required()
    }),

    list: Joi.object({
        schoolId: Joi.string(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        isActive: Joi.boolean()
    }),

    delete: Joi.object({
        classroomId: Joi.string().required()
    }),

    restore: Joi.object({
        classroomId: Joi.string().required()
    })
};

module.exports = validators;
