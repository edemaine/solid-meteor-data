// Meteor package information
// (package.json is just for testing)

Package.describe({
  name: 'solidjs-meteor-data',
  summary: 'Helpers for combining SolidJS and Meteor reactivity',
  version: '0.0.0',
  documentation: 'README.md',
  git: 'https://github.com/edemaine/solidjs-meteor-data',
});

Package.onUse((api) => {
  api.versionsFrom(['1.8.2', '1.12', '2.0', '2.3']);
  api.use('tracker');
  api.use('ecmascript');
  api.use('typescript');

  api.mainModule('index.ts', ['client', 'server'], {lazy: true});
});

/*
Package.onTest((api) => {
  api.use(['ecmascript', 'typescript', 'reactive-dict', 'reactive-var', 'tracker', 'tinytest', 'underscore', 'mongo']);
  api.use('test-helpers');
  api.use('solidjs-meteor-data');
  api.mainModule('tests.js');
});
*/
