const AdminModel = require('./admin.schema');
const validators = require('./admin.validators');
const mongoose = require('mongoose');

module.exports = class Admin {
    constructor({ utils, cache, config, cortex, managers, logger } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.cache = cache;
        this.logger = logger;
        this.tokenManager = managers.token;
        this.validators = validators;
        
        this.httpExposed = [
            'post=register',
            'post=login',
            'get=list',
            'get=getById'
        ];
    }

    async register({ email, password, name, role, schoolId, __superadmin }) {
        try {
            const { error } = this.validators.register.validate({ email, password, name, role, schoolId });
            if (error) {
                this.logger.debug({ email, role, error: error.details[0].message }, 'Admin registration validation failed');
                return { error: error.details[0].message };
            }

            if (role === 'school_admin' && !mongoose.Types.ObjectId.isValid(schoolId)) {
                this.logger.warn({ email, schoolId }, 'Invalid school ID during admin registration');
                return { error: 'Invalid school ID' };
            }

            const existingAdmin = await AdminModel.findOne({ email });
            if (existingAdmin) {
                this.logger.warn({ email }, 'Attempted to register with existing email');
                return { error: 'Email already registered' };
            }

            const admin = new AdminModel({
                email,
                password,
                name,
                role,
                schoolId: role === 'school_admin' ? schoolId : null
            });

            await admin.save();
            this.logger.info({ adminId: admin._id, email, role }, 'Admin registered successfully');

            return {
                admin: {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                    schoolId: admin.schoolId
                }
            };
        } catch (err) {
            this.logger.error({ error: err.message, email }, 'Admin registration failed');
            return { error: 'Registration failed' };
        }
    }

    async login({ email, password }) {
        try {
            const { error } = this.validators.login.validate({ email, password });
            if (error) {
                this.logger.debug({ email, error: error.details[0].message }, 'Login validation failed');
                return { error: error.details[0].message };
            }

            const admin = await AdminModel.findOne({ email, deletedAt: null });
            if (!admin) {
                this.logger.warn({ email }, 'Login attempt with non-existent email');
                return { error: 'Invalid credentials' };
            }

            const isPasswordValid = await admin.comparePassword(password);
            if (!isPasswordValid) {
                this.logger.warn({ email, adminId: admin._id }, 'Login attempt with invalid password');
                return { error: 'Invalid credentials' };
            }

            const longToken = this.tokenManager.genLongToken({
                userId: admin._id.toString(),
                userKey: admin.email
            });

            const shortToken = this.tokenManager.genShortToken({
                userId: admin._id.toString(),
                userKey: admin.email,
                role: admin.role,
                schoolId: admin.schoolId?.toString() || null,
                sessionId: require('nanoid').nanoid()
            });

            this.logger.info({ adminId: admin._id, email, role: admin.role }, 'Admin logged in successfully');

            return {
                admin: {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                    schoolId: admin.schoolId
                },
                longToken,
                shortToken
            };
        } catch (err) {
            this.logger.error({ error: err.message, email }, 'Login failed');
            return { error: 'Login failed' };
        }
    }

    async list({ page = 1, limit = 10, __superadmin }) {
        try {
            page = parseInt(page) || 1;
            limit = parseInt(limit) || 10;

            const skip = (page - 1) * limit;
            const admins = await AdminModel.find({ deletedAt: null })
                .select('-password')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();

            const total = await AdminModel.countDocuments({ deletedAt: null });

            this.logger.debug({ page, limit, total }, 'Admins list fetched');

            const transformedAdmins = admins.map(admin => ({
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                schoolId: admin.schoolId,
                isActive: admin.isActive,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt
            }));

            return {
                admins: transformedAdmins,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            this.logger.error({ error: err.message }, 'Failed to fetch admins');
            return { error: 'Failed to fetch admins' };
        }
    }

    async getById({ adminId, __auth }) {
        try {
            if (!mongoose.Types.ObjectId.isValid(adminId)) {
                this.logger.debug({ adminId }, 'Invalid admin ID format');
                return { error: 'Invalid admin ID' };
            }

            if (__auth.role !== 'superadmin' && __auth.userId !== adminId) {
                this.logger.warn({ requesterId: __auth.userId, targetAdminId: adminId }, 'Unauthorized admin access attempt');
                return { error: 'Unauthorized access' };
            }

            const admin = await AdminModel.findOne({ _id: adminId, deletedAt: null }).select('-password').lean();
            if (!admin) {
                this.logger.debug({ adminId }, 'Admin not found');
                return { error: 'Admin not found', code: 404 };
            }

            this.logger.debug({ adminId }, 'Admin fetched successfully');

            return { 
                admin: {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                    schoolId: admin.schoolId,
                    isActive: admin.isActive,
                    createdAt: admin.createdAt,
                    updatedAt: admin.updatedAt
                }
            };
        } catch (err) {
            this.logger.error({ error: err.message, adminId }, 'Failed to fetch admin');
            return { error: 'Failed to fetch admin' };
        }
    }
};
