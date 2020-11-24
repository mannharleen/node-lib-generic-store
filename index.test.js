/**
 * @jest-environment node
 */

const GenericStore = require('./index');
const fs = require('fs');

describe('tests for invalid store', () => {
    test('should throw an error', async () => {
        let storeType = 'xxx'
        expect(() => new GenericStore(storeType)).toThrow(`The module could not be found. Try installing it first: npm install ${storeType}`);
    });
});

let store1;
describe('tests for redis-store', () => {
    beforeEach(async () => {
        let storeType = 'connect-redis'
        const redis = require("redis-mock");
        let redisClient = redis.createClient()
        let storeOptions = { client: redisClient };

        let store = new GenericStore(storeType, storeOptions)

        await store.setProm('0', { 'a': 0 })
        await store.setProm('1', { 'b': 1 })
        await store.setProm('2', { 'c': 2 })
        store1 = store
    });

    test('all methods happy path', async () => {
        let store = store1
        let length = await store.lengthProm()
        expect(length).toBe(3)

        // redis support .all while file-store doesnt
        await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ a: 0 })]))
        await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ b: 1 })]))
        await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ c: 2 })]))

        let data = await store.getProm('1')
        expect(data).toEqual(expect.objectContaining({ 'b': 1 }))

        await store.setProm('1', {})
        await expect(store.getProm('1')).resolves.toEqual(expect.objectContaining({}))

        await store.touchProm('1', { "a": 99 })
        await expect(store.getProm('1')).resolves.toEqual(expect.objectContaining({}))
        await expect(store.lengthProm()).resolves.toBe(3)

        await store.destroyProm('1')
        await expect(store.lengthProm()).resolves.toBe(2)

        // redis resolve to undefined while file-store rejects
        await expect(store.getProm('1')).resolves.toBe(undefined)

        await store.clearProm()
        expect(await store.lengthProm()).toBe(0)

    });
});

let store2;
describe('tests for file-store', () => {
    beforeEach(async () => {
        let storeType = 'session-file-store'
        let storeOptions = { path: './_data' }

        let store = new GenericStore(storeType, storeOptions)

        await store.setProm('0', { 'a': 0 })
        await store.setProm('1', { 'b': 1 })
        await store.setProm('2', { 'c': 2 })
        store2 = store
    });

    test('all methods happy path', async () => {
        let store = store2
        let length = await store.lengthProm()
        expect(length).toBe(3)

        // redis support .all while file-store doesnt
        // await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({a:0})]))
        // await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({b:1})]))
        // await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({c:2})]))

        let data = await store.getProm('1')
        expect(data).toEqual(expect.objectContaining({ 'b': 1 }))

        await store.setProm('1', {})
        await expect(store.getProm('1')).resolves.toEqual(expect.objectContaining({}))

        await store.touchProm('1', { "a": 99 })
        await expect(store.getProm('1')).resolves.toEqual(expect.objectContaining({}))
        await expect(store.lengthProm()).resolves.toBe(3)

        await store.destroyProm('1')
        await expect(store.lengthProm()).resolves.toBe(2)

        // redis resolve to undefined while file-store rejects
        await expect(store.getProm('1')).rejects.toThrow()

        await store.clearProm()
        expect(await store.lengthProm()).toBe(0)
    });

    test('get when key doesnt exist: error', async () => {
        let store = store2
        let data = await store.getProm('2')
        expect(data).toEqual(expect.objectContaining({ 'c': 2 }))

        await expect(store.getProm('99')).rejects.toThrow('s')
        await store.destroyProm('2')
    });
});

let store3;
describe('tests for file-store and kv', () => {
    beforeEach(async () => {
        fs.rmdirSync('./_data', { recursive: true });
        let storeType = 'session-file-store'
        let storeOptions = { path: './_data' }

        store = new GenericStore(storeType, storeOptions)

        await store.setProm('0', { 'a': 0 })
        await store.setProm('1', { 'b': 1 })
        await store.setProm('2', { 'c': 2 })
        store3 = store
    });

    test('all methods happy path', async () => {
        let store = store3

        let kv = await store.lockProm('0')

        // redis support .all while file-store doesnt
        // await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({a:0})]))
        // await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({b:1})]))
        // await expect(store.allProm()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({c:2})]))

        let value = await kv.getProm()
        expect(value).toEqual(expect.objectContaining({ 'a': 0 }))

        await kv.setProm({})
        await expect(kv.getProm()).resolves.toEqual(expect.objectContaining({}))

        await kv.touchProm({ "a": 99 })
        await expect(kv.getProm()).resolves.toEqual(expect.objectContaining({}))
        await expect(kv.lengthProm()).resolves.toBe(3)

        await kv.destroyProm()
        await expect(kv.lengthProm()).resolves.toBe(2)

        // redis resolve to undefined while file-store rejects
        await expect(kv.getProm()).rejects.toThrow()

        await kv.clearProm()
        expect(await kv.lengthProm()).toBe(0)

        await kv.unlockProm()
    });

    test('lock, increment, set, get ', async () => {
        let store = store3

        let kv = await store.lockProm('0', true)

        let data = await kv.getProm()
        data.a++
        await kv.setProm(data)
        await kv.unlockProm()

        data = await store.getProm('0')
        expect(data).toEqual(expect.objectContaining(data))

    });

    test('three locks for the same key: kv, kv1 & kv2. kv1.wait=false so throws. kv2.wait=true so waits', async () => {
        let store = store3

        let kv = await store.lockProm('0')
        let data = await kv.getProm()
        let kv1 = store.lockProm('0', {wait:false})
        await expect(kv1).rejects.toThrow('the resource with key is already locked: 0')
        
        let kv2 = store.lockProm('0')       

        await kv.unlockProm()
        return kv2.then(async (kv2) => {
            await expect(kv2.getProm()).resolves.toEqual(expect.objectContaining(data))
            await kv2.unlockProm()
        })
    });

    test('kv locks. store.get with store.wait=false so throw', async () => {
        let store = store3
        let kv = await store.lockProm('0', {wait:false})
  
        await expect(store.getProm('0', {wait: false})).rejects.toThrow('the resource with key is already locked: 0')

        await kv.unlockProm()
        await expect(store.getProm('0', {wait: false})).resolves.toEqual(expect.objectContaining({a: 0}))
    });
});

