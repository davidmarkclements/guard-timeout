'use strict'
const customPromisify = require('util').promisify.custom
const onTimeout = Symbol('safe-timeout')
const maxInt = Math.pow(2, 31) - 1

const defaults = {
  lagMs: 1000,
  rescheduler: (t) => t
}

function createSafeTimeout (opts = {}) {
  const { lagMs, rescheduler } = { ...defaults, ...opts }
  if (lagMs > maxInt) {
    throw Error('safe-timeout: lagMs must be (significantly) less than maxInt')
  }
  if (typeof rescheduler !== 'function') {
    throw Error('safe-timeout: rescheduler must be a function')
  }
  function safeTimeout (fn, t, ...args) {
    const gaurdTime = t + lagMs
    let maxLag = Date.now() + gaurdTime
    let timeout = setTimeout(handler, t, ...args)
    // v10
    const unrefed = Object.getOwnPropertySymbols(timeout).find((s) => /unrefed/.test(s.toString()))
    // v12
    const refed = Object.getOwnPropertySymbols(timeout).find((s) => /\(refed\)/.test(s.toString()))

    function handler (args = []) {
      if (Date.now() > maxLag) {
        maxLag = Date.now() + gaurdTime
        const unref = timeout[unrefed] === true
        const ref = refed in timeout ? timeout[refed] === true : true
        const rescheduledTime = rescheduler(t, timeout)
        timeout = setTimeout(handler, rescheduledTime, ...args)
        if (unref || !ref) {
          timeout.unref()
        }
        return
      }
      fn(...args)
    }

    timeout[onTimeout] = timeout._onTimeout
    Object.defineProperty(timeout, '_onTimeout', {
      get () {
        return this[onTimeout]
      },
      set (v) {
        if (v === null && this !== timeout) {
          clearTimeout(timeout)
        }
        return (this[onTimeout] = v)
      }
    })

    return timeout
  }

  safeTimeout[customPromisify] = (t) => {
    let r = null
    const timeout = safeTimeout(() => {
      r()
    }, t)
    const promise = new Promise((resolve) => {
      r = resolve
      return timeout
    })
    promise.timeout = timeout
    return promise
  }

  return safeTimeout
}

const safeTimeout = createSafeTimeout()
safeTimeout.create = createSafeTimeout

module.exports = safeTimeout
