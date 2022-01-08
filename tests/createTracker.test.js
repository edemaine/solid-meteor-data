import {createEffect, createRoot, createSignal} from 'solid-js';
import {ReactiveVar} from 'meteor/reactive-var';

import {createTracker} from '../createTracker';
//import {createFind, createSubscribe, createTracker} from '..';

const tick = () => new Promise((done) => setTimeout(done, 0));

describe('createTracker', () => {
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
    let changes = 0;
    const {dispose, setSignal} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const tracker = createTracker(() => signal());
      createEffect(() => {
        tracker(); // depend on tracker
        changes++;
      });
      return {dispose, setSignal};
    });
    expect(changes).toEqual(1);
    setSignal(2);
    await tick();
    expect(changes).toEqual(2);
    setSignal(3);
    await tick();
    expect(changes).toEqual(3);
    dispose();
  });

  test('reacts to ReactiveVar', async () => {
    let rv = new ReactiveVar(1);
    let changes = 0;
    const {dispose, tracker} = createRoot(dispose => {
      const tracker = createTracker(() => {
        changes++;
        return rv.get(); // depend on rv
      });
      expect(tracker()).toEqual(1);
      expect(changes).toEqual(1);
      return {dispose, tracker};
    });
    expect(tracker()).toEqual(1);
    expect(changes).toEqual(1);
    rv.set(2);
    await tick();
    expect(tracker()).toEqual(2);
    expect(changes).toEqual(2);
    rv.set(2);
    await tick();
    expect(tracker()).toEqual(2);
    expect(changes).toEqual(2);
    rv.set(3);
    await tick();
    expect(tracker()).toEqual(3);
    expect(changes).toEqual(3);
    dispose();
  });

  test('reacts to Solid signals and ReactiveVar changes', async () => {
    let rv = new ReactiveVar(1);
    let changes = 0;
    const {dispose, setSignal, tracker} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const tracker = createTracker(() => {
        changes++;
        return rv.get() + signal(); // depend on rv and signal
      });
      expect(tracker()).toEqual(2);
      expect(changes).toEqual(1);
      return {dispose, setSignal, tracker};
    });
    expect(tracker()).toEqual(2);
    expect(changes).toEqual(1);
    rv.set(2);
    await tick();
    expect(tracker()).toEqual(3);
    expect(changes).toEqual(2);
    setSignal(2);
    expect(tracker()).toEqual(4);
    expect(changes).toEqual(3);
    rv.set(3);
    await tick();
    expect(tracker()).toEqual(5);
    expect(changes).toEqual(4);
    setSignal(3);
    expect(tracker()).toEqual(6);
    expect(changes).toEqual(5);
    dispose();
  });

  test('reacts to added ReactiveVar dependency', async () => {
    let rv = new ReactiveVar(1);
    let changes = 0;
    const {dispose, setSignal, tracker} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const tracker = createTracker(() => {
        changes++;
        if (signal() === 1)
          return signal(); // depend on just signal
        else
          return rv.get() + signal(); // depend on rv and signal
      });
      expect(tracker()).toEqual(1);
      expect(changes).toEqual(1);
      return {dispose, setSignal, tracker};
    });
    expect(tracker()).toEqual(1);
    expect(changes).toEqual(1);
    // Shouldn't yet depend on rv
    rv.set(2);
    expect(tracker()).toEqual(1);
    expect(changes).toEqual(1);
    setSignal(2);
    expect(tracker()).toEqual(4);
    expect(changes).toEqual(2);
    // Should now depend on rv
    rv.set(3);
    await tick();
    expect(tracker()).toEqual(5);
    expect(changes).toEqual(3);
    dispose();
  });

  test('reacts to added Solid signal dependency', async () => {
    let rv = new ReactiveVar(1);
    let changes = 0;
    const {dispose, setSignal, tracker} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const tracker = createTracker(() => {
        changes++;
        if (rv.get() === 1)
          return rv.get(); // depend on just rv
        else
          return rv.get() + signal(); // depend on rv and signal
      });
      expect(tracker()).toEqual(1);
      expect(changes).toEqual(1);
      return {dispose, setSignal, tracker};
    });
    expect(tracker()).toEqual(1);
    expect(changes).toEqual(1);
    // Shouldn't yet depend on signal
    setSignal(2);
    expect(tracker()).toEqual(1);
    expect(changes).toEqual(1);
    rv.set(2);
    await tick();
    expect(tracker()).toEqual(4);
    expect(changes).toEqual(2);
    // Should now depend on signal
    setSignal(3);
    expect(tracker()).toEqual(5);
    expect(changes).toEqual(3);
    dispose();
  });
});
