const StudentModel = require('./student.schema');
const ClassroomModel = require('../classroom/classroom.schema');
const SchoolModel = require('../school/school.schema');
const validators = require('./student.validators');
const mongoose = require('mongoose');

module.exports = class Student {
    constructor({ utils, cache, config, cortex, managers } = {}) {
            this.config = config;
            this.cortex = cortex;
            this.cache = cache;
            this.validators = validators;

            this.httpExposed = [
                'post=enroll',
                'patch=update',
                'post=transfer',
                'patch=restore',
                'get=list',
                'get=getById',
                'delete=delete'
            ];
        }

    async enroll({ schoolId, classroomId, firstName, lastName, dateOfBirth, gender, email, phone, address, guardianName, guardianPhone, __schoolAdmin }) {
        try {
            const { error } = this.validators.enroll.validate({
                schoolId, classroomId, firstName, lastName, dateOfBirth, gender, email, phone, address, guardianName, guardianPhone
            });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(classroomId)) {
                return { error: 'Invalid school or classroom ID' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== schoolId) {
                return { error: 'Unauthorized: Cannot enroll student in another school' };
            }

            const school = await SchoolModel.findOne({ _id: schoolId, deletedAt: null });
            if (!school) {
                return { error: 'School not found or inactive' };
            }

            const classroom = await ClassroomModel.findOne({ _id: classroomId, schoolId, deletedAt: null });
            if (!classroom) {
                return { error: 'Classroom not found or inactive' };
            }

            if (classroom.currentEnrollment >= classroom.capacity) {
                return { error: 'Classroom is at full capacity' };
            }

            if (email) {
                const existingStudent = await StudentModel.findOne({ email });
                if (existingStudent) {
                    return { error: 'Email already registered' };
                }
            }

            const age = Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 3 || age > 25) {
                return { error: 'Invalid age for student enrollment' };
            }

            const student = new StudentModel({
                schoolId,
                classroomId,
                firstName,
                lastName,
                dateOfBirth,
                gender,
                email,
                phone,
                address,
                guardianName,
                guardianPhone
            });

            await student.save();
            await ClassroomModel.findByIdAndUpdate(classroomId, { $inc: { currentEnrollment: 1 } });

            return { student };
        } catch (err) {
            return { error: 'Failed to enroll student' };
        }
    }

    async update({ studentId, firstName, lastName, dateOfBirth, gender, email, phone, address, guardianName, guardianPhone, isActive, __schoolAdmin }) {
        try {
            const { error } = this.validators.update.validate({
                studentId, firstName, lastName, dateOfBirth, gender, email, phone, address, guardianName, guardianPhone, isActive
            });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { error: 'Invalid student ID' };
            }

            const student = await StudentModel.findOne({ _id: studentId, deletedAt: null });
            if (!student) {
                return { error: 'Student not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId.toString()) {
                return { error: 'Unauthorized: Cannot update student from another school' };
            }

            if (email && email !== student.email) {
                const existingStudent = await StudentModel.findOne({ email });
                if (existingStudent) {
                    return { error: 'Email already registered' };
                }
            }

            if (dateOfBirth) {
                const age = Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
                if (age < 3 || age > 25) {
                    return { error: 'Invalid age for student' };
                }
            }

            const updateData = {};
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
            if (gender !== undefined) updateData.gender = gender;
            if (email !== undefined) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (address !== undefined) updateData.address = address;
            if (guardianName !== undefined) updateData.guardianName = guardianName;
            if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;
            if (isActive !== undefined) updateData.isActive = isActive;

            const updatedStudent = await StudentModel.findByIdAndUpdate(
                studentId,
                updateData,
                { new: true, runValidators: true }
            );

            return { student: updatedStudent };
        } catch (err) {
            return { error: 'Failed to update student' };
        }
    }

    async transfer({ studentId, toSchoolId, toClassroomId, reason, __schoolAdmin }) {
        try {
            const { error } = this.validators.transfer.validate({ studentId, toSchoolId, toClassroomId, reason });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(toSchoolId) || !mongoose.Types.ObjectId.isValid(toClassroomId)) {
                return { error: 'Invalid student, school, or classroom ID' };
            }

            const student = await StudentModel.findOne({ _id: studentId, deletedAt: null });
            if (!student) {
                return { error: 'Student not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId.toString()) {
                return { error: 'Unauthorized: Cannot transfer student from another school' };
            }

            if (student.schoolId.toString() === toSchoolId && student.classroomId.toString() === toClassroomId) {
                return { error: 'Student is already in this classroom' };
            }

            const toSchool = await SchoolModel.findOne({ _id: toSchoolId, deletedAt: null });
            if (!toSchool) {
                return { error: 'Target school not found or inactive' };
            }

            const toClassroom = await ClassroomModel.findOne({ _id: toClassroomId, schoolId: toSchoolId, deletedAt: null });
            if (!toClassroom) {
                return { error: 'Target classroom not found or inactive' };
            }

            if (toClassroom.currentEnrollment >= toClassroom.capacity) {
                return { error: 'Target classroom is at full capacity' };
            }

            const fromSchoolId = student.schoolId;
            const fromClassroomId = student.classroomId;

            student.transferHistory.push({
                fromSchoolId,
                toSchoolId,
                date: new Date(),
                reason
            });

            student.schoolId = toSchoolId;
            student.classroomId = toClassroomId;

            await student.save();
            await ClassroomModel.findByIdAndUpdate(fromClassroomId, { $inc: { currentEnrollment: -1 } });
            await ClassroomModel.findByIdAndUpdate(toClassroomId, { $inc: { currentEnrollment: 1 } });

            return { student, message: 'Student transferred successfully' };
        } catch (err) {
            return { error: 'Failed to transfer student' };
        }
    }

    async list({ schoolId, classroomId, page = 1, limit = 10, isActive, __schoolAdmin }) {
        try {
            const { error } = this.validators.list.validate({ schoolId, classroomId, page, limit, isActive });
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

            if (classroomId) {
                if (!mongoose.Types.ObjectId.isValid(classroomId)) {
                    return { error: 'Invalid classroom ID' };
                }
                query.classroomId = classroomId;
            }

            if (__schoolAdmin.role === 'school_admin') {
                query.schoolId = __schoolAdmin.schoolId;
            }

            if (isActive !== undefined) query.isActive = isActive;
            query.deletedAt = null;

            const skip = (page - 1) * limit;
            const students = await StudentModel.find(query)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name grade section')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await StudentModel.countDocuments(query);

            return {
                students,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            return { error: 'Failed to fetch students' };
        }
    }

    async getById({ studentId, __schoolAdmin }) {
        try {
            const { error } = this.validators.getById.validate({ studentId });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { error: 'Invalid student ID' };
            }

            const student = await StudentModel.findOne({ _id: studentId, deletedAt: null })
                .populate('schoolId', 'name')
                .populate('classroomId', 'name grade section');

            if (!student) {
                return { error: 'Student not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId._id.toString()) {
                return { error: 'Unauthorized: Cannot access student from another school' };
            }

            return { student };
        } catch (err) {
            return { error: 'Failed to fetch student' };
        }
    }

    async delete({ studentId, __schoolAdmin }) {
        try {
            const { error } = this.validators.delete.validate({ studentId });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { error: 'Invalid student ID' };
            }

            const student = await StudentModel.findOne({ _id: studentId, deletedAt: null });
            if (!student) {
                return { error: 'Student not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId.toString()) {
                return { error: 'Unauthorized: Cannot delete student from another school' };
            }

            await StudentModel.findByIdAndUpdate(studentId, { deletedAt: new Date() });
            await ClassroomModel.findByIdAndUpdate(student.classroomId, { $inc: { currentEnrollment: -1 } });

            return { message: 'Student deleted successfully' };
        } catch (err) {
            return { error: 'Failed to delete student' };
        }
    }

    async restore({ studentId, __schoolAdmin }) {
        try {
            if (!studentId) {
                return { error: 'Student ID is required' };
            }

            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { error: 'Invalid student ID' };
            }

            const student = await StudentModel.findOne({ _id: studentId });
            if (!student) {
                return { error: 'Student not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId.toString()) {
                return { error: 'Unauthorized: Cannot restore student from another school' };
            }

            if (!student.deletedAt) {
                return { error: 'Student is not deleted' };
            }

            const school = await SchoolModel.findOne({ _id: student.schoolId, deletedAt: null });
            if (!school) {
                return { error: 'Cannot restore: School is deleted or not found' };
            }

            const classroom = await ClassroomModel.findOne({ _id: student.classroomId, deletedAt: null });
            if (!classroom) {
                return { error: 'Cannot restore: Classroom is deleted or not found' };
            }

            if (classroom.currentEnrollment >= classroom.capacity) {
                return { error: 'Cannot restore: Classroom is at full capacity' };
            }

            const restoredStudent = await StudentModel.findByIdAndUpdate(
                studentId,
                { deletedAt: null },
                { new: true }
            );

            await ClassroomModel.findByIdAndUpdate(student.classroomId, { $inc: { currentEnrollment: 1 } });

            return { student: restoredStudent, message: 'Student restored successfully' };
        } catch (err) {
            return { error: 'Failed to restore student' };
        }
    }
};
