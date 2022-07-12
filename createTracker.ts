import {Tracker} from 'meteor/tracker';
import {createMemo, createSignal, onCleanup} from 'solid-js';
import type {Accessor} from 'solid-js';

// Type from react-meteor-data
export interface IReactiveFn<T> {
  (c?: Tracker.Computation): T
}

export const mode = {
  auto: false,  // is autoTracker running?
};

export const createTracker = <T>(reactiveFn: IReactiveFn<T>): Accessor<T> => {
  if (mode.auto)
    return createMemo(() => reactiveFn());
  const [resettable, reset] = createSignal(undefined, {equals: false});
  return createMemo(() => {
    resettable(); // depend on reset signal
    let output: T;
    // Wrap this Tracker creation in nonreactive so it doesn't accidentally
    // get a parent Tracker (e.g. if SolidJS signal gets set within tracker).
    const computation = Tracker.nonreactive(() => Tracker.autorun((c) => {
      // Only run the function in first Tracker run, because only that run is
      // synchronous and thus in the correct SolidJS Listener context from
      // `createMemo`.  Future runs are executed within a `setImmediate`
      // context, so just reset in that case.
      if (c.firstRun) {
        output = reactiveFn(c);
      } else {
        Tracker.nonreactive(reset);
      }
    }));
    onCleanup(() => computation.stop());
    return output!; // initial undefined should be overwritten by firstRun
  });
};
