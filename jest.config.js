export default {
  preset: 'solid-jest/preset/browser',
  testMatch: ['**/test.js?(x)'],
  moduleFileExtensions: ['js', 'jsx'], // use built js, not ts
  extensionsToTreatAsEsm: ['.jsx'],
  moduleNameMapper: {
    '^meteor/tracker$': '@edemaine/meteor-tracker',
    '^meteor/reactive-var$': '@edemaine/meteor-tracker',
  },
};
