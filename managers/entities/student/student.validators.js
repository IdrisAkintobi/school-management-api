const Joi = require('joi');

const validators = {
    enroll: Joi.object({
        schoolId: Joi.string().required(),
        classroomId: Joi.string().required(),
        students: Joi.array().items(
            Joi.object({
                firstName: Joi.string().min(2).required(),
                lastName: Joi.string().min(2).required(),
                dateOfBirth: Joi.date().max('now').required(),
                gender: Joi.string().valid('male', 'female').required(),
                email: Joi.string().email().allow(''),
                phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow(''),
                address: Joi.string().allow(''),
                guardianName: Joi.string().min(2).required(),
                guardianPhone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required()
            })
        ).min(1).max(50).required()
    }),

    update: Joi.object({
        studentId: Joi.string().required(),
        firstName: Joi.string().min(2),
        lastName: Joi.string().min(2),
        dateOfBirth: Joi.date().max('now'),
        gender: Joi.string().valid('male', 'female'),
        email: Joi.string().email().allow(''),
        phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow(''),
        address: Joi.string().allow(''),
        guardianName: Joi.string().min(2),
        guardianPhone: Joi.string().pattern(/^[0-9+\-\s()]+$/),
        isActive: Joi.boolean()
    }),

    transfer: Joi.object({
        studentId: Joi.string().required(),
        toSchoolId: Joi.string().required(),
        toClassroomId: Joi.string().required(),
        reason: Joi.string().allow('')
    }),

    getById: Joi.object({
        studentId: Joi.string().required()
    }),

    list: Joi.object({
        schoolId: Joi.string(),
        classroomId: Joi.string(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        isActive: Joi.boolean()
    }),

    delete: Joi.object({
        studentId: Joi.string().required()
    }),

    restore: Joi.object({
        studentId: Joi.string().required()
    })
};

module.exports = validators;
