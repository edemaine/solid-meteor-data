import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {Tracker} from 'meteor/tracker';
import {createComputed, createSignal, onCleanup} from 'solid-js';
import type {Accessor} from 'solid-js';
import {createStore, reconcile, unwrap} from 'solid-js/store';
import type {Store} from 'solid-js/store';

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
export type CreateFindOptions = {
  noStore: boolean;
};

const storify = <T>(document: Store<T>): Store<T> => createStore(document)[0];

const createFindClient = <T extends object>(factory: FindFactory<T>, options?: CreateFindOptions): Accessor<Store<T>[]> => {
  const useStore = !(options && options.noStore);
  // cursor stores the current return value of factory()
  let cursor: Mongo.Cursor<T> | null | undefined;
  // observer stores the current observe() live query, if any
  let observer: Meteor.LiveQueryHandle | undefined;
  // documents is an Array modified in-place to track current cursor results.
  // We maintain the invariant that output() === documents, but allow briefly
  // modifying documents before triggering the output signal via setOutput.
  let documents: Store<T>[] = [];
  const [output, setOutput] = createSignal<Store<T>[]>(documents, {equals: false});
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
        setOutput(documents);
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
      if (documents.length) {
        setOutput(documents = []);
      }
    } else {
      // Set initial value to full fetch (an optimization over observe startup)
      documents = Tracker.nonreactive(() => cursor!.fetch());
      if (useStore)
        documents = (documents as Store<T>[]).map(storify);
      setOutput(documents);
      // Observe further changes to cursor via live query
      observer = cursor.observe({
        addedAt(document: Store<T>, atIndex) {
          if (useStore) document = storify<T>(document);
          schedule(() => documents.splice(atIndex, 0, document));
        },
        // @ts-ignore: Unused variable oldDocument
        changedAt(newDocument, oldDocument, atIndex) {
          if (useStore)
            // Only change changed fields in existing document.  Simulate
            // setStore which unwraps old document and passes it to reconcile.
            reconcile(newDocument)(unwrap(documents[atIndex]));
          else
            schedule(() => documents[atIndex] = newDocument);
        },
        // @ts-ignore: Unused variable oldDocument
        removedAt(oldDocument, atIndex) {
          schedule(() => documents.splice(atIndex, 1));
        },
        // @ts-ignore: Unused variable document
        movedTo(document, fromIndex, toIndex) {
          schedule(() => {
            const [oldDoc] = documents.splice(fromIndex, 1);
            documents.splice(toIndex, 0, oldDoc);
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
const createFindServer = <T = any>(factory: FindFactory<T>): Accessor<Store<T>[]> => {
  const cursor = Tracker.nonreactive(factory);
  if (Meteor.isDevelopment) checkCursor(cursor);
  return (cursor instanceof Mongo.Cursor)
    ? () => Tracker.nonreactive(() => cursor!.fetch())
    : () => [];
};

export const createFind = Meteor.isServer
  ? createFindServer
  : createFindClient;
