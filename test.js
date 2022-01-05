import {createEffect, createRoot, createSignal} from 'solid-js';
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

  test('reacts to solid signals', () => {
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
});
