function defer () {
  let resolve, reject, isComplete = false
  let promise = new Promise((promiseResolve, promiseReject) => {
    resolve = (...args) => {
      isComplete = true
      promiseResolve(...args)
    }
    reject = (...args) => {
      isComplete = true
      promiseReject(...args)
    }
  })
  return {
    isComplete,
    resolve,
    reject,
    promise
  }
}

function buffer (func, wait) {
  let timeout
  let actions = []
  let deferred = defer()
  return action => {
    actions = [...actions, action]
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      timeout = null
      deferred.resolve(func(actions))
      actions = []
      deferred = defer()
    }, wait)
    return deferred.promise
  }
}

export {
  buffer,
  defer
}