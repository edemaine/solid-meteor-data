import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {Tracker} from 'meteor/tracker';
import {createComputed, createSignal, onCleanup} from 'solid-js';
import type {Accessor} from 'solid-js';

// Helper from react-meteor-data
const checkCursor = <T>(cursor: Mongo.Cursor<T> | undefined | null) => {
  if (cursor !== null && cursor !== undefined && !(cursor instanceof Mongo.Cursor)) {
    console.warn(
      'Warning: createFind requires an instance of Mongo.Cursor (or null). '
      + 'Make sure you do NOT call .fetch() on your cursor.'
    );
  }
};

const createFindClient = <T = any>(factory: () => (Mongo.Cursor<T> | undefined | null)): Accessor<T[]> => {
  const [output, setOutput] = createSignal<T[]>([]);
  let cursor: Mongo.Cursor<T> | null | undefined;
  let observer: Meteor.LiveQueryHandle | undefined;
  createComputed(() => {
    if (observer) {
      observer.stop();
      observer = undefined;
    }
    cursor = Tracker.nonreactive(factory);
    if (Meteor.isDevelopment) checkCursor(cursor);
    if (!cursor) {
      setOutput([]);
    } else {
      // Set initial value to full fetch (an optimization over observe startup)
      setOutput(Tracker.nonreactive(() => cursor!.fetch()));
      // Observe further changes to cursor via live query
      observer = cursor.observe({
        addedAt(document, atIndex) {
          setOutput((data) => [
            ...data.slice(0, atIndex),
            document,
            ...data.slice(atIndex),
          ]);
        },
        // @ts-ignore: Unused variable oldDocument
        changedAt(newDocument, oldDocument, atIndex) {
          setOutput((data) => [
            ...data.slice(0, atIndex),
            newDocument,
            ...data.slice(atIndex + 1),
          ]);
        },
        // @ts-ignore: Unused variable oldDocument
        removedAt(oldDocument, atIndex) {
          setOutput((data) => [
            ...data.slice(0, atIndex),
            ...data.slice(atIndex + 1),
          ]);
        },
        movedTo(document, fromIndex, toIndex) {
          setOutput((data) => {
            const copy = [
              ...data.slice(0, fromIndex),
              ...data.slice(fromIndex + 1),
            ];
            copy.splice(toIndex, 0, document);
            return copy;
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

const createFindServer = <T = any>(factory: () => (Mongo.Cursor<T> | undefined | null)) => {
  const cursor = Tracker.nonreactive(factory);
  if (Meteor.isDevelopment) checkCursor(cursor);
  return (cursor instanceof Mongo.Cursor)
    ? Tracker.nonreactive(cursor.fetch)
    : null;
};

export const createFind = Meteor.isServer
  ? createFindServer
  : createFindClient;
