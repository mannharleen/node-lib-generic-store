# node-lib-generic-store
Universal Store is a generic implentation of a key-value store. It can be implemented using any 'session stores' that are compatible with the expressjs framework's session [middleware](https://github.com/expressjs/session#compatible-session-stores) *.

\* We recommend the use of [connect-redis](https://www.npmjs.com/package/connect-redis) and is marked as a peer dependency for this library. Don't worry if you don't understand what this means.

## Why use node-lib-generic-store
The following benefits have been observed:
- Easily switch between different underlying stores. So you could start with a file system based store and later move to redis without changing your code
- Additional implentation of 'lock' and 'unlock' on any underlying store
- Promise based APIs

## What it does
Calling the constructor like this:
```
let store = new GenericStore(storeType, storeOptions)
```
gets you a `store` object. This object supports:
- all the methods supported by the underlying storeType
- all these methods suffixed with `Prom` as a promisified version that are easier to use

## Usage

### Usage with file system based store
```js
;(async () => {
    // usage with file store:
    let storeType = 'session-file-store'    
    let storeOptions = {path: './_sessions'}

    // get the store object
    let store = new GenericStore(storeType, storeOptions)

    // now use promises to perform operations
    await store.setProm('0', {'a': 'value'})
    let length = await store.lengthProm() // = 1
    let data = await store.getProm('0') // = {'a': 'value'}
})();

```

### Usage with redis based store
```js
;(async () => {
    // usage with redis:
    let storeType = 'connect-redis'
    const redis = require("redis-mock"); // can be any of redis, ioredis or redis-mock. refer to their docs for options
    let redisClient = redis.createClient()
    let storeOptions = {client: redisClient};

    // get the store object
    let store = new GenericStore(storeType, storeOptions)

    // now use promises to perform operations
    await store.setProm('0', {'a': 'value'})
    let length = await store.lengthProm() // = 1
    let data = await store.getProm('0') // = {'a': 'value'}
})();

```

## General API

> General APIs:
This module supports all the methods/operations that are supported by the underlying store type.

> Special APIs: There are also `special apis` that are supported by generic-store. See the next section 'Special API'

### store.all(callback) | store.allProm()
> Optional: Not required to be supported by underlying store type

This optional method is used to get all key-value (kv) pairs in the store as an array.

### store.destroy(key, callback) | store.destoryProm(key)
> Required to be supported by underlying store type

This required method is used to destroy/delete a kv from the store given a key.

### store.clear(callback) | store.clearProm()
> Optional

This optional method is used to delete all kvs from the store.

### store.length(callback) | store.lengthProm()
> Optional

This optional method is used to get the count of all kvs in the store.

### store.get(key, callback) | store.getProm(key)
> Required

This required method is used to get a session from the store given a key.

The value returned or in callback(err, value) is null or undefined if the key was not found (and there was no error). A special case is made when error.code === 'ENOENT' to act like callback(null, null).

### store.set(key, value, callback) | store.setProm(key, value)
> Required

This required method is used to upsert a kv into the store

### store.touch(key, value, callback) | store.touchProm(key, value)
> Optional

This recommended method is used to "touch" a given kv. The callback should be called as callback(error) once the session has been touched.

This is primarily used when the store will automatically delete idle sessions and this method is used to signal to the store the given session is active, potentially resetting the idle timer.

## Special API

### store.lock()
> Special


