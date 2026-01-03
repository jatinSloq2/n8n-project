const { Injectable } = require('@nestjs/common');

@Injectable()
class ConfigService {
  get(key) {
    return process.env[key];
  }

  getNumber(key, defaultValue = 0) {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  }

  getBoolean(key, defaultValue = false) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  isProduction() {
    return process.env.NODE_ENV === 'production';
  }
}

module.exports = { ConfigService };