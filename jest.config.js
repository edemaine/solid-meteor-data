export default {
  preset: 'solid-jest/preset/browser',
  testPathIgnorePatterns: ['/node_modules', '/auto'], // skip auto by default
  moduleFileExtensions: ['js', 'jsx'], // use built js, not ts
  extensionsToTreatAsEsm: ['.jsx'],
  moduleNameMapper: {
    '^meteor/tracker$': '@edemaine/meteor-tracker',
    '^meteor/reactive-var$': '@edemaine/meteor-tracker',
  },
};
