const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    grade: {
        type: String,
        trim: true
    },
    section: {
        type: String,
        trim: true
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    currentEnrollment: {
        type: Number,
        default: 0,
        min: 0
    },
    resources: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

classroomSchema.index({ schoolId: 1, name: 1 });

module.exports = mongoose.model('Classroom', classroomSchema);
