const ClassroomModel = require('./classroom.schema');
const SchoolModel = require('../school/school.schema');
const StudentModel = require('../student/student.schema');
const validators = require('./classroom.validators');
const mongoose = require('mongoose');

module.exports = class Classroom {
    constructor({ utils, cache, config, cortex, managers } = {}) {
            this.config = config;
            this.cortex = cortex;
            this.cache = cache;
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

    async create({ schoolId, name, grade, section, capacity, resources, __schoolAdmin }) {
        try {
            const { error } = this.validators.create.validate({
                schoolId, name, grade, section, capacity, resources
            });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(schoolId)) {
                return { error: 'Invalid school ID' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== schoolId) {
                return { error: 'Unauthorized: Cannot create classroom for another school' };
            }

            const school = await SchoolModel.findOne({ _id: schoolId, deletedAt: null });
            if (!school) {
                return { error: 'School not found or inactive' };
            }

            const classroom = new ClassroomModel({
                schoolId,
                name,
                grade,
                section,
                capacity,
                resources: resources || []
            });

            await classroom.save();

            return { classroom };
        } catch (err) {
            return { error: 'Failed to create classroom' };
        }
    }

    async update({ classroomId, name, grade, section, capacity, resources, isActive, __schoolAdmin }) {
        try {
            const { error } = this.validators.update.validate({
                classroomId, name, grade, section, capacity, resources, isActive
            });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(classroomId)) {
                return { error: 'Invalid classroom ID' };
            }

            const classroom = await ClassroomModel.findOne({ _id: classroomId, deletedAt: null });
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== classroom.schoolId.toString()) {
                return { error: 'Unauthorized: Cannot update classroom from another school' };
            }

            if (capacity !== undefined && capacity < classroom.currentEnrollment) {
                return { error: 'Capacity cannot be less than current enrollment' };
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (grade !== undefined) updateData.grade = grade;
            if (section !== undefined) updateData.section = section;
            if (capacity !== undefined) updateData.capacity = capacity;
            if (resources !== undefined) updateData.resources = resources;
            if (isActive !== undefined) updateData.isActive = isActive;

            const updatedClassroom = await ClassroomModel.findByIdAndUpdate(
                classroomId,
                updateData,
                { new: true, runValidators: true }
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
            const classrooms = await ClassroomModel.find(query)
                .populate('schoolId', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await ClassroomModel.countDocuments(query);

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

            const classroom = await ClassroomModel.findOne({ _id: classroomId, deletedAt: null }).populate('schoolId', 'name');
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== classroom.schoolId._id.toString()) {
                return { error: 'Unauthorized: Cannot access classroom from another school' };
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

            const classroom = await ClassroomModel.findOne({ _id: classroomId, deletedAt: null });
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== classroom.schoolId.toString()) {
                return { error: 'Unauthorized: Cannot delete classroom from another school' };
            }

            const studentCount = await StudentModel.countDocuments({ classroomId, deletedAt: null });
            if (studentCount > 0) {
                return { error: 'Cannot delete classroom with active students' };
            }

            await ClassroomModel.findByIdAndUpdate(classroomId, { deletedAt: new Date() });

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

            const classroom = await ClassroomModel.findOne({ _id: classroomId });
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== classroom.schoolId.toString()) {
                return { error: 'Unauthorized: Cannot restore classroom from another school' };
            }

            if (!classroom.deletedAt) {
                return { error: 'Classroom is not deleted' };
            }

            const school = await SchoolModel.findOne({ _id: classroom.schoolId, deletedAt: null });
            if (!school) {
                return { error: 'Cannot restore: School is deleted or not found' };
            }

            const restoredClassroom = await ClassroomModel.findByIdAndUpdate(
                classroomId,
                { deletedAt: null },
                { new: true }
            );

            return { classroom: restoredClassroom, message: 'Classroom restored successfully' };
        } catch (err) {
            return { error: 'Failed to restore classroom' };
        }
    }
};
