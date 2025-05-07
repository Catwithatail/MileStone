const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const skillSchema = new Schema({
  skillId: {
    type: String,
    required: true,
    unique: true,
    default: uuidv4,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  questions: [{
    questionId: {
      type: String,
      required: true,
      default: uuidv4,
    },
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    options: [{
      type: String,
      required: true,
    }],
    correctAnswer: {
      type: String,
      required: true,
    },
    marks: {
      type: Number,
      required: true,
      min: 1,
    },
  }],
}, {
  timestamps: true,
});

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;