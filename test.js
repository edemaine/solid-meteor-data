import {createEffect, createRoot, createSignal} from 'solid-js';
import {ReactiveVar} from '@edemaine/meteor-tracker';

import {createTracker} from './createTracker';
//import {createFind, createSubscribe, createTracker} from '.';

const tick = () => new Promise((done) => setTimeout(done, 0));

describe('createTracker', () => {
  test('returns returned value', () => {
    createRoot(dispose => {
      const tracker = createTracker(() => 7);
      expect(tracker()).toEqual(7);
      dispose();
    });
  });

  test('reacts to solid signals instantly', () => {
    createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      const tracker = createTracker(() => signal());
      expect(tracker()).toEqual(1);
      setSignal(2);
      expect(tracker()).toEqual(2);
      setSignal(3);
      expect(tracker()).toEqual(3);
      dispose();
    });
  });

  test('effects react to solid signals', async () => {
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
    rv.set(3);
    await tick();
    expect(tracker()).toEqual(3);
    expect(changes).toEqual(3);
    dispose();
  });
});
