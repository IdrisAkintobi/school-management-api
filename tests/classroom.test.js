const ClassroomManager = require('../managers/entities/classroom/Classroom.manager');
const {
    mockLogger,
    mockConfig,
    mockMongoModels,
    createSuperadmin,
    createSchoolAdmin,
    createSchool,
    createClassroom,
    createStudent
} = require('./helpers');

describe('Classroom Manager', () => {
    let classroomManager;
    let superadmin;
    let school;

    beforeEach(async () => {
        classroomManager = new ClassroomManager({
            cache: {},
            config: mockConfig,
            cortex: {},
            logger: mockLogger,
            mongoModels: mockMongoModels
        });
        
        superadmin = await createSuperadmin();
        school = await createSchool({ createdBy: superadmin._id });
    });

    describe('create', () => {
        it('should create a classroom successfully', async () => {
            const result = await classroomManager.create({
                schoolId: school._id.toString(),
                name: 'Class A',
                grade: '1',
                section: 'A',
                capacity: 30,
                minAge: 5,
                maxAge: 7,
                resources: [
                    { name: 'whiteboard', count: 2 },
                    { name: 'chair', count: 30 }
                ],
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom).toBeDefined();
            expect(result.classroom.name).toBe('Class A');
            expect(result.classroom.resources).toHaveLength(2);
            expect(result.classroom.resources[0].name).toBe('whiteboard');
        });

        it('should fail with duplicate classroom', async () => {
            await createClassroom(school._id, {
                name: 'Class A',
                grade: '1',
                section: 'A'
            });

            const result = await classroomManager.create({
                schoolId: school._id.toString(),
                name: 'Class A',
                grade: '1',
                section: 'A',
                capacity: 30,
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBe('Classroom with this name, grade, and section already exists in this school');
        });

        it('should fail when minAge > maxAge', async () => {
            const result = await classroomManager.create({
                schoolId: school._id.toString(),
                name: 'Class A',
                capacity: 30,
                minAge: 10,
                maxAge: 5,
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeDefined();
        });

        it('should fail when school admin creates classroom for another school', async () => {
            const otherSchool = await createSchool({ name: 'Other School', address: 'Other Address' });
            const schoolAdmin = await createSchoolAdmin(school._id);

            const result = await classroomManager.create({
                schoolId: otherSchool._id.toString(),
                name: 'Class A',
                capacity: 30,
                __schoolAdmin: { role: 'school_admin', schoolId: school._id.toString() }
            });

            expect(result.error).toBe('Unauthorized: Cannot create classroom for another school');
        });
    });

    describe('update', () => {
        it('should update classroom successfully', async () => {
            const classroom = await createClassroom(school._id, { name: 'Original Name' });

            const result = await classroomManager.update({
                classroomId: classroom._id.toString(),
                name: 'Updated Name',
                capacity: 35,
                resources: [{ name: 'desk', count: 20 }],
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.classroom.name).toBe('Updated Name');
            expect(result.classroom.capacity).toBe(35);
            expect(result.classroom.resources[0].name).toBe('desk');
        });

        it('should fail to reduce capacity below current enrollment', async () => {
            const classroom = await createClassroom(school._id, { capacity: 30 });
            await createStudent(school._id, classroom._id);
            await createStudent(school._id, classroom._id, { email: 'student2@test.com' });

            const result = await classroomManager.update({
                classroomId: classroom._id.toString(),
                capacity: 1,
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBe('Cannot reduce capacity below current enrollment (2)');
        });
    });

    describe('list', () => {
        it('should list classrooms for a school', async () => {
            await createClassroom(school._id, { name: 'Class A', section: 'A' });
            await createClassroom(school._id, { name: 'Class B', section: 'B' });

            const result = await classroomManager.list({
                schoolId: school._id.toString(),
                page: 1,
                limit: 10,
                __schoolAdmin: { role: 'superadmin' }
            });

            expect(result.error).toBeUndefined();
            expect(result.classrooms).toHaveLength(2);
        });

        it('should filter by school for school admin', async () => {
            const otherSchool = await createSchool({ name: 'Other School', address: 'Other Address' });
            await createClassroom(school._id);
            await createClassroom(otherSchool._id);

            const result = await classroomManager.list({
                page: 1,
                limit: 10,
                __schoolAdmin: { role: 'school_admin', schoolId: school._id.toString() }
            });

            expect(result.classrooms).toHaveLength(1);
        });
    });

    describe('delete', () => {
        it('should delete classroom without students', async () => {
            const classroom = await createClassroom(school._id);

            const result = await classroomManager.delete({
                classroomId: classroom._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toBe('Classroom deleted successfully');
        });

        it('should fail to delete classroom with active students', async () => {
            const classroom = await createClassroom(school._id);
            await createStudent(school._id, classroom._id);

            const result = await classroomManager.delete({
                classroomId: classroom._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBe('Cannot delete classroom with active students');
        });
    });

    describe('restore', () => {
        it('should restore deleted classroom', async () => {
            const classroom = await createClassroom(school._id);
            await classroomManager.delete({
                classroomId: classroom._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            const result = await classroomManager.restore({
                classroomId: classroom._id.toString(),
                __schoolAdmin: { role: 'superadmin', schoolId: school._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toBe('Classroom restored successfully');
        });
    });
});
