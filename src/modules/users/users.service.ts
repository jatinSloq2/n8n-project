import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { User, UserDocument } from "./user.schema";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>
  ) {}

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    return this.userModel.find().select("-password").lean().exec();
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id)
      .select("-password")
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Update user by ID
   */
  async update(id: string, updateUserDto: Partial<User>): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, {
        new: true,
        runValidators: true,
      })
      .select("-password")
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<{ message: string }> {
    const result = await this.userModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException("User not found");
    }

    return { message: "User deleted successfully" };
  }

  /**
   * Create a new user
   */
  async create(userDto: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }): Promise<User> {
    const user = new this.userModel(userDto);
    return user.save();
  }

  /**
   * Find a user by email (without password)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).lean().exec();
  }

  /**
   * Find a user by email (with password) – for AuthService
   */
  async findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email }).select("+password").exec();
  }
}
