const { Module } = require('@nestjs/common');
const { MongooseModule } = require('@nestjs/mongoose');
const { UsersService } = require('./users.service');
const { UsersController } = require('./users.controller');
const { UserSchema } = require('./user.schema');

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
class UsersModule {}

module.exports = { UsersModule };