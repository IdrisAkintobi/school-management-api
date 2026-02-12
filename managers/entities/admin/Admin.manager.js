const AdminModel = require('./admin.schema');
const validators = require('./admin.validators');
const mongoose = require('mongoose');

module.exports = class Admin {
    constructor({ utils, cache, config, cortex, managers } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.cache = cache;
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
            if (error) return { error: error.details[0].message };

            if (role === 'school_admin' && !mongoose.Types.ObjectId.isValid(schoolId)) {
                return { error: 'Invalid school ID' };
            }

            const existingAdmin = await AdminModel.findOne({ email });
            if (existingAdmin) {
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
            return { error: 'Registration failed' };
        }
    }

    async login({ email, password }) {
        try {
            const { error } = this.validators.login.validate({ email, password });
            if (error) return { error: error.details[0].message };

            const admin = await AdminModel.findOne({ email, deletedAt: null });
            if (!admin) {
                return { error: 'Invalid credentials' };
            }

            const isPasswordValid = await admin.comparePassword(password);
            if (!isPasswordValid) {
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
            return { error: 'Failed to fetch admins' };
        }
    }

    async getById({ adminId, __auth }) {
        try {
            if (!mongoose.Types.ObjectId.isValid(adminId)) {
                return { error: 'Invalid admin ID' };
            }

            if (__auth.role !== 'superadmin' && __auth.userId !== adminId) {
                return { error: 'Unauthorized access' };
            }

            const admin = await AdminModel.findOne({ _id: adminId, deletedAt: null }).select('-password').lean();
            if (!admin) {
                return { error: 'Admin not found' };
            }

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
            return { error: 'Failed to fetch admin' };
        }
    }
};
