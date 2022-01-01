import {Meteor} from 'meteor/meteor';
import type {Accessor} from 'solid-js';

import {createTracker} from './createTracker';

type CreateSubscribe =
  (name: string | Meteor.SubscriptionHandle |
         (() => string | Meteor.SubscriptionHandle),
   ...args: any[]) => Accessor<boolean>;

const createSubscribeClient: CreateSubscribe = (name, ...args) => {
  if (!name) return () => false;
  return createTracker(() => {
    let first: string | Meteor.SubscriptionHandle;
    if (typeof name === 'function') {
      first = name();
    } else {
      first = name;
    }
    let sub: Meteor.SubscriptionHandle;
    // Allow first argument to resolve to full subscription with ready method.
    if (typeof first !== 'string') {
      if (first.ready && typeof first.ready === 'function') {
        sub = first;
      } else {
        if (Meteor.isDevelopment)
          console.warn(`Invalid return type from first argument to createSubscribe: ${typeof first}`);
        return true;
      }
    } else {
      sub = Meteor.subscribe(first, ...args.map((arg) =>
        typeof arg === 'function' ? arg() : arg));
    }
    return !sub.ready();
  });
}

// @ts-ignore Unused arguments for correct type
const createSubscribeServer: CreateSubscribe = (name, ...args) =>
  () => false;

export const createSubscribe: CreateSubscribe = Meteor.isServer
  ? createSubscribeServer
  : createSubscribeClient;
