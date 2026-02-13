const SchoolModel = require('./school.schema');
const ClassroomModel = require('../classroom/classroom.schema');
const StudentModel = require('../student/student.schema');
const validators = require('./school.validators');
const mongoose = require('mongoose');

module.exports = class School {
    constructor({ utils, cache, config, cortex, managers, logger } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.cache = cache;
        this.logger = logger;
        this.validators = validators;
        
        this.httpExposed = [
            'post=create',
            'patch=update',
            'patch=restore',
            'get=list',
            'get=getById',
            'delete=delete'
        ];
    }

    async create({ name, address, phone, email, principal, establishedYear, __superadmin }) {
        try {
            const { error } = this.validators.create.validate({
                name, address, phone, email, principal, establishedYear
            });
            if (error) return { error: error.details[0].message };

            const existingSchool = await SchoolModel.findOne({ 
                name, 
                address,
                deletedAt: null
            });
            
            if (existingSchool) {
                return { error: 'School with this name and address already exists' };
            }

            const school = new SchoolModel({
                name,
                address,
                phone,
                email,
                principal,
                establishedYear,
                createdBy: __superadmin.userId
            });

            await school.save();
            this.logger.info({ schoolId: school._id, name }, 'School created successfully');

            return { school };
        } catch (err) {
            if (err.code === 11000) {
                this.logger.warn({ name, address }, 'Duplicate school creation attempt');
                return { error: 'School with this name and address already exists' };
            }
            this.logger.error({ error: err.message, name }, 'Failed to create school');
            return { error: 'Failed to create school' };
        }
    }

    async update({ schoolId, name, address, phone, email, principal, establishedYear, isActive, __superadmin }) {
        try {
            const { error } = this.validators.update.validate({
                schoolId, name, address, phone, email, principal, establishedYear, isActive
            });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(schoolId)) {
                return { error: 'Invalid school ID' };
            }

            const school = await SchoolModel.findOne({ _id: schoolId, deletedAt: null });
            if (!school) {
                return { error: 'School not found', code: 404 };
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (address !== undefined) updateData.address = address;
            if (phone !== undefined) updateData.phone = phone;
            if (email !== undefined) updateData.email = email;
            if (principal !== undefined) updateData.principal = principal;
            if (establishedYear !== undefined) updateData.establishedYear = establishedYear;
            if (isActive !== undefined) updateData.isActive = isActive;

            const updatedSchool = await SchoolModel.findByIdAndUpdate(
                schoolId,
                updateData,
                { new: true, runValidators: true }
            );
            this.logger.info({ schoolId, updates: Object.keys(updateData) }, 'School updated successfully');

            return { school: updatedSchool };
        } catch (err) {
            return { error: 'Failed to update school' };
        }
    }

    async list({ page = 1, limit = 10, isActive, __superadmin }) {
        try {
            const { error } = this.validators.list.validate({ page, limit, isActive });
            if (error) return { error: error.details[0].message };

            page = parseInt(page) || 1;
            limit = parseInt(limit) || 10;

            const query = {};
            if (isActive !== undefined) query.isActive = isActive;
            query.deletedAt = null;

            const skip = (page - 1) * limit;
            const schools = await SchoolModel.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await SchoolModel.countDocuments(query);

            return {
                schools,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            return { error: 'Failed to fetch schools' };
        }
    }

    async getById({ schoolId, __superadmin }) {
        try {
            const { error } = this.validators.getById.validate({ schoolId });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(schoolId)) {
                return { error: 'Invalid school ID' };
            }

            const school = await SchoolModel.findOne({ _id: schoolId, deletedAt: null });
            if (!school) {
                return { error: 'School not found', code: 404 };
            }

            return { school };
        } catch (err) {
            return { error: 'Failed to fetch school' };
        }
    }

    async delete({ schoolId, __superadmin }) {
        try {
            if (!schoolId) {
                return { error: 'School ID is required' };
            }

            const { error } = this.validators.delete.validate({ schoolId });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(schoolId)) {
                return { error: 'Invalid school ID' };
            }

            const classroomCount = await ClassroomModel.countDocuments({ schoolId, deletedAt: null });
            if (classroomCount > 0) {
                return { error: 'Cannot delete school with active classrooms' };
            }

            const studentCount = await StudentModel.countDocuments({ schoolId, deletedAt: null });
            if (studentCount > 0) {
                return { error: 'Cannot delete school with active students' };
            }

            const school = await SchoolModel.findOne({ _id: schoolId, deletedAt: null });
            if (!school) {
                return { error: 'School not found', code: 404 };
            }

            await SchoolModel.findByIdAndUpdate(
                schoolId,
                { deletedAt: new Date() },
                { new: true }
            );
            this.logger.info({ schoolId, name: school.name }, 'School deleted successfully');

            return { message: 'School deleted successfully', school };
        } catch (err) {
            return { error: 'Failed to delete school' };
        }
    }

    async restore({ schoolId, __superadmin }) {
        try {
            if (!schoolId) {
                return { error: 'School ID is required' };
            }

            if (!mongoose.Types.ObjectId.isValid(schoolId)) {
                return { error: 'Invalid school ID' };
            }

            const school = await SchoolModel.findOne({ _id: schoolId });
            if (!school) {
                return { error: 'School not found', code: 404 };
            }

            if (!school.deletedAt) {
                return { error: 'School is not deleted' };
            }

            const existingActiveSchool = await SchoolModel.findOne({
                name: school.name,
                address: school.address,
                deletedAt: null,
                _id: { $ne: schoolId }
            });

            if (existingActiveSchool) {
                return { error: 'Cannot restore: A school with this name and address already exists' };
            }

            const restoredSchool = await SchoolModel.findByIdAndUpdate(
                schoolId,
                { deletedAt: null },
                { new: true }
            );
            this.logger.info({ schoolId, name: restoredSchool.name }, 'School restored successfully');

            return { school: restoredSchool, message: 'School restored successfully' };
        } catch (err) {
            return { error: 'Failed to restore school' };
        }
    }
};
