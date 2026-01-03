import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Credential, CredentialDocument } from './credential.schema';

@Injectable()
export class CredentialsService {
  constructor(
    @InjectModel(Credential.name)
    private readonly credentialModel: Model<CredentialDocument>,
  ) {}

  async create(createCredentialDto: any, userId: string) {
    const credential = new this.credentialModel({
      ...createCredentialDto,
      userId,
    });
    return credential.save();
  }

  async findAll(userId: string) {
    return this.credentialModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string, userId: string) {
    const credential = await this.credentialModel
      .findOne({ _id: id, userId })
      .exec();

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return credential;
  }

  async update(id: string, updateCredentialDto: any, userId: string) {
    const credential = await this.credentialModel
      .findOneAndUpdate(
        { _id: id, userId },
        updateCredentialDto,
        { new: true },
      )
      .exec();

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return credential;
  }

  async delete(id: string, userId: string) {
    const credential = await this.credentialModel
      .findOneAndDelete({ _id: id, userId })
      .exec();

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    return { message: 'Credential deleted successfully' };
  }
}
