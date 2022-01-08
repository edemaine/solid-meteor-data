import Benchmark from 'benchmark';
import {createMemo, createRoot, createSignal} from 'solid-js';
import {autoTracker} from '../autoTracker.js';

const stateChanges = 1000;

const solidBench = () => {
  createRoot((dispose) => {
    const [state, setState] = createSignal();
    const memo = createMemo(() => state());
    for (let i = 0; i < stateChanges; i++) {
      setState(i);
      memo();
    }
    dispose();
  });
};

test('benchmark', () => {
  new Benchmark.Suite()
  .add('manual mode', () => {
    solidBench();
  })
  .add('auto mode', () => {
    autoTracker();
    solidBench();
  })
  .on('cycle', (e) => console.log(e.target.toString()))
  .on('complete', function() {
    //console.log(`Fastest is ${this.filter('fastest').map('name')}`);
    console.log('Slowdown factor:', this[1].stats.mean / this[0].stats.mean);
  })
  .run({async: false});
});
