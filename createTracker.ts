import {Tracker} from 'meteor/tracker';
import {createComputed, createSignal, onCleanup} from 'solid-js';
import type {Accessor} from 'solid-js';

// Type from react-meteor-data
export interface IReactiveFn<T> {
  (c?: Tracker.Computation): T
}

export const createTracker = <T = any>(reactiveFn: IReactiveFn<T>): Accessor<T> => {
  const [output, setOutput] = createSignal<T>();
  let computation: Tracker.Computation;
  createComputed(() => {
    if (computation) computation.stop();
    computation = Tracker.autorun((c) =>
      setOutput(() => reactiveFn(c)))
  });
  onCleanup(() => computation!.stop());
  return output as Accessor<T>; // initial undefined should be overwritten now
};
