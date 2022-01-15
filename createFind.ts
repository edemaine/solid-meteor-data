import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {Tracker} from 'meteor/tracker';
import {createComputed, createSignal, onCleanup} from 'solid-js';
import type {Accessor} from 'solid-js';
import {createStore, reconcile, unwrap} from 'solid-js/store';
import type {Store} from 'solid-js/store';

// Helper based on react-meteor-data: check for null or valid cursor.
// On client, we should have a Mongo.Cursor (defined in
// https://github.com/meteor/meteor/blob/devel/packages/minimongo/cursor.js and
// https://github.com/meteor/meteor/blob/devel/packages/mongo/collection.js).
// On server, however, we instead get a private Cursor type from
// https://github.com/meteor/meteor/blob/devel/packages/mongo/mongo_driver.js
// which has fields _mongo and _cursorDescription.
const checkCursor = <T>(cursor: Mongo.Cursor<T> | undefined | null | {_mongo: unknown, _cursorDescription: unknown}) => {
  if (cursor != null && !(cursor instanceof Mongo.Cursor) &&
      !(cursor._mongo && cursor._cursorDescription)) {
    console.warn(
      'Warning: createFind requires an instance of Mongo.Cursor (or null). '
      + 'Make sure you do NOT call .fetch() on your cursor.'
    );
  }
};

export type FindFactory<T> = () => (Mongo.Cursor<T> | undefined | null);
export type CreateFindOptions = {
  noStore?: boolean;
  separate?: boolean;
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
      if (documents.length) {  // avoid trigger if already empty
        setOutput(documents = []);
      }
    } else {
      // Set initial value to full fetch (an optimization over observe startup)
      let newDocuments: Store<T>[] = Tracker.nonreactive(() => cursor!.fetch());
      if (useStore && newDocuments.length) {
        if (documents.length && !(options && options.separate)) {
          // Use reconcile to update documents to match newDocuments.
          // It needs to be given the unwrapped versions of documents,
          // and it produces a new array with those unwrapped versions,
          // which we then need to rewrap.
          newDocuments = reconcile(newDocuments, {key: '_id'})(
            documents.map((doc) => unwrap(doc))) as any;
        }
        newDocuments = newDocuments.map(storify);
      }
      if (newDocuments.length || documents.length)  // avoid if already empty
        setOutput(documents = newDocuments);
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
  return cursor
    ? () => Tracker.nonreactive(() => cursor!.fetch())
    : () => [];
};

export const createFind = Meteor.isServer
  ? createFindServer
  : createFindClient;
