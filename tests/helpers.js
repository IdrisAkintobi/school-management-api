const AdminModel = require('../managers/entities/admin/admin.schema');
const SchoolModel = require('../managers/entities/school/school.schema');
const ClassroomModel = require('../managers/entities/classroom/classroom.schema');
const StudentModel = require('../managers/entities/student/student.schema');

// Mock logger for tests
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    sanitize: obj => obj,
    redactEmail: email => email
};

// Mock config
const mockConfig = {
    dotEnv: {
        LONG_TOKEN_SECRET: 'test-long-token-secret-min-32-chars-here',
        SHORT_TOKEN_SECRET: 'test-short-token-secret-min-32-chars-here',
        LONG_TOKEN_EXPIRES_IN: '7d',
        SHORT_TOKEN_EXPIRES_IN: '24h'
    }
};

// Mock managers
const createMockManagers = () => ({
    token: {
        genLongToken: jest.fn(() => 'mock-long-token'),
        genShortToken: jest.fn(() => 'mock-short-token')
    }
});

// Mock mongoModels
const mockMongoModels = {
    admin: AdminModel,
    school: SchoolModel,
    classroom: ClassroomModel,
    student: StudentModel
};

// Helper to create a superadmin
async function createSuperadmin(data = {}) {
    const admin = new AdminModel({
        email: data.email || 'superadmin@test.com',
        password: data.password || 'Password123!',
        name: data.name || 'Super Admin',
        role: 'superadmin'
    });
    await admin.save();
    return admin;
}

// Helper to create a school admin
async function createSchoolAdmin(schoolId, data = {}) {
    const admin = new AdminModel({
        email: data.email || `admin-${schoolId}@test.com`,
        password: data.password || 'Password123!',
        name: data.name || 'School Admin',
        role: 'school_admin',
        schoolId
    });
    await admin.save();
    return admin;
}

// Helper to create a school
async function createSchool(data = {}) {
    const school = new SchoolModel({
        name: data.name || 'Test School',
        address: data.address || '123 Test St',
        phone: data.phone || '1234567890',
        email: data.email || 'school@test.com',
        principal: data.principal || 'Principal Name',
        establishedYear: data.establishedYear || 2000,
        createdBy: data.createdBy
    });
    await school.save();
    return school;
}

// Helper to create a classroom
async function createClassroom(schoolId, data = {}) {
    const classroom = new ClassroomModel({
        schoolId,
        name: data.name || 'Class A',
        grade: data.grade || '1',
        section: data.section || 'A',
        capacity: data.capacity || 30,
        minAge: data.minAge || 5,
        maxAge: data.maxAge || 7,
        resources: data.resources || []
    });
    await classroom.save();
    return classroom;
}

// Helper to create a student
async function createStudent(schoolId, classroomId, data = {}) {
    const student = new StudentModel({
        schoolId,
        classroomId,
        firstName: data.firstName || 'John',
        lastName: data.lastName || 'Doe',
        dateOfBirth: data.dateOfBirth || new Date('2015-01-01'),
        gender: data.gender || 'male',
        email: data.email,
        phone: data.phone,
        address: data.address || '123 Student St',
        guardianName: data.guardianName || 'Parent Name',
        guardianPhone: data.guardianPhone || '9876543210'
    });
    await student.save();

    // Update classroom enrollment
    await ClassroomModel.findByIdAndUpdate(classroomId, {
        $inc: { currentEnrollment: 1 }
    });

    return student;
}

module.exports = {
    mockLogger,
    mockConfig,
    mockMongoModels,
    createMockManagers,
    createSuperadmin,
    createSchoolAdmin,
    createSchool,
    createClassroom,
    createStudent
};
