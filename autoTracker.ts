import {Tracker} from 'meteor/tracker';
import {enableExternalSource} from 'solid-js';
import {mode} from './createTracker';

export const autoTracker = () => {
  if (mode.auto) return;  // already enabled: don't re-install

  enableExternalSource(<Prev, Next>(fn: (x: Prev) => Next, trigger: () => void) => {
    let computation: Tracker.Computation;
    return {
      track: (x: Prev) => {
        let next: Next;
        // If Solid state changes, will get multiple track() calls.
        if (computation) computation.stop();
        // Wrap this Tracker creation in nonreactive so it doesn't accidentally
        // get a parent Tracker (e.g. if SolidJS signal changes within tracker).
        computation = Tracker.nonreactive(() =>
          Tracker.autorun(() => next = fn(x))
        );
        computation.onInvalidate(() => {
          if (computation.stopped) return;  // stop() triggers onInvalidate()
          computation.stop();  // prevent invalidation from recomputing
          Tracker.nonreactive(trigger);  // tell Solid that deps have changed
        });
        return next!;
      },
      dispose: () => {
        computation.stop();
      }
    };
  });

  // Prevent createTracker from creating redundant Trackers
  mode.auto = true;
};
