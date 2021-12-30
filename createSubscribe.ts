import {Meteor} from 'meteor/meteor';
import {Tracker} from 'meteor/tracker';
import {createSignal, onCleanup} from 'solid-js';
import type {Accessor} from 'solid-js';

const createSubscribeClient = (name: string, ...args: any[]): Accessor<boolean> => {
  const [loading, setLoading] = createSignal(true);
  const computation = Tracker.autorun(() => {
    const sub = Meteor.subscribe(name, ...args);
    setLoading(!sub.ready());
  });
  onCleanup(computation.stop);
  return loading;
}

// @ts-ignore Unused arguments for correct type
const createSubscribeServer = (name?: string, ...args: any[]): Accessor<boolean> =>
  () => false;

export const createSubscribe = Meteor.isServer
  ? createSubscribeServer
  : createSubscribeClient;
