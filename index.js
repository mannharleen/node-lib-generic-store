const session = require('express-session');
const util = require('util');
const utils = require('./utils')

/**
 * This is a generic implentation of a key-value store. 
 * It can be implemented using any 'session stores' that is compatible
 * with expressjs session middleware https://github.com/expressjs/session#compatible-session-stores
 */
module.exports = class GenericStore {
    /**
     * 
     * @param {string} storeType
     * @param {Object} storeOptions 
     * @param {array} addnMethods should be an array that is used to add additional methods that 
     *                may be included by expressjs session in the future and not implemented by 
     *                this library yet
     */
    constructor(storeType = '', storeOptions = {}, addnMethods = []) {
        try {
            require.resolve(storeType)
        } catch (e) {            
            throw new Error(`The module could be found. Try installing it first: npm install ${storeType}`)
        }

        let Store = require(storeType)(session)
        let store = new Store(storeOptions)

        let supportedMethods = 'all,destroy,clear,length,get,set,touch'.split(',')
        let allMethods = getAllMethods(store)

        for (let f of allMethods) {            
            if (supportedMethods.includes(f)) {
                this[f + 'Prom'] = util.promisify(store[f]).bind(this)
            }            
        }

        for (let f of addnMethods) {
            if(allMethods.includes(f)) {
                this[f + 'Prom'] = util.promisify(store[f]).bind(this)
            }
        }        

        Object.setPrototypeOf(this, store)
    }

    promisifyIt(f) {
        // value of Object.getPrototypeOf(this) = store
        this[f + 'Prom'] = util.promisify(Object.getPrototypeOf(this)[f]).bind(this)
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
