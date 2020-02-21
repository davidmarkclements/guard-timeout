'use strict'
const { promisify } = require('util')
const { test } = require('tap')
const safeTimeout = require('.')

const lag = (ms) => {
  const start = Date.now()
  while (start + ms > Date.now()) {}
}

test('schedules a new timeout if timeout triggers after default lagMs time', ({ ok, end }) => {
  const start = Date.now()
  setTimeout(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 100)
    ok(delta < 2000)
  }, 100)
  safeTimeout(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 1100)
    end()
  }, 100)
  lag(1150)
})

test('create safeTimeout, custom lagMs', ({ ok, end }) => {
  const customSafeTimeout = safeTimeout.create({ lagMs: 500 })
  const start = Date.now()
  setTimeout(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 100)
    ok(delta < 720)
  }, 100)
  customSafeTimeout(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 600)
    ok(delta < 1000)
    end()
  }, 100)
  lag(600)
})

test('create safeTimeout, custom rescheduler', ({ ok, plan }) => {
  plan(5)
  const customSafeTimeout = safeTimeout.create({
    lagMs: 500,
    rescheduler: (t, tInst) => {
      ok(tInst === instance)
      return t / 10
    }
  })
  const start = Date.now()
  setTimeout(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 100)
    ok(delta < 720)
  }, 100)
  const instance = customSafeTimeout(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 150)
    ok(delta < 720)
  }, 100)
  lag(600)
})

test('clearTimeout works even when timeout is rescheduled', ({ ok, end, fail }) => {
  const start = Date.now()
  setTimeout(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 100)
    ok(delta < 2000)
    setTimeout(() => {
      clearTimeout(instance)
    }, 0)
    setTimeout(end, 2000) // give safe timeout time to refire
  }, 100)
  const instance = safeTimeout(() => {
    fail('safeTimeout should not fire')
  }, 100)
  lag(1150)
})

test('promisified safe timeout', ({ ok, end }) => {
  const start = Date.now()
  setTimeout(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 100)
    ok(delta < 2000)
  }, 100)
  const safe = promisify(safeTimeout)
  const p = safe(100)
  p.then(() => {
    const now = Date.now()
    const delta = now - start
    ok(delta >= 1100)
    end()
  }, 100)
  lag(1150)
  setTimeout(() => {}, 200)
})
