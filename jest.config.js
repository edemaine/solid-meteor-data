export default {
  preset: 'solid-jest/preset/browser',
  // skip auto and benchmark tests by default
  testPathIgnorePatterns: ['/node_modules', '/auto', '/bench'],
  moduleFileExtensions: ['js', 'jsx'], // use built js, not ts
  extensionsToTreatAsEsm: ['.jsx'],
  moduleNameMapper: {
    '^meteor/tracker$': '@edemaine/meteor-tracker',
    '^meteor/reactive-var$': '@edemaine/meteor-tracker',
    '^meteor/meteor': '<rootDir>/tests/mockMeteor.js',
    '^meteor/mongo': '<rootDir>/tests/mockMongo.js',
  },
};
