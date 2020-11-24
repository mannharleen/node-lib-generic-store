# node-lib-generic-store
This is a generic implentation of a key-value store. It can be implemented using any 'session stores' that are compatible with the expressjs framework's session [middleware](https://github.com/expressjs/session#compatible-session-stores) *.

\* We recommend the use of [connect-redis](https://www.npmjs.com/package/connect-redis) and is marked as a peer dependency for this library. Don't worry if you don't understand what this means.

## Why use node-lib-generic-store
The following benefits have been observed:
- Easily switch between different underlying stores. So you could start with a file system based store and later move to redis without changing your code
- Additional implentation of 'lock' and 'unlock' on any underlying store
- Promise based APIs

## Introduction
Calling the constructor like this:
```
let store = new GenericStore(storeType, storeOptions)
```
gets you a `store` object. This object supports:
- all the methods supported by the underlying storeType. eg. `store.get()`
- all these methods suffixed with **Prom** as a promisified version that are easier to use. e.g `store.getProm()`
- locking a key for exclusive access while others wait for it to be unclocked

## Usage

### Usage with file system based store
```js
;(async () => {
    // usage with file store:
    let storeType = 'session-file-store'    
    let storeOptions = {path: './_data'}

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

### Usage by locking
```js
;(async () => {
    // usage with file store:
    let storeType = 'session-file-store'    
    let storeOptions = {path: './_data'}

    // get the store object
    let store = new GenericStore(storeType, storeOptions)

    // now use promises to perform operations
    await store.setProm('0', {'a': 'value'})
    let kv = await store.lockProm('0')
    let length = await store.lengthProm() // = 1
    let data = await kv.getProm() // = {'a': 'value'}
})();
```

# APIs
- All APIs return promises
- options:
```
{ 
    wait: true  // is the key is locked, wait for it to be released
}
```

## General APIs

### store.allProm()
> Available only if suported by underlying stores

This method is used to get all key-value (kv) pairs in the store as an array.

### store.destoryProm(key, options)

This method is used to destroy/delete a kv from the store given a key.

### store.clearProm()
> Available only if suported by underlying stores

This method is used to delete all kvs from the store.

### store.lengthProm()
> Available only if suported by underlying stores

This method is used to get the count of all kvs in the store.

### store.getProm(key, options)

This method is used to get a session from the store given a key.

The value returned or in callback(err, value) is null or undefined if the key was not found (and there was no error). A special case is made when error.code === 'ENOENT' to act like callback(null, null).

### store.setProm(key, value, options)

This method is used to upsert a kv into the store

### store.touchProm(key, value, options)
> Available only if suported by underlying stores

This method is used to "touch" a given kv.

## Locking APIs

### store.lockProm(key, options)
Returns a KV object that acts like a mini-store with only one key-value in there. All General APIs that take in 'key' as the first parameter are supported. `Namely: kv.setProm, kv.getProm, kv.destroyProm, kv.touchProm`

### kv.setProm(value, options)
Same as store.setProm but operates on the key specified during store.lockProm

### kv.getProm(options)
Same as store.getProm but operates on the key specified during store.lockProm

### kv.destoryProm(options)
Same as store.destoryProm but operates on the key specified during store.lockProm

### kv.touchProm(value, options)
Same as store.touchProm but operates on the key specified during store.lockProm

> NOTE: If kv is used on any methods other than the ones mentioned here and if that method is supported by the underlying store, the method runs on the store instead of kv. e.g. kv.lengthProm() would be same as store.lengthProm() and return the same result

# License
MIT (c) 2020 harleen mann