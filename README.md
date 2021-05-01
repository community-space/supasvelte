# Supasvelte - reactive bindings for Supabase in Svelte

⚠ **Very much Alpha stuff... so use in production at your own risk** ⚠️

This library is used for wrapping a limited subset of the Supabase API in reactive bindings that expose custom Svelte stores. The library provides constructors that let you build these stores:

* `makeSessionStore()` - constructs a store that follows signin state;
* `makeRegistrationStore()` constructs a store that follows signup state;
* `makeRecordStore(table)` - constructs a store that exposes CRUD operations for records of a table;
* `makeQueryStore(table, query, trigger="*")` - constructs a store that mimics a view, i.e. updates its data in realtime to reflect query results;

When you use these constructors, you receive a store that has a `.state` attribute intended for use in Svelte component logic (e.g. `{#if session.state === 'signed-in'}`) and a `.data` attribute store relevant data (e.g. `email = session.data.user.email` or the `error` object when in `'error'` state). This *should* allow you to easily build reactive and persistent logic with Supabase and Svelte.

You shift the store state by using its methods, which wrap the `supabase` methods. For example, you would call a `session.signin(email, password)` method to trigger a signin event which also updates `$session.state` to `'signed-in'`. These methods return data in a similar way as the `supabase` API, which means you can use them in more traditional ways (e.g. `{#await}`) while still keeping the store state correct.

## Usage

To get started, first initialize a Supabase client and pass it to Supasvelte to initialize constructors for your client:

```js
import { createClient } from '@supabase/supabase-js';
import { makeConstructors } from 'supasvelte';

export let supabase = createClient(url, key);
export let {
    makeSessionStore,
    makeRegistrationStore,
    makeRecordStore,
    makeQueryStore 
    } = makeConstructors(supabase);
```

Notes that the `supabase` client doesn't need to be exported for `supasvelte`; export it if you need to do things this library cannot;

Logging level can be configured by setting `makeConstructors(supabase, {log: '<log level>})` where `<log level>` is `silent`, `error`, `info`, `log` or `verbose`. Currently there is no difference between the last two levels.

Now that you have store constructors for your Supabase client, you can create your own custom reactive Supabase stores.

### Session

The `$session` store is used to reactively track users' login sessions. It uses `supabase.auth.onAuthStateChange` ([see Supabase docs](https://supabase.io/docs/reference/javascript/auth-onauthstatechange)) to keep itself updated regard user session data. If [this feature request]() is accepted, this would synchronize user state accross tabs automatically, but currently it will just work within a tab.

**Setup:**
```js
const session = makeSessionStore();
```

**Data:**
* `$session.state` - either `signed-out`, `signed-in` or `error`;
* `$session.data` - when in `signed-in` state - holds the [session data]() which `gotrue-js` passes the `supabase` client; notably, this contains the `user` object.

**Methods:**
 * `session.signin(email, password)` - signs the user in and returns `{ user, error }` 
 * `session.signout()` - signs the user out and returns `{ error }`
 * `session.reset()` - resets the state machine to `signed-out` and clears data (this can be used in the event of an error)

### Registration

The `$registration` store is used to reactively track signup events. 

**Setup:**
```js
const registration = makeRegistrationStore();
```

**Data:**
 * `$registration.state` - either `idle`, `pending`, `success` or `error`;
 * `$registration.data` - when in `success` state, holds the user credentials just created;

**Methods:**
 * `registration.signup(email, password)` - signs the user up and returns `{ user, error }`
 * `registration.reset()` - resets the state machine to `idle` and clears data (this can be used in the event of an error)

### Record

The `$record` store is used to run CRUD operations on *single* records in a table. The record is identified by using the `supabase` API's `.match()` function ([see Supabase docs](https://supabase.io/docs/reference/javascript/match)), so all of this store's methods expect a `record` pattern object, for example `{id: 23}` or `{firstName: "Bob", lastName: "Saget"}`.

The store uses a special `checkRecord` method internally to ensure you are only changing one record at a time, and fails with an error otherwise.

**Setup:**
```js
const record = createRecordStore(table);
```

**Data:**
 * `$record.state` - either `idle`, `pending`, `success` or `error`;
 * `$record.data` - when in `success` state, holds the data returned by `supabase`;

**Methods:**
 * `record.create` - create a record and returns `{ data, error }`;
 * `record.read` - read a record and returns `{ data, error }`;
 * `record.update` - update a record and returns `{ data, error }`;
 * `record.delete` - delete a record and returns `{ data, error }`;

### Query

The `$query` store is used to reactively update data in a component to reflect results of a query. The query is restricted to the string accepted by the `supabase` API's `.or` filter ([see Supabase docs](https://supabase.io/docs/reference/javascript/or)). But that is flexible enough to perform quite a few matching queries.

This store leverages a Realtime subscription for reactivity; you can select the types of events you want to trigger store's refresh ([see Supabase docs](https://supabase.io/docs/reference/javascript/subscribe)) This means it requeries whenever a triggering change occurs in the effected table.

**Setup:**
```js
const query = makeQueryStore(table, query, trigger)
```

**Data:**
 * `$query.state` - either `idle`, `pending`, `success` or `error`;
 * `$query.data` - when in `success` or `pending` modes, shows the latest query results;

**Methods:**
  * `query.fetch()` - triggers the query and returns `{ data, error }`

⚠ **Performance of this store is probably not great for tables getting a lot of updates. TODO: investigate how to allow the user to ensure updates are triggered a sane amount of times.**

## Developing

PRs? Yes please! Try to keep them inline with the philosophy of the library:

 1. `supasvelte` focuses on providing *constructors* that help users create *stores* that deliver *reactive* interfaces to their Supabase instance in Svelte;
 2. The `supabase` client comes from the user, to ensure they can always work around this library if needed (so lets not try and manage it ourselves here);
 3. Logging should be consistent across the board;


## Support

Drop an issue in [the Github repo](https://github.com/coflow-network/supasvelte) or find me lurking in [the Svelte Discord server](https://discord.com/channels/457912077277855764/457912077277855766) as Ixxie or at the [Supabase Slack server](https://app.slack.com/client/TS93YE5NV/C0185CM23RV) as Matan.

## Disclaimer

As mentioned, this is very much alpha stuff. Also, keep in mind I am a noob and I have no idea what I am doing (been working with Javascript only for a few months and I am not a Software Engineer by training).