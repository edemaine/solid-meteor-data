import {createEffect, createRoot, createSignal} from 'solid-js';
import {ReactiveVar} from 'meteor/reactive-var';
import {jest} from '@jest/globals';

import {createTracker} from '../createTracker';
import {createTracker as createTracker2} from '..';

const tick = () => new Promise((done) => setTimeout(done, 0));

describe('createTracker', () => {
  test('both imports work', () => {
    expect(createTracker).toBe(createTracker2);
  });

  test('returns returned value', () => {
    createRoot(dispose => {
      const tracker = createTracker(() => 7);
      expect(tracker()).toEqual(7);
      dispose();
    });
  });

  test('reacts to Solid signals instantly', () => {
    createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const tracker = createTracker(() => signal()); // depend on signal
      expect(tracker()).toEqual(1);
      setSignal(2);
      expect(tracker()).toEqual(2);
      setSignal(3);
      expect(tracker()).toEqual(3);
      dispose();
    });
  });

  test('effects react to Solid signals', async () => {
    const {dispose, setSignal, effect} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const tracker = createTracker(() => signal());
      const effect = jest.fn(() => tracker()); // depend on tracker
      createEffect(effect); // depend on tracker
      return {dispose, setSignal, effect};
    });
    expect(effect).toHaveBeenCalledTimes(1);
    setSignal(2);
    await tick();
    expect(effect).toHaveBeenCalledTimes(2);
    setSignal(3);
    await tick();
    expect(effect).toHaveBeenCalledTimes(3);
    dispose();
  });

  test('reacts to ReactiveVar', async () => {
    let rv = new ReactiveVar(1);
    const {dispose, tracker, trackerUpdate} = createRoot(dispose => {
      const trackerUpdate = jest.fn(() => rv.get()); // depend on rv
      const tracker = createTracker(trackerUpdate);
      return {dispose, tracker, trackerUpdate};
    });
    expect(tracker()).toEqual(1);
    expect(trackerUpdate).toHaveBeenCalledTimes(1);
    rv.set(2);
    await tick();
    expect(tracker()).toEqual(2);
    expect(trackerUpdate).toHaveBeenCalledTimes(2);
    rv.set(2);
    await tick();
    expect(tracker()).toEqual(2);
    expect(trackerUpdate).toHaveBeenCalledTimes(2);
    rv.set(3);
    await tick();
    expect(tracker()).toEqual(3);
    expect(trackerUpdate).toHaveBeenCalledTimes(3);
    dispose();
  });

  test('reacts to Solid signals and ReactiveVar changes', async () => {
    let rv = new ReactiveVar(1);
    const {dispose, setSignal, tracker, trackerUpdate} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const trackerUpdate = jest.fn(() => rv.get() + signal());
        // depend on rv and signal
      const tracker = createTracker(trackerUpdate);
      return {dispose, setSignal, tracker, trackerUpdate};
    });
    expect(tracker()).toEqual(2);
    expect(trackerUpdate).toHaveBeenCalledTimes(1);
    rv.set(2);
    await tick();
    expect(tracker()).toEqual(3);
    expect(trackerUpdate).toHaveBeenCalledTimes(2);
    setSignal(2);
    expect(tracker()).toEqual(4);
    expect(trackerUpdate).toHaveBeenCalledTimes(3);
    rv.set(3);
    await tick();
    expect(tracker()).toEqual(5);
    expect(trackerUpdate).toHaveBeenCalledTimes(4);
    setSignal(3);
    expect(tracker()).toEqual(6);
    expect(trackerUpdate).toHaveBeenCalledTimes(5);
    dispose();
  });

  test('reacts to added ReactiveVar dependency', async () => {
    let rv = new ReactiveVar(1);
    const {dispose, setSignal, tracker, trackerUpdate} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const trackerUpdate = jest.fn(() => {
        if (signal() === 1)
          return signal(); // depend on just signal
        else
          return rv.get() + signal(); // depend on rv and signal
      });
      const tracker = createTracker(trackerUpdate);
      return {dispose, setSignal, tracker, trackerUpdate};
    });
    expect(tracker()).toEqual(1);
    expect(trackerUpdate).toHaveBeenCalledTimes(1);
    // Shouldn't yet depend on rv
    rv.set(2);
    expect(tracker()).toEqual(1);
    expect(trackerUpdate).toHaveBeenCalledTimes(1);
    setSignal(2);
    expect(tracker()).toEqual(4);
    expect(trackerUpdate).toHaveBeenCalledTimes(2);
    // Should now depend on rv
    rv.set(3);
    await tick();
    expect(tracker()).toEqual(5);
    expect(trackerUpdate).toHaveBeenCalledTimes(3);
    dispose();
  });

  test('reacts to added Solid signal dependency', async () => {
    let rv = new ReactiveVar(1);
    const {dispose, setSignal, tracker, trackerUpdate} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const trackerUpdate = jest.fn(() => {
        if (rv.get() === 1)
          return rv.get(); // depend on just rv
        else
          return rv.get() + signal(); // depend on rv and signal
      });
      const tracker = createTracker(trackerUpdate);
      return {dispose, setSignal, tracker, trackerUpdate};
    });
    expect(tracker()).toEqual(1);
    expect(trackerUpdate).toHaveBeenCalledTimes(1);
    // Shouldn't yet depend on signal
    setSignal(2);
    expect(tracker()).toEqual(1);
    expect(trackerUpdate).toHaveBeenCalledTimes(1);
    rv.set(2);
    await tick();
    expect(tracker()).toEqual(4);
    expect(trackerUpdate).toHaveBeenCalledTimes(2);
    // Should now depend on signal
    setSignal(3);
    expect(tracker()).toEqual(5);
    expect(trackerUpdate).toHaveBeenCalledTimes(3);
    dispose();
  });
});
