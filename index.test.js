/**
 * @jest-environment node
 */

const GenericStore = require('./index');

test('invalid storeType will throw an error', async () => {
    let storeType = 'xxx'
    expect(() => new GenericStore(storeType)).toThrow(`The module could be found. Try installing it first: npm install ${storeType}`);
});

test('storeType = connect-redis', async () => {
    let storeType = 'connect-redis'
    const redis = require("redis-mock");
    let redisClient = redis.createClient()
    let storeOptions = {client: redisClient};

    let store = new GenericStore(storeType, storeOptions)
    
    await store.setProm('0', {'key': 'value'})
    let length = await store.lengthProm()
    expect(length).toBe(1)

    let data = await store.getProm('0')
    expect(data).toStrictEqual({'key': 'value'})
});

test('storeType = session-file-store', async () => {
    let storeType = 'session-file-store'    
    let storeOptions = {path: './_sessions'}

    let store = new GenericStore(storeType, storeOptions)
    
    await store.setProm('0', 'abc')
    await store.setProm('1', {'key': 'value'})
    let length = await store.lengthProm()
    expect(length).toBe(2)

    let data = await store.getProm('1')
    expect(data).toEqual(expect.objectContaining({'key': 'value'}))

    await store.destroyProm('0')
    await store.destroyProm('1')
    length = await store.lengthProm()
    expect(length).toBe(0)
});

test('storeType = session-file-store with addnMethods = get & key doesnt exist', async () => {
    let storeType = 'session-file-store'
    let storeOptions = {path: './_sessions'}

    let store = new GenericStore(storeType, storeOptions, ['get'])
    
    await store.setProm('2', {'a': 'value'})
    let length = await store.lengthProm()
    expect(length).toBe(1)

    let data = await store.getProm('2')
    expect(data).toEqual(expect.objectContaining({'a': 'value'}))

    await expect(store.getProm('99')).rejects.toThrow('s')
    await store.destroyProm('2')
});