import config from './jest.config.js';
const {testPathIgnorePatterns, ...rest} = config;
export default {
  ...rest,
  setupFiles: ['<rootDir>/tests/autoMode.js'],
};
