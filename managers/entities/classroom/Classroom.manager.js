const validators = require('./classroom.validators');
const mongoose = require('mongoose');

module.exports = class Classroom {
    constructor({ cache, config, cortex, logger, mongoModels } = {}) {
        this.config = config;
        this.cortex = cortex;
        this.cache = cache;
        this.logger = logger;
        this.validators = validators;

        // Injected models
        this.StudentModel = mongoModels.student;
        this.ClassroomModel = mongoModels.classroom;
        this.SchoolModel = mongoModels.school;

        this.httpExposed = [
            'post=create',
            'patch=update',
            'patch=restore',
            'get=list',
            'get=getById',
            'delete=delete'
        ];
    }

    async create({
        schoolId,
        name,
        grade,
        section,
        capacity,
        minAge,
        maxAge,
        resources,
        __schoolAdmin
    }) {
        try {
            const { error } = this.validators.create.validate({
                schoolId,
                name,
                grade,
                section,
                capacity,
                minAge,
                maxAge,
                resources
            });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(schoolId)) {
                return { error: 'Invalid school ID' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== schoolId) {
                return { error: 'Unauthorized: Cannot create classroom for another school' };
            }

            const school = await this.SchoolModel.findOne({ _id: schoolId, deletedAt: null });
            if (!school) {
                return { error: 'School not found or inactive', code: 404 };
            }

            const classroom = new this.ClassroomModel({
                schoolId,
                name,
                grade,
                section,
                capacity,
                minAge: minAge || 3,
                maxAge: maxAge || 25,
                resources: resources || []
            });

            await classroom.save();
            this.logger.info(
                { classroomId: classroom._id, schoolId, name },
                'Classroom created successfully'
            );

            return { classroom };
        } catch (err) {
            if (err.code === 11000) {
                this.logger.warn(
                    { schoolId, name, grade, section },
                    'Duplicate classroom creation attempt'
                );
                return {
                    error: 'Classroom with this name, grade, and section already exists in this school'
                };
            }
            this.logger.error({ error: err.message, schoolId, name }, 'Failed to create classroom');
            return { error: 'Failed to create classroom' };
        }
    }

    async update({
        classroomId,
        name,
        grade,
        section,
        capacity,
        minAge,
        maxAge,
        resources,
        isActive,
        __schoolAdmin
    }) {
        try {
            const { error } = this.validators.update.validate({
                classroomId,
                name,
                grade,
                section,
                capacity,
                minAge,
                maxAge,
                resources,
                isActive
            });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(classroomId)) {
                return { error: 'Invalid classroom ID' };
            }

            const classroom = await this.ClassroomModel.findOne({
                _id: classroomId,
                deletedAt: null
            });
            if (!classroom) {
                return { error: 'Classroom not found', code: 404 };
            }

            if (
                __schoolAdmin.role === 'school_admin' &&
                __schoolAdmin.schoolId !== classroom.schoolId.toString()
            ) {
                return { error: 'Classroom not found', code: 404 };
            }

            if (capacity !== undefined && capacity < classroom.currentEnrollment) {
                return {
                    error: `Cannot reduce capacity below current enrollment (${classroom.currentEnrollment})`
                };
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (grade !== undefined) updateData.grade = grade;
            if (section !== undefined) updateData.section = section;
            if (capacity !== undefined) updateData.capacity = capacity;
            if (minAge !== undefined) updateData.minAge = minAge;
            if (maxAge !== undefined) updateData.maxAge = maxAge;
            if (resources !== undefined) updateData.resources = resources;
            if (isActive !== undefined) updateData.isActive = isActive;

            const updatedClassroom = await this.ClassroomModel.findByIdAndUpdate(
                classroomId,
                updateData,
                { new: true, runValidators: true }
            );
            this.logger.info(
                { classroomId, updates: Object.keys(updateData) },
                'Classroom updated successfully'
            );

            return { classroom: updatedClassroom };
        } catch (err) {
            return { error: 'Failed to update classroom' };
        }
    }

    async list({ schoolId, page = 1, limit = 10, isActive, __schoolAdmin }) {
        try {
            const { error } = this.validators.list.validate({ schoolId, page, limit, isActive });
            if (error) return { error: error.details[0].message };

            page = parseInt(page) || 1;
            limit = parseInt(limit) || 10;

            const query = {};

            if (schoolId) {
                if (!mongoose.Types.ObjectId.isValid(schoolId)) {
                    return { error: 'Invalid school ID' };
                }
                query.schoolId = schoolId;
            }

            if (__schoolAdmin.role === 'school_admin') {
                query.schoolId = __schoolAdmin.schoolId;
            }

            if (isActive !== undefined) query.isActive = isActive;
            query.deletedAt = null;

            const skip = (page - 1) * limit;
            const classrooms = await this.ClassroomModel.find(query)
                .populate('schoolId', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await this.ClassroomModel.countDocuments(query);

            return {
                classrooms,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            return { error: 'Failed to fetch classrooms' };
        }
    }

    async getById({ classroomId, __schoolAdmin }) {
        try {
            const { error } = this.validators.getById.validate({ classroomId });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(classroomId)) {
                return { error: 'Invalid classroom ID' };
            }

            const classroom = await this.ClassroomModel.findOne({
                _id: classroomId,
                deletedAt: null
            }).populate('schoolId', 'name');
            if (!classroom) {
                return { error: 'Classroom not found', code: 404 };
            }

            if (
                __schoolAdmin.role === 'school_admin' &&
                __schoolAdmin.schoolId !== classroom.schoolId._id.toString()
            ) {
                return { error: 'Classroom not found', code: 404 };
            }

            return { classroom };
        } catch (err) {
            return { error: 'Failed to fetch classroom' };
        }
    }

    async delete({ classroomId, __schoolAdmin }) {
        try {
            const { error } = this.validators.delete.validate({ classroomId });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(classroomId)) {
                return { error: 'Invalid classroom ID' };
            }

            const classroom = await this.ClassroomModel.findOne({
                _id: classroomId,
                deletedAt: null
            });
            if (!classroom) {
                return { error: 'Classroom not found', code: 404 };
            }

            if (
                __schoolAdmin.role === 'school_admin' &&
                __schoolAdmin.schoolId !== classroom.schoolId.toString()
            ) {
                return { error: 'Classroom not found', code: 404 };
            }

            const studentCount = await this.StudentModel.countDocuments({
                classroomId,
                deletedAt: null
            });
            if (studentCount > 0) {
                return { error: 'Cannot delete classroom with active students' };
            }

            await this.ClassroomModel.findByIdAndUpdate(classroomId, { deletedAt: new Date() });
            this.logger.info(
                { classroomId, name: classroom.name },
                'Classroom deleted successfully'
            );

            return { message: 'Classroom deleted successfully' };
        } catch (err) {
            return { error: 'Failed to delete classroom' };
        }
    }

    async restore({ classroomId, __schoolAdmin }) {
        try {
            if (!classroomId) {
                return { error: 'Classroom ID is required' };
            }

            if (!mongoose.Types.ObjectId.isValid(classroomId)) {
                return { error: 'Invalid classroom ID' };
            }

            const classroom = await this.ClassroomModel.findOne({ _id: classroomId });
            if (!classroom) {
                return { error: 'Classroom not found', code: 404 };
            }

            if (
                __schoolAdmin.role === 'school_admin' &&
                __schoolAdmin.schoolId !== classroom.schoolId.toString()
            ) {
                return { error: 'Classroom not found', code: 404 };
            }

            if (!classroom.deletedAt) {
                return { error: 'Classroom is not deleted' };
            }

            const school = await this.SchoolModel.findOne({
                _id: classroom.schoolId,
                deletedAt: null
            });
            if (!school) {
                return { error: 'Cannot restore: School is deleted or not found', code: 404 };
            }

            const restoredClassroom = await this.ClassroomModel.findByIdAndUpdate(
                classroomId,
                { deletedAt: null },
                { new: true }
            );
            this.logger.info(
                { classroomId, name: restoredClassroom.name },
                'Classroom restored successfully'
            );

            return { classroom: restoredClassroom, message: 'Classroom restored successfully' };
        } catch (err) {
            return { error: 'Failed to restore classroom' };
        }
    }
};
