const { Injectable } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');

@Injectable()
class LocalAuthGuard extends AuthGuard('local') {}

module.exports = { LocalAuthGuard };