export default {
  preset: 'solid-jest/preset/browser',
  // skip auto and benchmark tests by default
  testPathIgnorePatterns: ['/node_modules', '/auto', '/bench'],
  moduleFileExtensions: ['js', 'jsx'], // use built js, not ts
  extensionsToTreatAsEsm: ['.jsx'],
  moduleNameMapper: {
    '^meteor/tracker$': '@blastjs/tracker',
    '^meteor/reactive-var$': '@blastjs/reactive-var',
  },
};
