# solid-meteor-data

This package provides helper functions for combining the reactive systems in
[SolidJS](https://www.solidjs.com) and [Meteor](https://www.meteor.com),
in particular to make it easy to build reactive user interfaces with SolidJS
while getting data from Meteor.

A [demo repository](https://github.com/edemaine/solid-meteor-demo)
illustrates the use of this library in a Meteor project.
Related, the [`edemaine:solid` plugin](https://github.com/edemaine/meteor-solid)
enables the SolidJS JSX compiler in Meteor, and
[`edemaine:solid-meteor-helper`](https://github.com/edemaine/meteor-solid-template-helper/tree/main)
enables use of SolidJS components within [Blaze](http://blazejs.org/) templates
(e.g. for gradual transitions from Blaze).

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
every use of Meteor reactive data in `createTracker` (or `createSubscribe`
or `createFindOne`).

In either case, you can import any subset of the available functions like so:

```js
import {autoTracker, createTracker, createSubscribe,
        createFind, createFindOne} from 'solid-meteor-data';
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
const user = createTracker(() => Meteor.user());
  // but see createFindOne for a potentially better way to use Meteor.user()
const sessionName = createTracker(() => Session.get('name'));
return (
  <Show when={user()} fallback={<h1>Please log in.</h1>}>
    <h1>Welcome {user().profile.name || user()._id}
        AKA {sessionName()}!</h1>
  </Show>
);
```

## Helper Functions

`solid-meteor-data` provides four different helper functions
(the SolidJS analog of React hooks) for using different types of
Meteor reactive data within your SolidJS components/roots:

1. `createSubscribe` activates a
   [Meteor subscription](https://docs.meteor.com/api/pubsub.html#Meteor-subscribe)
   for the duration of the component.
   By wrapping some of the arguments in functions,
   they will react to both SolidJS and Meteor dependencies.
2. `createFind` obtains an array of documents from a Mongo `find` operation,
   suitable for use in a
   [SolidJS `<For>` component](https://www.solidjs.com/docs/latest/api#%3Cfor%3E).
   The array is efficiently updated as the cursor results change,
   with support for fine-grained reactivity to individual documents.
   The `find` operation also always reacts to SolidJS dependencies.
   In manual mode, it does not react to Meteor dependencies
   except the cursor itself; in auto mode, it does.
3. `createFindOne` simplifies fine-grained reactivity
   for a single fetched document,
   as returned from a Mongo `findOne` operation or from `Meteor.user()`.
   The operation reacts to both SolidJS and Meteor dependencies.
4. `createTracker` runs arbitrary code within a
   [Meteor Tracker](https://docs.meteor.com/api/tracker.html).
   The code reacts to both SolidJS and Meteor dependencies.
   In auto mode, `createMemo` is equivalent to `createTracker`.

These helpers are modeled after `useTracker`, `useSubscribe`, and `useFind` from
[`react-meteor-data`](https://github.com/meteor/react-packages/tree/master/packages/react-meteor-data).

### `createSubscribe(name, ...args)`

```ts
import {createSubscribe} from 'solid-meteor-data/createSubscribe';

function createSubscribe(subscription:
  Meteor.SubscriptionHandle | (() => Meteor.SubscriptionHandle)
): (() => boolean);
function createSubscribe(
  name: string | (() => string),
  arg1?: any | (() => any),
  arg2?: any | (() => any), ...
): (() => boolean);
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
return (
  <Show when={!loading()} fallback={<Loading/>}>
    <ul>
      <For each={posts()}>{(post) =>
        <li>{post.title}</li>
      }</For>
    </ul>
  </Show>
);
```

### `createFind(reactiveFn)`

```ts
import {createFind} from 'solid-meteor-data/createFind';

function createFind<T extends object>(
  factory: () => (Mongo.Cursor<T> | undefined | null),
  options?: {
    noStore?: boolean;
    separate?: boolean;
  }
): () => Store<T>[];
```

Given a function `reactiveFn` that returns a Mongo cursor (typically, the
result of a `find()` operation on a
[Meteor Mongo Collection](https://docs.meteor.com/api/collections.html)),
`createFind(reactiveFn)` returns a signal whose value is an array of matching
Mongo documents.  By default, each Mongo document is represented as a read-only
[Solid Store](https://www.solidjs.com/docs/latest/api#stores), making it easy
to depend on specific parts of the document and only updating when those
specific parts change.  For example:

```js
const docs = createFind(() => Docs.find());
return (
  <For each={docs()}>{doc =>
    <h1>{doc.title}</h1>    <!--updates only when title changes-->
    <p>{doc.body}</p>       <!--updates only when body changes-->
  }</For>
);
```

If a document from the Mongo query gets modified (but its `_id` remains the
same), the existing component will get re-used, and just the changed parts
(`title` and/or `body`) will rerender.  If the query results just change
in order, the existing components will all get re-used and re-ordered.
Like component props in Solid, you shouldn't destructure documents
if you want to preserve reactivity.

If you don't want the overhead of Solid Stores, you can call
`createFind(reactiveFn, {noStore: true})`.  Then the signal value is an array
of documents as raw objects.  If only a few objects change, the others will
remain identical objects, so any existing components will get re-used
(thanks to `<For>`).  But if an object changes (e.g. in `title`), then the
component will get discarded and replaced by a new one, preventing
fine-grained reactivity within a component.

Calling `createFind(reactiveFn, {noStore: true})` is roughly equivalent to
`createTracker(() => reactiveFn().fetch())`, but more efficient:
the latter returns a new set of documents whenever the cursor results change,
while `createFind` only adds, removes, changes, or re-orders documents
in the array according to changes reported by Mongo/Meteor (e.g., from diffs
sent by the server to the client).  Multiple simultaneous changes are batched
together into one update to the array, so a `<For>` component will rerender
only once per batch.

Function `reactiveFn` can depend on SolidJS signals.  The documents of an
updated cursor will be matched up with the previous document set according to
the `_id` key, to prevent rerendering of common results (e.g. when just
re-ordering via a new `sort` order).  If you are conditionally doing finds
in different collections, and would rather treat each changed cursor as a
completely fresh search with no shared results, use
`createFind(reactiveFn, {separate: true})`.

However, unless in auto mode, `reactiveFn` *does not react to Meteor
dependencies*.  (This design limitation matches `react-meteor-data`,
though is subject to change.)
You can use `createTracker` to transform such values into SolidJS signals
and then use those, or switch to auto mode, where
`reactiveFn` can react to both SolidJS and Meteor dependencies.

If `reactiveFn` returns `null` or `undefined`, `createFind` will skip
reacting to a cursor.  You can use this to conditionally do queries:

```js
const docs = createFind(() => props.skip ? null : Docs.find());
```

### `createFindOne(reactiveFn)`

```ts
import {createFindOne} from 'solid-meteor-data/createFindOne';

function createFindOne<T extends object>(
  factory: () => T | undefined | null
): [() => boolean, Store<T | {}>];
```

Given a function `reactiveFn` that returns an object or `undefined`/`null`
(typically, the result of a `findOne()` operation on a
[Meteor Mongo Collection](https://docs.meteor.com/api/collections.html),
or a related helper like
[`Meteor.user()`](https://docs.meteor.com/api/accounts.html)),
`createFindOne(reactiveFn)` returns a pair `[exists, document]`
where

1. `exists` is a Boolean signal indicating whether `reactiveFn` returned an
   object (`exists() === true`) or `undefined`/`null` (`exists() === false`);
2. `document` is the returned object in a
   [Solid Store](https://www.solidjs.com/docs/latest/api#stores).
   If `exists() === false`, then `document` is an empty store
   (representing `{}`).

Roughly speaking, `createFindOne(reactiveFn)` is similar to
`createTracker(reactiveFn)`.  The key difference is that `createFindOne`
maintains the result in a Solid Store, enabling re-use of components that
have the entire document passed in as a prop and enabling fine-grained
reactivity to specific parts of the document.  In addition `createFindOne`
makes it easy to track whether a document was returned.

Here's an example using `Meteor.user()` to detect whether the user is logged
in, and to display the username.  If other properties of the user
(e.g. `Meteor.user().profile`) change, nothing will rerender.

```js
const [loggedIn, user] = createFindOne(() => Meteor.user());
return (
  <Show if={loggedIn()} fallback={<h1>Please log in.</h1>}>
    <h1>Welcome {user.username}!</h1>
  </Show>
);
```

### `createTracker(reactiveFn)` [manual mode]

```ts
import {createTracker} from 'solid-meteor-data/createTracker';

function createTracker<T>(
  reactiveFn: (c?: Tracker.Computation) => T
): () => T;
```

Calling `createTracker(reactiveFn)` will immediately set up a
[Meteor Tracker](https://docs.meteor.com/api/tracker.html)
running the specified function, and rerunning that function whenever
any of its Meteor or SolidJS dependencies change.
The Tracker is automatically stopped when the component/root is destroyed.

You can use `createTracker` to depend on all sorts of Meteor reactive variables:

```js
const user = createTracker(() => Meteor.user());
  // but see createFindOne for a potentially better way to use Meteor.user()
const sessionName = createTracker(() => Session.get('name'));
return (
  <Show when={user()} fallback={<h1>Please log in.</h1>}>
    <h1>Welcome {user().profile.name || user()._id}
        AKA {sessionName()}!</h1>
  </Show>
);
```

If you change any SolidJS state (e.g., set any signals) within `reactiveFn`,
then you should wrap those operations in `Tracker.nonreactive(() => ...)`
(as you should in any Tracker function).  Otherwise, the change in SolidJS
state could immediately trigger other SolidJS functions to rerun, which will
cause any Tracker operations to have this Tracker as a parent, and potentially
get stopped when this Tracker reruns.
