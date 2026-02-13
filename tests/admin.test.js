const AdminManager = require('../managers/entities/admin/Admin.manager');
const AdminModel = require('../managers/entities/admin/admin.schema');
const {
    mockLogger,
    mockConfig,
    mockMongoModels,
    createMockManagers,
    createSuperadmin,
    createSchool
} = require('./helpers');

describe('Admin Manager', () => {
    let adminManager;
    let mockManagers;

    beforeEach(() => {
        mockManagers = createMockManagers();
        adminManager = new AdminManager({
            cache: {},
            config: mockConfig,
            cortex: {},
            managers: mockManagers,
            logger: mockLogger,
            mongoModels: mockMongoModels
        });
    });

    describe('register', () => {
        it('should register a superadmin successfully', async () => {
            const result = await adminManager.register({
                email: 'superadmin@test.com',
                password: 'Password123!',
                name: 'Super Admin',
                role: 'superadmin',
                __superadmin: { role: 'superadmin' }
            });

            expect(result.error).toBeUndefined();
            expect(result.admin).toBeDefined();
            expect(result.admin.email).toBe('superadmin@test.com');
            expect(result.admin.role).toBe('superadmin');
        });

        it('should register a school admin successfully', async () => {
            const school = await createSchool();
            
            const result = await adminManager.register({
                email: 'schooladmin@test.com',
                password: 'Password123!',
                name: 'School Admin',
                role: 'school_admin',
                schoolId: school._id.toString(),
                __superadmin: { role: 'superadmin' }
            });

            expect(result.error).toBeUndefined();
            expect(result.admin).toBeDefined();
            expect(result.admin.role).toBe('school_admin');
            expect(result.admin.schoolId.toString()).toBe(school._id.toString());
        });

        it('should fail with invalid email', async () => {
            const result = await adminManager.register({
                email: 'invalid-email',
                password: 'Password123!',
                name: 'Admin',
                role: 'superadmin',
                __superadmin: { role: 'superadmin' }
            });

            expect(result.error).toBeDefined();
        });

        it('should fail with duplicate email', async () => {
            await createSuperadmin({ email: 'duplicate@test.com' });

            const result = await adminManager.register({
                email: 'duplicate@test.com',
                password: 'Password123!',
                name: 'Admin',
                role: 'superadmin',
                __superadmin: { role: 'superadmin' }
            });

            expect(result.error).toBe('Email already registered');
        });

        it('should fail school_admin registration without schoolId', async () => {
            const result = await adminManager.register({
                email: 'schooladmin@test.com',
                password: 'Password123!',
                name: 'School Admin',
                role: 'school_admin',
                __superadmin: { role: 'superadmin' }
            });

            expect(result.error).toBeDefined();
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const admin = await createSuperadmin({
                email: 'login@test.com',
                password: 'Password123!'
            });

            const result = await adminManager.login({
                email: 'login@test.com',
                password: 'Password123!'
            });

            expect(result.error).toBeUndefined();
            expect(result.admin).toBeDefined();
            expect(result.admin.email).toBe('login@test.com');
            expect(result.longToken).toBe('mock-long-token');
            expect(result.shortToken).toBe('mock-short-token');
        });

        it('should fail with invalid email', async () => {
            const result = await adminManager.login({
                email: 'nonexistent@test.com',
                password: 'Password123!'
            });

            expect(result.error).toBe('Invalid credentials');
        });

        it('should fail with invalid password', async () => {
            await createSuperadmin({
                email: 'login@test.com',
                password: 'Password123!'
            });

            const result = await adminManager.login({
                email: 'login@test.com',
                password: 'WrongPassword!'
            });

            expect(result.error).toBe('Invalid credentials');
        });
    });

    describe('list', () => {
        it('should list all admins', async () => {
            await createSuperadmin({ email: 'admin1@test.com' });
            await createSuperadmin({ email: 'admin2@test.com' });

            const result = await adminManager.list({
                page: 1,
                limit: 10,
                __superadmin: { role: 'superadmin' }
            });

            expect(result.error).toBeUndefined();
            expect(result.admins).toHaveLength(2);
            expect(result.pagination.total).toBe(2);
        });

        it('should paginate results', async () => {
            for (let i = 0; i < 5; i++) {
                await createSuperadmin({ email: `admin${i}@test.com` });
            }

            const result = await adminManager.list({
                page: 1,
                limit: 2,
                __superadmin: { role: 'superadmin' }
            });

            expect(result.admins).toHaveLength(2);
            expect(result.pagination.pages).toBe(3);
        });
    });

    describe('getById', () => {
        it('should get admin by id', async () => {
            const admin = await createSuperadmin({ email: 'get@test.com' });

            const result = await adminManager.getById({
                adminId: admin._id.toString(),
                __auth: { role: 'superadmin', userId: admin._id.toString() }
            });

            expect(result.error).toBeUndefined();
            expect(result.admin.email).toBe('get@test.com');
        });

        it('should fail with invalid id', async () => {
            const result = await adminManager.getById({
                adminId: 'invalid-id',
                __auth: { role: 'superadmin', userId: 'some-id' }
            });

            expect(result.error).toBe('Invalid admin ID');
        });

        it('should fail when non-superadmin tries to access another admin', async () => {
            const admin1 = await createSuperadmin({ email: 'admin1@test.com' });
            const admin2 = await createSuperadmin({ email: 'admin2@test.com' });

            const result = await adminManager.getById({
                adminId: admin2._id.toString(),
                __auth: { role: 'school_admin', userId: admin1._id.toString() }
            });

            expect(result.error).toBe('Unauthorized access');
        });
    });
});
