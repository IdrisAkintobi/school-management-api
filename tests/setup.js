const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Create in-memory MongoDB instance before all tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
});

// Clear all collections after each test
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Close database connection and stop MongoDB instance after all tests
afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// Increase timeout for database operations
jest.setTimeout(30000);
