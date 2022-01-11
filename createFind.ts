import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {Tracker} from 'meteor/tracker';
import {createComputed, createSignal, onCleanup} from 'solid-js';
import type {Accessor} from 'solid-js';

// Helper from react-meteor-data
const checkCursor = <T>(cursor: Mongo.Cursor<T> | undefined | null) => {
  if (cursor != null && !(cursor instanceof Mongo.Cursor)) {
    console.warn(
      'Warning: createFind requires an instance of Mongo.Cursor (or null). '
      + 'Make sure you do NOT call .fetch() on your cursor.'
    );
  }
};

export type FindFactory<T> = () => (Mongo.Cursor<T> | undefined | null);

const createFindClient = <T>(factory: FindFactory<T>): Accessor<T[]> => {
  // cursor stores the current return value of factory()
  let cursor: Mongo.Cursor<T> | null | undefined;
  // observer stores the current observe() live query, if any
  let observer: Meteor.LiveQueryHandle | undefined;
  // results is an Array modified in-place to track current cursor results.
  // We maintain the invariant that output() === results, but allow briefly
  // modifying results before triggering the output signal via setOutput.
  let results: T[] = [];
  const [output, setOutput] = createSignal<T[]>(results, {equals: false});
  // queue maintains a list of operations to do at the next tick.
  let queue: (() => void)[];
  // schedule() adds a new task to that queue, and if needed,
  // automatically schedules flushing the queue at next tick.
  let scheduled = false;
  const schedule = (op: () => void) => {
    queue.push(op);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        queue.forEach((op) => op());
        queue = [];
        setOutput(results);
      });
    }
  };
  createComputed(() => {
    queue = [];  // cancel any queued operations
    if (observer) {
      observer.stop();
      observer = undefined;
    }
    cursor = Tracker.nonreactive(factory);
    if (Meteor.isDevelopment) checkCursor(cursor);
    if (!cursor) {
      setOutput(results = []);
    } else {
      // Set initial value to full fetch (an optimization over observe startup)
      setOutput(results = Tracker.nonreactive(() => cursor!.fetch()));
      // Observe further changes to cursor via live query
      observer = cursor.observe({
        addedAt(document, atIndex) {
          schedule(() => results.splice(atIndex, 0, document));
        },
        // @ts-ignore: Unused variable oldDocument
        changedAt(newDocument, oldDocument, atIndex) {
          schedule(() => results[atIndex] = newDocument);
        },
        // @ts-ignore: Unused variable oldDocument
        removedAt(oldDocument, atIndex) {
          schedule(() => results.splice(atIndex, 1));
        },
        // @ts-ignore: Unused variable document
        movedTo(document, fromIndex, toIndex) {
          schedule(() => {
            results.splice(fromIndex, 1);
            results.splice(toIndex, 0, document);
          });
        },
        // @ts-ignore: private API
        _suppress_initial: true,
      });
    }
  });
  onCleanup(() => {
    if (observer) observer.stop();
  });
  return output;
};

// On the server, just fetch without reactivity
const createFindServer = <T = any>(factory: FindFactory<T>): Accessor<T[]> => {
  const cursor = Tracker.nonreactive(factory);
  if (Meteor.isDevelopment) checkCursor(cursor);
  return (cursor instanceof Mongo.Cursor)
    ? () => Tracker.nonreactive(() => cursor!.fetch())
    : () => [];
};

export const createFind = Meteor.isServer
  ? createFindServer
  : createFindClient;
