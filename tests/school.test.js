const SchoolManager = require('../managers/entities/school/School.manager');
const {
    mockLogger,
    mockConfig,
    mockMongoModels,
    createSuperadmin,
    createSchool,
    createClassroom,
    createStudent
} = require('./helpers');

describe('School Manager', () => {
    let schoolManager;
    let superadmin;

    beforeEach(async () => {
        schoolManager = new SchoolManager({
            cache: {},
            config: mockConfig,
            cortex: {},
            logger: mockLogger,
            mongoModels: mockMongoModels
        });
        
        superadmin = await createSuperadmin();
    });

    describe('create', () => {
        it('should create a school successfully', async () => {
            const result = await schoolManager.create({
                name: 'New School',
                address: '123 Main St',
                phone: '1234567890',
                email: 'school@test.com',
                principal: 'Principal Name',
                establishedYear: 2020,
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.school).toBeDefined();
            expect(result.school.name).toBe('New School');
            expect(result.school.address).toBe('123 Main St');
        });

        it('should fail with duplicate name and address', async () => {
            await createSchool({ name: 'Duplicate School', address: '123 Main St' });

            const result = await schoolManager.create({
                name: 'Duplicate School',
                address: '123 Main St',
                phone: '1234567890',
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBe('School with this name and address already exists');
        });

        it('should allow same name with different address', async () => {
            await createSchool({ name: 'Same Name School', address: '123 Main St' });

            const result = await schoolManager.create({
                name: 'Same Name School',
                address: '456 Other St',
                phone: '1234567890',
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.school).toBeDefined();
        });

        it('should fail with invalid data', async () => {
            const result = await schoolManager.create({
                name: 'A', // Too short
                address: '123 Main St',
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBeDefined();
        });
    });

    describe('update', () => {
        it('should update school successfully', async () => {
            const school = await createSchool({ name: 'Original Name' });

            const result = await schoolManager.update({
                schoolId: school._id.toString(),
                name: 'Updated Name',
                principal: 'New Principal',
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.school.name).toBe('Updated Name');
            expect(result.school.principal).toBe('New Principal');
        });

        it('should fail with invalid school id', async () => {
            const result = await schoolManager.update({
                schoolId: 'invalid-id',
                name: 'Updated Name',
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBe('Invalid school ID');
        });

        it('should fail with non-existent school', async () => {
            const result = await schoolManager.update({
                schoolId: '507f1f77bcf86cd799439011',
                name: 'Updated Name',
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBe('School not found');
        });
    });

    describe('list', () => {
        it('should list all schools', async () => {
            await createSchool({ name: 'School 1', address: 'Address 1' });
            await createSchool({ name: 'School 2', address: 'Address 2' });

            const result = await schoolManager.list({
                page: 1,
                limit: 10,
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.schools).toHaveLength(2);
            expect(result.pagination.total).toBe(2);
        });

        it('should filter by isActive', async () => {
            await createSchool({ name: 'Active School', isActive: true });
            const inactiveSchool = await createSchool({ name: 'Inactive School', isActive: true });
            await inactiveSchool.updateOne({ isActive: false });

            const result = await schoolManager.list({
                page: 1,
                limit: 10,
                isActive: true,
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.schools).toHaveLength(1);
            expect(result.schools[0].name).toBe('Active School');
        });
    });

    describe('delete', () => {
        it('should delete school without classrooms or students', async () => {
            const school = await createSchool();

            const result = await schoolManager.delete({
                schoolId: school._id.toString(),
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toBe('School deleted successfully');
        });

        it('should fail to delete school with active classrooms', async () => {
            const school = await createSchool();
            await createClassroom(school._id);

            const result = await schoolManager.delete({
                schoolId: school._id.toString(),
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBe('Cannot delete school with active classrooms');
        });

        it('should fail to delete school with active students', async () => {
            const school = await createSchool();
            const classroom = await createClassroom(school._id);
            await createStudent(school._id, classroom._id);

            const result = await schoolManager.delete({
                schoolId: school._id.toString(),
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBe('Cannot delete school with active classrooms');
        });
    });

    describe('restore', () => {
        it('should restore deleted school', async () => {
            const school = await createSchool();
            await schoolManager.delete({
                schoolId: school._id.toString(),
                __superadmin: { userId: superadmin._id.toString() }
            });

            const result = await schoolManager.restore({
                schoolId: school._id.toString(),
                __superadmin: { userId: superadmin._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.message).toBe('School restored successfully');
        });

    });
});
