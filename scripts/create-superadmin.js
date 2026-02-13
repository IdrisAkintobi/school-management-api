require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = query => new Promise(resolve => rl.question(query, resolve));

async function createSuperadmin() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/school-management';

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB');

        const AdminModel = mongoose.model(
            'Admin',
            new mongoose.Schema({
                email: String,
                password: String,
                role: String,
                name: String,
                isActive: Boolean,
                schoolId: mongoose.Schema.Types.ObjectId
            })
        );

        const email = await question('Enter superadmin email: ');
        const password = await question('Enter superadmin password: ');
        const name = await question('Enter superadmin name: ');

        const existingAdmin = await AdminModel.findOne({ email });
        if (existingAdmin) {
            console.log('Error: Email already exists');
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new AdminModel({
            email,
            password: hashedPassword,
            role: 'superadmin',
            name,
            isActive: true,
            schoolId: null
        });

        await admin.save();

        console.log('\nSuperadmin created successfully!');
        console.log('Email:', email);
        console.log('You can now login with these credentials');

        rl.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        rl.close();
        process.exit(1);
    }
}

createSuperadmin();
