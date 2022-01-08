import config from './jest.config.js';
const {testPathIgnorePatterns, ...rest} = config;
export default {
  ...rest,
  testMatch: ['**/tests/bench*'],
  testEnvironment: 'node',
};
