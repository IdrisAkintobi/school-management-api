const Joi = require('joi');

const resourceSchema = Joi.object({
    name: Joi.string().min(1).required(),
    count: Joi.number().integer().min(0).required()
});

const validators = {
    create: Joi.object({
        schoolId: Joi.string().required(),
        name: Joi.string().min(1).required(),
        grade: Joi.string().allow(''),
        section: Joi.string().allow(''),
        capacity: Joi.number().integer().min(1).required(),
        minAge: Joi.number().integer().min(1).max(85).default(3),
        maxAge: Joi.number().integer().min(1).max(85).default(25),
        resources: Joi.array().items(resourceSchema)
    }).custom((value, helpers) => {
        if (value.minAge && value.maxAge && value.minAge > value.maxAge) {
            return helpers.error('any.invalid', { message: 'minAge cannot be greater than maxAge' });
        }
        return value;
    }),

    update: Joi.object({
        classroomId: Joi.string().required(),
        name: Joi.string().min(1),
        grade: Joi.string().allow(''),
        section: Joi.string().allow(''),
        capacity: Joi.number().integer().min(1),
        minAge: Joi.number().integer().min(1).max(85),
        maxAge: Joi.number().integer().min(1).max(85),
        resources: Joi.array().items(resourceSchema),
        isActive: Joi.boolean()
    }).custom((value, helpers) => {
        if (value.minAge && value.maxAge && value.minAge > value.maxAge) {
            return helpers.error('any.invalid', { message: 'minAge cannot be greater than maxAge' });
        }
        return value;
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
