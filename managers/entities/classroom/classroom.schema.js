const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
    {
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
            min: 1,
            max: 500
        },
        currentEnrollment: {
            type: Number,
            default: 0,
            min: 0
        },
        minAge: {
            type: Number,
            default: 3,
            min: 1,
            max: 85
        },
        maxAge: {
            type: Number,
            default: 25,
            min: 1,
            max: 85
        },
        resources: [
            {
                name: {
                    type: String,
                    required: true,
                    trim: true
                },
                count: {
                    type: Number,
                    required: true,
                    min: 0
                },
                _id: false
            }
        ],
        isActive: {
            type: Boolean,
            default: true
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                delete ret.deletedAt;
                return ret;
            }
        }
    }
);

classroomSchema.index({ schoolId: 1, name: 1, grade: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', classroomSchema);
