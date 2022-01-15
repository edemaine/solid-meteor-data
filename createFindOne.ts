import {Meteor} from 'meteor/meteor';
import {batch, createSignal} from 'solid-js';
import type {Accessor} from 'solid-js';
import {createStore, reconcile} from 'solid-js/store';
import type {Store} from 'solid-js/store';

import {createTracker} from './createTracker';

const createFindOneClient = <T extends object>(factory: () => T | undefined | null): [Accessor<boolean>, Store<T | {}>] => {
  const [exists, setExists] = createSignal<boolean>(false);
  const [store, setStore] = createStore<T | {}>({});
  createTracker(() => {
    const document = factory();
    batch(() => {
      setExists(Boolean(document));
      setStore(reconcile(document || {}));
    });
  });
  return [exists, store];
};

// On the server, just fetch without reactivity
const createFindOneServer = <T extends object>(factory: () => T | undefined | null): [Accessor<boolean>, Store<T> | {}] => {
  const document = factory();
  return [
    () => Boolean(document),
    () => document || {},
  ];
};

export const createFindOne = Meteor.isServer
  ? createFindOneServer
  : createFindOneClient;
