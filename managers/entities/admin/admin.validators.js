const Joi = require('joi');

const validators = {
    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        name: Joi.string().min(2).required(),
        role: Joi.string().valid('superadmin', 'school_admin').required(),
        schoolId: Joi.string().when('role', {
            is: 'school_admin',
            then: Joi.required(),
            otherwise: Joi.forbidden()
        })
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    update: Joi.object({
        adminId: Joi.string().required(),
        name: Joi.string().min(2),
        isActive: Joi.boolean()
    })
};

module.exports = validators;
