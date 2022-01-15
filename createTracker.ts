import {Tracker} from 'meteor/tracker';
import {createComputed, createMemo, createSignal, onCleanup} from 'solid-js';
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
  const [output, setOutput] = createSignal<T>();
  const [resettable, reset] = createSignal(undefined, {equals: false});
  let computation: Tracker.Computation;
  createComputed(() => {
    resettable(); // depend on reset signal
    if (computation) computation.stop();
    // Wrap this Tracker creation in nonreactive so it doesn't accidentally
    // get a parent Tracker (e.g. if SolidJS signal gets set within tracker).
    computation = Tracker.nonreactive(() => Tracker.autorun((c) => {
      // Only run the function in first Tracker run, because only that is run
      // in the correct Listener context of createComputed.  Future runs are
      // executed within a setImmediate context, so just reset in that case.
      if (c.firstRun) {
        // Only the call to reactiveFn should be done in Tracker; all SolidJS
        // signal setting needs to be explicitly not tracked because it can
        // end up immediately recalling this createComputed() function, which
        // would nest the new Tracker within the old one which gets stopped.
        const result = reactiveFn(c);
        Tracker.nonreactive(() => setOutput(() => result));
      } else {
        Tracker.nonreactive(reset);
      }
    }));
  });
  onCleanup(() => computation!.stop());
  return output as Accessor<T>; // initial undefined should be overwritten now
};
