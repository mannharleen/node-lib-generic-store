const { Mutex } = require('async-mutex');
const util = require('util');
const EventEmitter = require('events').EventEmitter

const supportedMethods = 'all,destroy,clear,length,get,set,touch'.split(',');
const supportedLockingMethods = 'set,get,destroy,touch'.split(','); // supportedLockingMethods will always have key as first arg and wait as last

/**
 * This is a generic implentation of a key-value store. 
 * It can be implemented using any 'session stores' that is compatible
 * with expressjs session middleware https://github.com/expressjs/session#compatible-session-stores
 */
class GenericStore {
    /**
     * 
     * @param {string} storeType
     * @param {Object} storeOptions      
     */
    constructor(storeType = '', storeOptions = {}) {
        // super()

        // advisory locking, at the object level & in memory only
        this.locks = {}     // {key: mutex}  // { key: { mutex: {}, waitQueue: [] } }

        this.storeType = storeType
        this.storeOptions = storeOptions

        try {
            require.resolve(storeType)
        } catch (e) {
            throw new Error(`The module could not be found. Try installing it first: npm install ${storeType}`)
        }

        let _Store = require(storeType)({ Store})
        this.store = new _Store(storeOptions)

        Object.setPrototypeOf(GenericStore.prototype, this.store.__proto__)

        let allMethods = getAllMethods(this.store)

        for (let f of allMethods) {
            if (supportedMethods.includes(f)) {
                // console.log('f + Prom for - ', f)
                // this[f + 'Prom'] = util.promisify(this.store[f]).bind(this.store)
                if (supportedLockingMethods.includes(f)) {
                    let p = util.promisify(this.store[f]).bind(this.store)

                    this[f + 'Prom'] = async (...args) => {
                        let key = args[0]
                        let mx = this.locks[key]

                        let wait
                        let checkIfWait = args.slice(-1)[0]
                        if (typeof checkIfWait === 'object' && Object.keys(checkIfWait).includes('wait')) {
                            wait = checkIfWait.wait
                            args = args.slice(0, -1)
                        } else {
                            wait = true
                        }

                        if (mx && mx.isLocked()) {
                            // already locked                            
                            if (wait) {
                                // wait
                                await mx.acquire()
                                // release as we are not locking it
                                await mx.release()
                                return p(...args)
                            } else {
                                // error out
                                throw new Error(`the resource with key is already locked: ${key}`)
                            }
                        }
                        else {
                            return p(...args)
                        }
                    }
                } else {
                    this[f + 'Prom'] = util.promisify(this.store[f]).bind(this.store)
                }
            }
        }

        // Placeholder for addnMethods if required to be added in the future
        // for (let f of addnMethods) {
        //     if (allMethods.includes(f)) {
        //         this[f + 'Prom'] = util.promisify(this.store[f]).bind(this.store)
        //     }
        // }
    } // constructor

    lockProm = async function (key, options = { wait: true }) {
        let mx = this.locks[key]
        let wait = options.wait
        if (mx && mx.isLocked()) {
            // already locked            
            if (wait) {
                // wait here
                await mx.acquire()
            } else {
                // error out
                throw new Error(`the resource with key is already locked: ${key}`)
            }
        } else {
            mx = new Mutex()
            this.locks[key] = mx
            await mx.acquire()
        }
        return new KV(this.store, key, mx, this.storeType, this.storeOptions)
    }

}

class KV {
    constructor(store, key, mutex, storeType, storeOptions) {
        // super()
        this.key = key
        this.mutex = mutex

        this.store = store
        Object.setPrototypeOf(KV.prototype, this.store.__proto__)

        let allMethods = getAllMethods(this.store)

        for (let f of allMethods) {
            if (supportedMethods.includes(f)) {
                if (supportedLockingMethods.includes(f)) {
                    this[f + 'Prom'] = util.promisify(this.store[f]).bind(this.store, this.key)
                } else {
                    this[f + 'Prom'] = util.promisify(this.store[f]).bind(this.store)
                }
            }
        }
    }

    unlockProm = async function () {
        // TODO: is releasr a sync method? if y, remove await
        await this.mutex.release()
        // delete this
    }
}

function getAllMethods(origObj) {
    var props = [];
    var obj = origObj;
    do {
        props = props.concat(Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));

    return props.sort().filter(function (e, i, arr) {
        if (e != arr[i + 1] && typeof origObj[e] == 'function') return true;
    });
}

/**
 * This is the Store class that is passed into every store upon initialization by express
 */
function Store() {
    EventEmitter.call(this)
}
util.inherits(Store, EventEmitter)

module.exports = GenericStore;