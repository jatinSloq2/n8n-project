const { Schema } = require('@nestjs/mongoose');
const mongoose = require('mongoose');

@Schema({ timestamps: true })
class Credential {
  name;
  type;
  data;
  userId;
  createdAt;
  updatedAt;
}

const CredentialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['http', 'oauth2', 'apiKey', 'database', 'email'],
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
CredentialSchema.index({ userId: 1 });
CredentialSchema.index({ type: 1 });

module.exports = { Credential, CredentialSchema };