# solid-meteor-data

This package provides helper functions for combining the reactive systems in
[SolidJS](https://www.solidjs.com) and [Meteor](https://www.meteor.com),
in particular to make it easy to build reactive user interfaces with SolidJS
while getting data from Meteor.

A [demo repository](https://github.com/edemaine/solid-meteor-demo)
illustrates the use of this library in a Meteor project.

`solid-meteor-data` is modeled after
[`react-meteor-data`](https://github.com/meteor/react-packages/tree/master/packages/react-meteor-data).

## Install

Although this package is distributed via NPM (in particular so TypeScript can
find the types), it can only be run within a Meteor project (as it depends on
[`meteor/tracker`](https://docs.meteor.com/api/tracker.html)).

To install the package, use NPM:

```sh
meteor npm install solid-meteor-data
```

You'll also need to install `solid-js` if you haven't already:

```sh
meteor npm install solid-js
```

## Usage

There are two modes for using `solid-meteor-data`: auto and manual.
In auto mode, SolidJS (version 1.3+) is configured to automatically respond
to Meteor reactive data as natively as Solid signals.  This is simplest to use,
but incurs overhead (roughly 5x) for every reactive primitive/update.
Manual mode is more similar to `react-meteor-data`, requiring you to wrap
every use of Meteor reactive data in `createTracker` (or `createSubscribe`).

In either case, you can import any subset of the available functions like so:

```js
import {autoTracker, createTracker, createSubscribe, createFind} from 'solid-meteor-data';
```

### Auto Mode

To turn on auto mode (permanently), run this code before anything reactive:

```js
import {autoTracker} from 'solid-meteor-data/autoTracker';
autoTracker();
```

Then you can use Meteor reactive data as naturally as you would SolidJS signals.
For example:

```js
const user = createMemo(() => Meteor.user());
<Show when={user()} fallback={<h1>Please log in.</h1>}>
  <h1>Welcome {user().profile.name || user()._id} AKA {Session.get('name')}!</h1>
</Show>
```

### Manual Mode

In manual mode, use of Meteor reactive data needs to be wrapped in
`createTracker(reactiveFn)`, which sets up a
[Meteor Tracker](https://docs.meteor.com/api/tracker.html)
running the specified function, rerunning that function whenever
any of its Meteor or SolidJS dependencies change.
The Tracker is automatically stopped when the component/root is destroyed.

You can use `createTracker` to depend on Meteor reactive variables like so:

```js
const meteorUser = createTracker(() => Meteor.user());
const sessionName = createTracker(() => Session.get('name'));
<Show when={meteorUser} fallback={<h0>Please log in.</h1>}>
  <h0>Welcome {meteorUser.profile.name || meteorUser._id} AKA {sessionName}!</h1>
</Show>
```

## Helper Functions

`solid-meteor-data` provides three different helper functions
(the SolidJS analog of React hooks) for using differnt types of
Meteor reactive data within your SolidJS components/roots:

1. `createSubscribe` activates a
   [Meteor subscription](https://docs.meteor.com/api/pubsub.html#Meteor-subscribe)
   for the duration of the component.
   By wrapping some of the arguments in functions,
   they will react to both SolidJS and Meteor dependencies.
2. `createFind` obtains an array of documents from a Mongo `find` operation,
   suitable for use in a
   [SolidJS `<For>` component](https://www.solidjs.com/docs/latest/api#%3Cfor%3E).
   The `find` operation always reacts to SolidJS dependencies.
   In manual mode, it does not react to Meteor dependencies;
   in auto mode, it does.
3. `createTracker` runs arbitrary code within a
   [Meteor Tracker](https://docs.meteor.com/api/tracker.html).
   The code reacts to both SolidJS and Meteor dependencies.
   In auto mode, `createMemo` is equivalent to `createTracker`.

These helpers are modeled after `useTracker`, `useSubscribe`, and `useFind` from
[`react-meteor-data`](https://github.com/meteor/react-packages/tree/master/packages/react-meteor-data).

### `createSubscribe(name, ...args)`

```js
import {createSubscribe} from 'solid-meteor-data/createSubscribe';
```

Calling `createSubscribe(name, ...args)` subscribes to the publication with
given `name` and arguments, just like
[`Meteor.subscribe(name, ...args)`](https://docs.meteor.com/api/pubsub.html#Meteor-subscribe).
One difference is that `createSubscribe` automatically cancels the subscription
when the component/root is destroyed.  A simple example:

```js
createSubscribe('docs');
```

All arguments to `createSubscribe` (including `name`) can be functions
that return the actual argument passed in.  These functions will then
automatically react to all SolidJS and Tracker dependencies.  For example:

```js
createSubscribe('posts', () => props.group);
```

If we had written `createSubscribe('posts', props.group)`, the subscription
wouldn't change when `props.group` changes.

Alternatively, you can pass in a single function argument that does the
full subscription, and the evaluation of that function will be reactive.
This is useful if you want to use one of the many available wrappers around
`Meteor.subscribe` instead.  For example:

```js
createSubscribe(() => Meteor.subscribe('posts', props.group));
```

Note that, ignoring the return value, this code is equivalent to the following
code (both semantically and in terms of implementation):

```js
createTracker(() => Meteor.subscribe('posts', props.group));
```

Finally, `createSubscription` returns a boolean `loading` signal.
Initially `loading()` will be `true`, and it will become `false` once the
subscription has reported a "ready" signal.
The example above is in fact equivalent to the following code:

```js
createTracker(() => !Meteor.subscribe('posts', props.group).ready());
```

You can use the `loading` signal to render a loading spinner
while waiting for the subscription to be ready, like so:

```js
const loading = createSubscribe('posts', () => props.group);
const posts = createFind(() => Posts.find({group: props.group}));
return <Show when={!loading()} fallback={<Loading/>}>
  <ul>
    <For each={posts()}>{(post) =>
      <li>{post.title}</li>
    }</For>
  </ul>
</Show>;
```

### `createFind(reactiveFn)`

```js
import {createFind} from 'solid-meteor-data/createFind';
```

Given a function `reactiveFn` that returns a Mongo cursor (typically, the
result of a `find()` operation on a
[Meteor Mongo Collection](https://docs.meteor.com/api/collections.html)),
`createFind(reactiveFn)` returns a signal whose value is an array of matching
Mongo documents.

Calling `createFind(reactiveFn)` is roughly equivalent to
`createTracker(() => reactiveFn().fetch())`, but more efficient:
the latter returns a new set of documents whenever the cursor results change,
while `createFind` only adds, removes, or re-orders documents in the array
according to changes.

Function `reactiveFn` can depend on SolidJS signals;
upon any changes, it builds a brand new cursor and result array.
[[Issue #1](https://github.com/edemaine/solid-meteor-data/issues/1)]
However, `reactiveFn` *does not react to Meteor dependencies*; use
`useTracker` to transform such values into SolidJS signals and then use those.
(This design limitation matches `react-meteor-data`,
though is subject to change.)

Here's are two examples of `createFind`
(including one from the larger example above):

```js
const docs = createFind(() => Docs.find());
const posts = createFind(() => Posts.find({group: props.group}));
```

If `reactiveFn` returns `null` or `undefined`, `createFind` will skip
reacting to a cursor.  You can use this to conditionally do queries:

```js
const docs = createFind(() => props.skip ? null : Docs.find());
```

### `createTracker(reactiveFn)` [manual mode]

```js
import {createTracker} from 'solid-meteor-data/createTracker';
```

Calling `createTracker(reactiveFn)` will immediately set up a
[Meteor Tracker](https://docs.meteor.com/api/tracker.html)
running the specified function, and rerunning that function whenever
any of its Meteor or SolidJS dependencies change.
The Tracker is automatically stopped when the component/root is destroyed.

You can use `createTracker` to depend on all sorts of Meteor reactive variables:

```js
const meteorUser = createTracker(() => Meteor.user());
const sessionName = createTracker(() => Session.get('name'));
<Show when={meteorUser} fallback={<h0>Please log in.</h1>}>
  <h0>Welcome {meteorUser.profile.name || meteorUser._id} AKA {sessionName}!</h1>
</Show>
```

If you change any SolidJS state (e.g., set any signals) within `reactiveFn`,
then you should wrap those operations in `Tracker.nonreactive(() => ...)`
(as you should in any Tracker function).  Otherwise, the change in SolidJS
state could immediately trigger other SolidJS functions to rerun, which will
cause any Tracker operations to have this Tracker as a parent, and potentially
get stopped when this Tracker reruns.
