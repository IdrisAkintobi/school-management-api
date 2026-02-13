const StudentManager = require('../managers/entities/student/Student.manager');
const {
    mockLogger,
    mockConfig,
    mockMongoModels,
    createSuperadmin,
    createSchool,
    createClassroom,
    createStudent
} = require('./helpers');

describe('Student Manager', () => {
    let studentManager;
    let superadmin;
    let school;
    let classroom;

    beforeEach(async () => {
        studentManager = new StudentManager({
            cache: {},
            config: mockConfig,
            cortex: {},
            logger: mockLogger,
            mongoModels: mockMongoModels
        });

        superadmin = await createSuperadmin();
        school = await createSchool({ createdBy: superadmin._id });
        classroom = await createClassroom(school._id, {
            capacity: 30,
            minAge: 5,
            maxAge: 7
        });
    });

    describe('enroll', () => {
        it('should enroll a single student successfully', async () => {
            const result = await studentManager.enroll({
                schoolId: school._id.toString(),
                classroomId: classroom._id.toString(),
                students: [
                    {
                        firstName: 'John',
                        lastName: 'Doe',
                        dateOfBirth: new Date('2020-06-01'),
                        gender: 'male',
                        address: '123 Student St',
                        guardianName: 'Parent Name',
                        guardianPhone: '9876543210'
                    }
                ],
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.enrolled).toBe(1);
            expect(result.failed).toBe(0);
            expect(result.students).toHaveLength(1);
        });

        it('should enroll multiple students successfully', async () => {
            const students = [
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: new Date('2020-06-01'),
                    gender: 'male',
                    address: '123 St',
                    guardianName: 'Parent 1',
                    guardianPhone: '1111111111'
                },
                {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    dateOfBirth: new Date('2021-01-15'),
                    gender: 'female',
                    address: '456 St',
                    guardianName: 'Parent 2',
                    guardianPhone: '2222222222'
                }
            ];

            const result = await studentManager.enroll({
                schoolId: school._id.toString(),
                classroomId: classroom._id.toString(),
                students,
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.enrolled).toBe(2);
            expect(result.failed).toBe(0);
        });

        it('should fail when classroom is at capacity', async () => {
            const smallClassroom = await createClassroom(school._id, {
                name: 'Small Class',
                section: 'B',
                capacity: 1
            });

            const students = [
                {
                    firstName: 'Student1',
                    lastName: 'Test',
                    dateOfBirth: new Date('2018-01-01'),
                    gender: 'male',
                    address: '123 St',
                    guardianName: 'Parent',
                    guardianPhone: '1111111111'
                },
                {
                    firstName: 'Student2',
                    lastName: 'Test',
                    dateOfBirth: new Date('2018-01-01'),
                    gender: 'female',
                    address: '456 St',
                    guardianName: 'Parent',
                    guardianPhone: '2222222222'
                }
            ];

            const result = await studentManager.enroll({
                schoolId: school._id.toString(),
                classroomId: smallClassroom._id.toString(),
                students,
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toContain('available slots');
        });

        it('should fail when student age is below minAge', async () => {
            const result = await studentManager.enroll({
                schoolId: school._id.toString(),
                classroomId: classroom._id.toString(),
                students: [
                    {
                        firstName: 'Too Young',
                        lastName: 'Student',
                        dateOfBirth: new Date('2022-01-01'), // Too young
                        gender: 'male',
                        address: '123 St',
                        guardianName: 'Parent',
                        guardianPhone: '1111111111'
                    }
                ],
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.enrolled).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.errors[0].error).toContain('age must be between');
        });

        it('should fail when student age is above maxAge', async () => {
            const result = await studentManager.enroll({
                schoolId: school._id.toString(),
                classroomId: classroom._id.toString(),
                students: [
                    {
                        firstName: 'Too Old',
                        lastName: 'Student',
                        dateOfBirth: new Date('2010-01-01'), // Too old
                        gender: 'male',
                        address: '123 St',
                        guardianName: 'Parent',
                        guardianPhone: '1111111111'
                    }
                ],
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.enrolled).toBe(0);
            expect(result.failed).toBe(1);
        });

        it('should handle partial enrollment with some failures', async () => {
            const students = [
                {
                    firstName: 'Valid',
                    lastName: 'Student',
                    dateOfBirth: new Date('2020-06-01'),
                    gender: 'male',
                    email: 'valid@test.com',
                    address: '123 St',
                    guardianName: 'Parent',
                    guardianPhone: '1111111111'
                },
                {
                    firstName: 'Invalid',
                    lastName: 'Student',
                    dateOfBirth: new Date('2010-01-01'), // Too old
                    gender: 'female',
                    email: 'invalid@test.com',
                    address: '456 St',
                    guardianName: 'Parent',
                    guardianPhone: '2222222222'
                }
            ];

            const result = await studentManager.enroll({
                schoolId: school._id.toString(),
                classroomId: classroom._id.toString(),
                students,
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.enrolled).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.errors).toHaveLength(1);
        });
    });

    describe('update', () => {
        it('should update student successfully', async () => {
            const student = await createStudent(school._id, classroom._id);

            const result = await studentManager.update({
                studentId: student._id.toString(),
                firstName: 'Updated',
                lastName: 'Name',
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.student.firstName).toBe('Updated');
            expect(result.student.lastName).toBe('Name');
        });

        it('should fail when updating age outside classroom range', async () => {
            const student = await createStudent(school._id, classroom._id);

            const result = await studentManager.update({
                studentId: student._id.toString(),
                dateOfBirth: new Date('2010-01-01'), // Too old
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toContain('age must be between');
        });
    });

    describe('transfer', () => {
        it('should transfer student to another classroom', async () => {
            const student = await createStudent(school._id, classroom._id, {
                dateOfBirth: new Date('2020-06-01')
            });
            const newClassroom = await createClassroom(school._id, {
                name: 'Class B',
                section: 'B',
                capacity: 30,
                minAge: 5,
                maxAge: 7
            });

            const result = await studentManager.transfer({
                studentId: student._id.toString(),
                toSchoolId: school._id.toString(),
                toClassroomId: newClassroom._id.toString(),
                reason: 'Better fit',
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.student.classroomId.toString()).toBe(newClassroom._id.toString());
            expect(result.student.transferHistory).toHaveLength(1);
        });

        it('should fail when target classroom is at capacity', async () => {
            const student = await createStudent(school._id, classroom._id);
            const fullClassroom = await createClassroom(school._id, {
                name: 'Full Class',
                section: 'C',
                capacity: 1
            });
            await createStudent(school._id, fullClassroom._id, { email: 'other@test.com' });

            const result = await studentManager.transfer({
                studentId: student._id.toString(),
                toSchoolId: school._id.toString(),
                toClassroomId: fullClassroom._id.toString(),
                reason: 'Transfer',
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBe('Target classroom is at full capacity');
        });

        it('should fail when student age does not fit target classroom', async () => {
            const student = await createStudent(school._id, classroom._id, {
                dateOfBirth: new Date('2018-01-01') // 6 years old
            });
            const olderClassroom = await createClassroom(school._id, {
                name: 'Older Class',
                section: 'D',
                capacity: 30,
                minAge: 10,
                maxAge: 12
            });

            const result = await studentManager.transfer({
                studentId: student._id.toString(),
                toSchoolId: school._id.toString(),
                toClassroomId: olderClassroom._id.toString(),
                reason: 'Transfer',
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toContain('age must be between');
        });
    });

    describe('delete and restore', () => {
        it('should delete student successfully', async () => {
            const student = await createStudent(school._id, classroom._id);

            const result = await studentManager.delete({
                studentId: student._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toBe('Student deleted successfully');
        });

        it('should restore deleted student', async () => {
            const student = await createStudent(school._id, classroom._id);
            await studentManager.delete({
                studentId: student._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            const result = await studentManager.restore({
                studentId: student._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toBe('Student restored successfully');
        });

        it('should fail to restore when classroom is at capacity', async () => {
            const smallClassroom = await createClassroom(school._id, {
                name: 'Small',
                section: 'E',
                capacity: 1
            });
            const student = await createStudent(school._id, smallClassroom._id);
            await studentManager.delete({
                studentId: student._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            // Fill the classroom
            await createStudent(school._id, smallClassroom._id, { email: 'other@test.com' });

            const result = await studentManager.restore({
                studentId: student._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBe('Cannot restore: Classroom is at full capacity');
        });
    });

    describe('list', () => {
        it('should list students with pagination', async () => {
            await createStudent(school._id, classroom._id, { email: 'student1@test.com' });
            await createStudent(school._id, classroom._id, { email: 'student2@test.com' });

            const result = await studentManager.list({
                schoolId: school._id.toString(),
                page: 1,
                limit: 10,
                __schoolAdmin: { role: 'superadmin' }
            });

            expect(result.error).toBeUndefined();
            expect(result.students).toHaveLength(2);
        });

        it('should filter by classroom', async () => {
            const classroom2 = await createClassroom(school._id, { name: 'Class B', section: 'B' });
            await createStudent(school._id, classroom._id, { email: 'student1@test.com' });
            await createStudent(school._id, classroom2._id, { email: 'student2@test.com' });

            const result = await studentManager.list({
                classroomId: classroom._id.toString(),
                page: 1,
                limit: 10,
                __schoolAdmin: { role: 'superadmin' }
            });

            expect(result.students).toHaveLength(1);
        });
    });
});
