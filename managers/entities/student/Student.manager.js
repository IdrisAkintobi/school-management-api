const validators = require('./student.validators');
const mongoose = require('mongoose');

module.exports = class Student {
    constructor({ utils, cache, config, cortex, managers, logger, mongoModels } = {}) {
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
                'post=enroll',
                'patch=update',
                'post=transfer',
                'patch=restore',
                'get=list',
                'get=getById',
                'delete=delete'
            ];
        }

    async enroll({ schoolId, classroomId, students, __schoolAdmin }) {
        try {
            const { error } = this.validators.enroll.validate({
                schoolId, classroomId, students
            });
            if (error) return { error: error.details[0].message };

            if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(classroomId)) {
                return { error: 'Invalid school or classroom ID' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== schoolId) {
                return { error: 'Unauthorized: Cannot enroll student in another school' };
            }

            const school = await this.SchoolModel.findOne({ _id: schoolId, deletedAt: null });
            if (!school) {
                return { error: 'School not found or inactive', code: 404 };
            }

            const classroom = await this.ClassroomModel.findOne({ _id: classroomId, schoolId, deletedAt: null });
            if (!classroom) {
                return { error: 'Classroom not found or inactive', code: 404 };
            }

            const availableCapacity = classroom.capacity - classroom.currentEnrollment;
            if (availableCapacity < students.length) {
                return { error: `Classroom has only ${availableCapacity} available slots, but ${students.length} students provided` };
            }

            const enrolledStudents = [];
            const errors = [];

            for (let i = 0; i < students.length; i++) {
                const studentData = students[i];
                
                if (studentData.email) {
                    const existingStudent = await this.StudentModel.findOne({ email: studentData.email });
                    if (existingStudent) {
                        errors.push({ index: i, email: studentData.email, error: 'Email already registered' });
                        continue;
                    }
                }

                const age = Math.floor((Date.now() - new Date(studentData.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
                if (age < classroom.minAge || age > classroom.maxAge) {
                    errors.push({ index: i, error: `Student age must be between ${classroom.minAge} and ${classroom.maxAge} years for this classroom` });
                    continue;
                }

                const student = new this.StudentModel({
                    schoolId,
                    classroomId,
                    firstName: studentData.firstName,
                    lastName: studentData.lastName,
                    dateOfBirth: studentData.dateOfBirth,
                    gender: studentData.gender,
                    email: studentData.email,
                    phone: studentData.phone,
                    address: studentData.address,
                    guardianName: studentData.guardianName,
                    guardianPhone: studentData.guardianPhone
                });

                await student.save();
                enrolledStudents.push(student);
            }

            if (enrolledStudents.length > 0) {
                await this.ClassroomModel.findByIdAndUpdate(classroomId, { $inc: { currentEnrollment: enrolledStudents.length } });
            }

            this.logger.info({ 
                classroomId, 
                schoolId, 
                enrolled: enrolledStudents.length, 
                failed: errors.length 
            }, 'Student enrollment completed');

            return { 
                students: enrolledStudents,
                enrolled: enrolledStudents.length,
                failed: errors.length,
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (err) {
            this.logger.error({ error: err.message, schoolId, classroomId }, 'Failed to enroll students');
            return { error: 'Failed to enroll students' };
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

            const student = await this.StudentModel.findOne({ _id: studentId, deletedAt: null });
            if (!student) {
                return { error: 'Student not found', code: 404 };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId.toString()) {
                return { error: 'Student not found', code: 404 };
            }

            if (email && email !== student.email) {
                const existingStudent = await this.StudentModel.findOne({ email });
                if (existingStudent) {
                    return { error: 'Email already registered' };
                }
            }

            if (dateOfBirth) {
                const classroom = await this.ClassroomModel.findOne({ _id: student.classroomId, deletedAt: null });
                if (classroom) {
                    const age = Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
                    if (age < classroom.minAge || age > classroom.maxAge) {
                        return { error: `Student age must be between ${classroom.minAge} and ${classroom.maxAge} years for this classroom` };
                    }
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

            const updatedStudent = await this.StudentModel.findByIdAndUpdate(
                studentId,
                updateData,
                { new: true, runValidators: true }
            );
            this.logger.info({ studentId, updates: Object.keys(updateData) }, 'Student updated successfully');

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

            const student = await this.StudentModel.findOne({ _id: studentId, deletedAt: null });
            if (!student) {
                return { error: 'Student not found' };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId.toString()) {
                return { error: 'Student not found', code: 404 };
            }

            if (student.schoolId.toString() === toSchoolId && student.classroomId.toString() === toClassroomId) {
                return { error: 'Student is already in this classroom' };
            }

            const toSchool = await this.SchoolModel.findOne({ _id: toSchoolId, deletedAt: null });
            if (!toSchool) {
                return { error: 'Target school not found or inactive', code: 404 };
            }

            const toClassroom = await this.ClassroomModel.findOne({ _id: toClassroomId, schoolId: toSchoolId, deletedAt: null });
            if (!toClassroom) {
                return { error: 'Target classroom not found or inactive', code: 404 };
            }

            if (toClassroom.currentEnrollment >= toClassroom.capacity) {
                return { error: 'Target classroom is at full capacity' };
            }

            const studentAge = Math.floor((Date.now() - new Date(student.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
            if (studentAge < toClassroom.minAge || studentAge > toClassroom.maxAge) {
                return { error: `Student age must be between ${toClassroom.minAge} and ${toClassroom.maxAge} years for target classroom` };
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
            await this.ClassroomModel.findByIdAndUpdate(fromClassroomId, { $inc: { currentEnrollment: -1 } });
            await this.ClassroomModel.findByIdAndUpdate(toClassroomId, { $inc: { currentEnrollment: 1 } });

            this.logger.info({ 
                studentId, 
                fromSchoolId: fromSchoolId.toString(), 
                toSchoolId, 
                fromClassroomId: fromClassroomId.toString(), 
                toClassroomId 
            }, 'Student transferred successfully');

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
            const students = await this.StudentModel.find(query)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name grade section')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await this.StudentModel.countDocuments(query);

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

            const student = await this.StudentModel.findOne({ _id: studentId, deletedAt: null })
                .populate('schoolId', 'name')
                .populate('classroomId', 'name grade section');

            if (!student) {
                return { error: 'Student not found', code: 404 };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId._id.toString()) {
                return { error: 'Student not found', code: 404 };
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

            const student = await this.StudentModel.findOne({ _id: studentId, deletedAt: null });
            if (!student) {
                return { error: 'Student not found', code: 404 };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId.toString()) {
                return { error: 'Student not found', code: 404 };
            }

            await this.StudentModel.findByIdAndUpdate(studentId, { deletedAt: new Date() });
            await this.ClassroomModel.findByIdAndUpdate(student.classroomId, { $inc: { currentEnrollment: -1 } });

            this.logger.info({ studentId, classroomId: student.classroomId }, 'Student deleted successfully');

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

            const student = await this.StudentModel.findOne({ _id: studentId });
            if (!student) {
                return { error: 'Student not found', code: 404 };
            }

            if (__schoolAdmin.role === 'school_admin' && __schoolAdmin.schoolId !== student.schoolId.toString()) {
                return { error: 'Student not found', code: 404 };
            }

            if (!student.deletedAt) {
                return { error: 'Student is not deleted' };
            }

            const school = await this.SchoolModel.findOne({ _id: student.schoolId, deletedAt: null });
            if (!school) {
                return { error: 'Cannot restore: School is deleted or not found', code: 404 };
            }

            const classroom = await this.ClassroomModel.findOne({ _id: student.classroomId, deletedAt: null });
            if (!classroom) {
                return { error: 'Cannot restore: Classroom is deleted or not found', code: 404 };
            }

            if (classroom.currentEnrollment >= classroom.capacity) {
                return { error: 'Cannot restore: Classroom is at full capacity' };
            }

            const restoredStudent = await this.StudentModel.findByIdAndUpdate(
                studentId,
                { deletedAt: null },
                { new: true }
            );

            await this.ClassroomModel.findByIdAndUpdate(student.classroomId, { $inc: { currentEnrollment: 1 } });

            this.logger.info({ studentId, classroomId: student.classroomId }, 'Student restored successfully');

            return { student: restoredStudent, message: 'Student restored successfully' };
        } catch (err) {
            return { error: 'Failed to restore student' };
        }
    }
};
