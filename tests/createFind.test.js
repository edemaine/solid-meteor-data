import {createMemo, createRoot, createSignal} from 'solid-js';
import {jest} from '@jest/globals';

import {Mongo} from 'meteor/mongo';  // actually ./mockMongo
import {createFind} from '../createFind';
import {createFind as createFind2} from '..';

const docs = () => [
  {_id: 101, name: 'Me', friends: ['Myself', 'I']},
  {_id: 102, name: 'Myself', friends: ['Me']},
  {_id: 103, name: 'I', friends: ['Me']},
];

const tick = () => new Promise((done) => setTimeout(done, 0));

const makeCursor = (init) => {
  const cursor = new Mongo.Cursor;
  cursor.fetch = jest.fn().mockReturnValue(init);
  return cursor;
};

describe('createFind', () => {
  test('both imports work', () => {
    expect(createFind).toBe(createFind2);
  });

  test('noStore returns fetch results, identically', () => {
    createRoot(dispose => {
      const instance = docs();
      const results = createFind(() => {
        const cursor = new Mongo.Cursor;
        cursor.fetch = jest.fn().mockReturnValue(instance);
        return cursor;
      }, {noStore: true});
      expect(results()).toBe(instance);
      dispose();
    });
  });

  test('returns fetch results as stores', () => {
    createRoot(dispose => {
      const results = createFind(() => makeCursor(docs()));
      expect(results()).toStrictEqual(docs());
      dispose();
    });
  });

  test('noStore unchanged documents are identical', async () => {
    const instance = docs();
    const {dispose, cursor, results} = createRoot(dispose => {
      const cursor = makeCursor(instance.slice(0, 2));
      const results = createFind(() => cursor, {noStore: true});
      return {dispose, cursor, results};
    });
    cursor.callbacks.addedAt(instance[2], 2);
    await tick();
    expect(results()).toStrictEqual(instance);
    expect(results()[0]).toBe(instance[0]);
    expect(results()[1]).toBe(instance[1]);
    expect(results()[2]).toBe(instance[2]);
    cursor.callbacks.changedAt(instance[2], instance[0], 0);
    await tick();
    expect(results()[0]).toBe(instance[2]);
    expect(results()[1]).toBe(instance[1]);
    expect(results()[2]).toBe(instance[2]);
    dispose();
  });

  test('document stores remain identical', async () => {
    const {dispose, cursor, results, name, friends} = createRoot(dispose => {
      const cursor = makeCursor(docs().slice(0, 2));
      const results = createFind(() => cursor);
      const middle = results()[1];
      const name = jest.fn(() => middle.name);
      const friends = jest.fn(() => middle.friends);
      createMemo(name);
      createMemo(friends);
      return {dispose, cursor, results, name, friends};
    });
    await tick();
    expect(name).toHaveBeenCalledTimes(1);
    expect(friends).toHaveBeenCalledTimes(1);
    cursor.callbacks.addedAt(docs()[2], 2);
    await tick();
    expect(results()).toStrictEqual(docs());
    const stores = results();
    cursor.callbacks.changedAt(docs()[2], docs()[0], 0);
    await tick();
    expect(results()).toStrictEqual([docs()[2], docs()[1], docs()[2]]);
    expect(results()[0]).toBe(stores[0]);
    expect(results()[1]).toBe(stores[1]);
    expect(results()[2]).toBe(stores[2]);
    cursor.callbacks.changedAt(docs()[0], docs()[2], 2);
    await tick();
    expect(results()).toStrictEqual(docs().reverse());
    expect(results()[0]).toBe(stores[0]);
    expect(results()[1]).toBe(stores[1]);
    expect(results()[2]).toBe(stores[2]);
    // Changing middle element should update name but not friends
    expect(name).toHaveBeenCalledTimes(1);
    expect(friends).toHaveBeenCalledTimes(1);
    cursor.callbacks.changedAt(docs()[2], docs()[1], 1);
    expect(name).toHaveBeenCalledTimes(2);
    expect(friends).toHaveBeenCalledTimes(1);
    dispose();
  });

  test('append correctly', async () => {
    const {dispose, cursor, memo, memoUpdate} = createRoot(dispose => {
      const cursor = new Mongo.Cursor;
      const results = createFind(() => cursor);
      // Ensure reactive update triggered using memo dependency:
      const memoUpdate = jest.fn(() => results());
      const memo = createMemo(memoUpdate);
      return {dispose, cursor, memo, memoUpdate};
    });
    expect(memoUpdate).toHaveBeenCalledTimes(1);
    expect(memo()).toStrictEqual([]);
    cursor.callbacks.addedAt(docs()[0], 0);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(2);
    expect(memo()).toStrictEqual(docs().slice(0, 1));
    cursor.callbacks.addedAt(docs()[1], 1);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(3);
    expect(memo()).toStrictEqual(docs().slice(0, 2));
    cursor.callbacks.addedAt(docs()[2], 2);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(4);
    expect(memo()).toStrictEqual(docs().slice(0, 3));
    dispose();
  });

  test('prepend correctly', async () => {
    const {dispose, cursor, memo, memoUpdate} = createRoot(dispose => {
      const cursor = new Mongo.Cursor;
      const results = createFind(() => cursor);
      // Ensure reactive update triggered using memo dependency:
      const memoUpdate = jest.fn(() => results());
      const memo = createMemo(memoUpdate);
      return {dispose, cursor, memo, memoUpdate};
    });
    expect(memoUpdate).toHaveBeenCalledTimes(1);
    expect(memo()).toStrictEqual([]);
    cursor.callbacks.addedAt(docs()[0], 0);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(2);
    expect(memo()).toStrictEqual(docs().slice(0, 1).reverse());
    cursor.callbacks.addedAt(docs()[1], 0);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(3);
    expect(memo()).toStrictEqual(docs().slice(0, 2).reverse());
    cursor.callbacks.addedAt(docs()[2], 0);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(4);
    expect(memo()).toStrictEqual(docs().slice(0, 3).reverse());
    dispose();
  });

  test('add/change/remove/move correctly', async () => {
    const {dispose, cursor, memo, memoUpdate} = createRoot(dispose => {
      const cursor = new Mongo.Cursor;
      const results = createFind(() => cursor);
      // Ensure reactive update triggered using memo dependency:
      const memoUpdate = jest.fn(() => results());
      const memo = createMemo(memoUpdate);
      return {dispose, cursor, memo, memoUpdate};
    });
    expect(memoUpdate).toHaveBeenCalledTimes(1);
    expect(memo()).toStrictEqual([]);
    // Insert in weird order
    cursor.callbacks.addedAt(docs()[0], 0);
    cursor.callbacks.addedAt(docs()[1], 1);
    cursor.callbacks.addedAt(docs()[2], 1);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(2);
    expect(memo()).toStrictEqual([docs()[0], docs()[2], docs()[1]]);
    // Batch remove + add to simulate move
    cursor.callbacks.removedAt(docs()[2], 1);
    cursor.callbacks.addedAt(docs()[2], 2);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(3);
    expect(memo()).toStrictEqual([docs()[0], docs()[1], docs()[2]]);
    // Move tests
    cursor.callbacks.movedTo(docs()[2], 2, 0);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(4);
    expect(memo()).toStrictEqual([docs()[2], docs()[0], docs()[1]]);
    cursor.callbacks.movedTo(docs()[2], 0, 2);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(5);
    expect(memo()).toStrictEqual([docs()[0], docs()[1], docs()[2]]);
    // Test batching of update followed by its inverse
    cursor.callbacks.movedTo(docs()[2], 2, 0);
    cursor.callbacks.movedTo(docs()[2], 0, 2);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(6);
    expect(memo()).toStrictEqual([docs()[0], docs()[1], docs()[2]]);
    dispose();
  });

  test('batch appends', async () => {
    const {dispose, cursor, memo, memoUpdate} = createRoot(dispose => {
      const cursor = new Mongo.Cursor;
      const results = createFind(() => cursor);
      // Ensure reactive update triggered using memo dependency:
      const memoUpdate = jest.fn(() => results());
      const memo = createMemo(memoUpdate);
      return {dispose, cursor, memo, memoUpdate};
    });
    expect(memoUpdate).toHaveBeenCalledTimes(1);
    expect(memo()).toStrictEqual([]);
    cursor.callbacks.addedAt(docs()[0], 0);
    cursor.callbacks.addedAt(docs()[1], 1);
    cursor.callbacks.addedAt(docs()[2], 2);
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(2);
    expect(memo()).toStrictEqual(docs());
    dispose();
  });

  test('abort batch when cursor changes', async () => {
    const {dispose, cursor, setCursor, memo, memoUpdate} = createRoot(dispose => {
      const [cursor, setCursor] = createSignal(new Mongo.Cursor);
      const results = createFind(() => cursor());
      // Ensure reactive update triggered using memo dependency:
      const memoUpdate = jest.fn(() => results());
      const memo = createMemo(memoUpdate);
      return {dispose, cursor, setCursor, memo, memoUpdate};
    });
    expect(memoUpdate).toHaveBeenCalledTimes(1);
    expect(memo()).toStrictEqual([]);
    cursor().callbacks.addedAt(docs()[0], 0);
    cursor().callbacks.addedAt(docs()[1], 1);
    // Changing cursor triggers immediate fetch and update.
    // Optimization prevents memo from even triggering.
    setCursor(new Mongo.Cursor);
    expect(memoUpdate).toHaveBeenCalledTimes(1);
    expect(memo()).toStrictEqual([]);
    cursor().callbacks.addedAt(docs()[2], 0);
    // Want tick to trigger last add but not first two
    await tick();
    expect(memoUpdate).toHaveBeenCalledTimes(2);
    expect(memo()).toStrictEqual(docs().slice(2, 3));
    dispose();
  });

  test('cursor reacts to solid signals', () => {
    const instance = docs();
    createRoot(dispose => {
      const [cursor, setCursor] = createSignal(new Mongo.Cursor);
      const results = createFind(() => cursor());
      // Ensure reactive update triggered using memo dependency:
      const memoUpdate = jest.fn(() => results());
      createMemo(memoUpdate);
      expect(memoUpdate).toHaveBeenCalledTimes(1);
      setCursor(makeCursor(instance));
      expect(memoUpdate).toHaveBeenCalledTimes(2);
      expect(results()).toStrictEqual(docs());
      const first = results()[0], middle = results()[1], last = results()[2];
      const firstNameUpdate = jest.fn(() => first.name);
      const lastNameUpdate = jest.fn(() => last.name);
      createMemo(firstNameUpdate);
      createMemo(lastNameUpdate);
      expect(firstNameUpdate).toHaveBeenCalledTimes(1);
      expect(lastNameUpdate).toHaveBeenCalledTimes(1);
      // Reverse should not change any documents, only move
      setCursor(makeCursor(docs().reverse()));
      expect(memoUpdate).toHaveBeenCalledTimes(3);
      expect(results()).toStrictEqual(docs().reverse());
      expect(results()[0]).toBe(last);
      expect(results()[1]).toBe(middle);
      expect(results()[2]).toBe(first);
      expect(firstNameUpdate).toHaveBeenCalledTimes(1);
      expect(lastNameUpdate).toHaveBeenCalledTimes(1);
      // Modify what was first document
      const newDocs = docs();
      newDocs[0].name = 'MeMeMeMe';
      setCursor(makeCursor(newDocs.reverse()));
      expect(results()[0]).toBe(last);
      expect(results()[1]).toBe(middle);
      expect(results()[2]).toBe(first);
      expect(firstNameUpdate).toHaveBeenCalledTimes(2);
      expect(lastNameUpdate).toHaveBeenCalledTimes(1);
      dispose();
    });
  });

  test('separate: cursor reacts to solid signals', () => {
    const instance = docs();
    createRoot(dispose => {
      const [cursor, setCursor] = createSignal(new Mongo.Cursor);
      const results = createFind(() => cursor(), {separate: true});
      // Ensure reactive update triggered using memo dependency:
      const memoUpdate = jest.fn(() => results());
      createMemo(memoUpdate);
      expect(memoUpdate).toHaveBeenCalledTimes(1);
      setCursor(makeCursor(instance));
      expect(memoUpdate).toHaveBeenCalledTimes(2);
      expect(results()).toStrictEqual(docs());
      const first = results()[0], middle = results()[1], last = results()[2];
      const firstNameUpdate = jest.fn(() => first.name);
      const lastNameUpdate = jest.fn(() => last.name);
      createMemo(firstNameUpdate);
      createMemo(lastNameUpdate);
      expect(firstNameUpdate).toHaveBeenCalledTimes(1);
      expect(lastNameUpdate).toHaveBeenCalledTimes(1);
      // Reverse should change everything.
      setCursor(makeCursor(docs().reverse()));
      expect(memoUpdate).toHaveBeenCalledTimes(3);
      expect(results()).toStrictEqual(docs().reverse());
      expect(results()[0]).not.toBe(last);
      expect(results()[1]).not.toBe(middle);
      expect(results()[2]).not.toBe(first);
      expect(firstNameUpdate).toHaveBeenCalledTimes(1);
      expect(lastNameUpdate).toHaveBeenCalledTimes(1);
      // Modify what was first document
      const newDocs = docs();
      newDocs[0].name = 'MeMeMeMe';
      setCursor(makeCursor(newDocs.reverse()));
      expect(results()[0]).not.toBe(last);
      expect(results()[1]).not.toBe(middle);
      expect(results()[2]).not.toBe(first);
      expect(firstNameUpdate).toHaveBeenCalledTimes(1);
      expect(lastNameUpdate).toHaveBeenCalledTimes(1);
      dispose();
    });
  });
});
