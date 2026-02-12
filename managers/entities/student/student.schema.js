const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true,
        index: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        index: true
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    guardianName: {
        type: String,
        required: true,
        trim: true
    },
    guardianPhone: {
        type: String,
        required: true,
        trim: true
    },
    enrollmentDate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    transferHistory: [{
        fromSchoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School'
        },
        toSchoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School'
        },
        date: {
            type: Date,
            default: Date.now
        },
        reason: String,
        _id: false
    }]
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.deletedAt;
            return ret;
        }
    }
});

module.exports = mongoose.model('Student', studentSchema);
