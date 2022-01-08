import {createEffect, createRoot, createSignal} from 'solid-js';
import {ReactiveVar} from 'meteor/reactive-var';

//import {createFind, createSubscribe, createTracker} from '.';

const tick = () => new Promise((done) => setTimeout(done, 0));

describe('autoTracker', () => {
  test('effects react to Solid signals', async () => {
    let changes = 0;
    const {dispose, setSignal} = createRoot(dispose => {
      const [signal, setSignal] = createSignal(1);
      createEffect(() => {
        signal(); // depend on tracker
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

  test('effects react to Tracker', async () => {
    let rv = new ReactiveVar(1);
    let changes = 0, current;
    const {dispose} = createRoot(dispose => {
      createEffect(() => {
        current = rv.get(); // depend on rv
        changes++;
      });
      return {dispose};
    });
    expect(changes).toEqual(1);
    expect(current).toEqual(1);
    await tick();
    expect(changes).toEqual(1);
    expect(current).toEqual(1);
    rv.set(2);
    await tick();
    expect(changes).toEqual(2);
    expect(current).toEqual(2);
    rv.set(2);
    await tick();
    expect(changes).toEqual(2);
    expect(current).toEqual(2);
    rv.set(3);
    await tick();
    expect(changes).toEqual(3);
    expect(current).toEqual(3);
    dispose();
  });

});
