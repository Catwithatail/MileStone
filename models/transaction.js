const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const transactionSchema = new Schema({
  transactionId: { 
    type: String, 
    required: true, 
    unique: true,
    default: uuidv4 
  },
  type: { 
    type: String, 
    enum: ['milestone_payment', 'subscription_payment', 'refund', 'other'],
    required: true 
  },
  userId: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  recipientId: { 
    type: String, 
    ref: 'User',
    default: '' 
  },
  jobId: { 
    type: String, 
    ref: 'Job_Listing',
    default: '' 
  },
  milestoneId: { 
    type: String,
    default: '' 
  },
  amount: { 
    type: Number,
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending' 
  },
  paidDate: { 
    type: Date,
    default: null 
  }
}, { 
  timestamps: true 
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;