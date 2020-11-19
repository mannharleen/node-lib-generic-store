module.exports = {

    /**
     * return unix epoch in seconds
     */
    nowSec: () => Math.ceil((new Date()).getTime() / 1000),

    /**
     * 
     * @param {*} args 
     * @param {*} rules for each args.key
     */
    assertArgs: async function (args, rules) {
        if (rules instanceof RegExp) {
            if (!args.toString().match(rules)) {
                throw new Error(`Argument malformed: ${key}`)
            }
            return
        }

        for (let [key, regexp] of Object.entries(rules)) {

            if (typeof args[key] === 'object') {
                await this.assertArgs(args[key], regexp)
            }

            if (typeof args[key] == 'undefined') {
                throw new Error(`Argument missing: ${key}`)
            }

            if (!args[key].toString().match(regexp)) {
                throw new Error(`Argument malformed: ${key}`)
            }

        }
    }
}