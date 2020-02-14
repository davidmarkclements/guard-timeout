'use strict'
const customPromisify = require('util').promisify.custom
const maxInt = Math.pow(2, 31) - 1

const defaults = {
  lagMs: 1000,
}

function createSafeTimeout (opts = defaults) {
  const { lagMs } = opts
  if (lagMs > maxInt) {
    throw Error('safe-timeout: lagMs must be (significantly) less than maxInt')
  }
  function safeTimeout (fn, t, ...args) {
    const gaurdTime = t + lagMs
    const maxLag = Date.now() + gaurdTime

    let timeout = setTimeout(handler, t, ...args)
    // v12
    const unrefed = Object.getOwnPropertySymbols(timeout).find((s) => /unrefed/.test(s.toString())) 
    // v10
    const refed = Object.getOwnPropertySymbols(timeout).find((s) => /\(refed\)/.test(s.toString())) 
    
    function handler (args) {
      if (Date.now() > maxLag) {
        const unref = timeout[unrefed] === true
        const ref = timeout[refed] === true
        timeout = setTimeout(handler, t, ...args)
        if (unref || !ref) timeout.unref()
        return
      }
      fn(...args)
    }

    return timeout
  }

  safeTimeout[customPromisify] = (t) => {
    const promise = new Promise((r) => {
      const timeout = safeTimeout(r, t)
      return timeout
    })
    return promise
  }

  return safeTimeout
}

const safeTimeout = createSafeTimeout()
safeTimeout.create = createSafeTimeout

module.exports = safeTimeout