import {createMemo, createRoot, createSignal} from 'solid-js';
import {jest} from '@jest/globals';
import {ReactiveVar} from 'meteor/reactive-var';

import {Mongo} from 'meteor/mongo';  // actually ./mockMongo
import {createFindOne} from '../createFindOne';
import {createFindOne as createFindOne2} from '..';

const tick = () => new Promise((done) => setTimeout(done, 0));

const user1 = () => ({
  _id: '123',
  username: 'edemaine',
  profile: {dark: true},
});
const user2 = () => ({
  _id: '321',
  username: 'erik',
  profile: {dark: true},
});

describe('createFindOne', () => {
  test('both imports work', () => {
    expect(createFindOne).toBe(createFindOne2);
  });

  test('exists false if undefined', () => {
    createRoot(dispose => {
      const [exists, user] = createFindOne(() => undefined);
      expect(exists()).toStrictEqual(false);
      expect(user).toStrictEqual({});
      dispose();
    });
  });

  test('exists false if null', () => {
    createRoot(dispose => {
      const [exists, user] = createFindOne(() => null);
      expect(exists()).toStrictEqual(false);
      expect(user).toStrictEqual({});
      dispose();
    });
  });

  test('returns factory results', () => {
    createRoot(dispose => {
      const [exists, user] = createFindOne(() => user1());
      expect(exists()).toStrictEqual(true);
      expect(user).toStrictEqual(user1());
      dispose();
    });
  });

  test('updates user during login and logout', async () => {
    const meteorUser = new ReactiveVar();
    const {dispose, exists, memoExists, user, username} = createRoot(dispose => {
      const [exists, user] = createFindOne(() => meteorUser.get());
      const memoExists = jest.fn(() => exists());
      createMemo(memoExists);
      const username = jest.fn(() => user.username);
      createMemo(username);
      return {dispose, exists, memoExists, user, username};
    });
    expect(exists()).toStrictEqual(false);
    expect(memoExists).toHaveBeenCalledTimes(1);
    expect(user).toStrictEqual({});
    expect(user.username).toStrictEqual(undefined);
    expect(username).toHaveBeenCalledTimes(1);
    // Simulate logging in
    meteorUser.set(user1());
    await tick();
    expect(exists()).toStrictEqual(true);
    expect(memoExists).toHaveBeenCalledTimes(2);
    expect(user).toStrictEqual(user1());
    expect(username).toHaveBeenCalledTimes(2);
    const profile1 = user.profile;
    // Switch users
    meteorUser.set(user2());
    await tick();
    expect(exists()).toStrictEqual(true);
    expect(memoExists).toHaveBeenCalledTimes(2); // no change
    expect(user).toStrictEqual(user2());
    expect(username).toHaveBeenCalledTimes(3);
    expect(user.profile).toBe(profile1); // no change
    // Log out
    meteorUser.set();
    await tick();
    expect(exists()).toStrictEqual(false);
    expect(memoExists).toHaveBeenCalledTimes(3);
    expect(user).toStrictEqual({});
    expect(username).toHaveBeenCalledTimes(4);
    dispose();
  });
});
