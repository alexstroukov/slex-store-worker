/**
 * Wrapper class for the standard Worker which allows multiple onmessage handlers whilst maintaining the same API
 */
class SlexStoreWorker {
  constructor (path) {
    this._worker = new Worker(path)
    this._callbacks = {}
    this._setWorkerCallback({ callbackType: 'onmessageerror' })
    this._setWorkerCallback({ callbackType: 'onmessage' })
    this._setWorkerCallback({ callbackType: 'onerror' })
  }
  set onmessageerror (onmessageerror) {
    this._registerCallback({ callbackType: 'onmessageerror', callback: onmessageerror })
  }
  get onmessageerror () {
    return this._getCallback({ callbackType: 'onmessageerror' })
  }
  set onmessage (onmessage) {
    this._registerCallback({ callbackType: 'onmessage', callback: onmessage })
  }
  get onmessage () {
    return this._getCallback({ callbackType: 'onmessage' })
  }
  set onerror (onerror) {
    this._registerCallback({ callbackType: 'onerror', callback: onerror })
  }
  get onerror () {
    return this._getCallback({ callbackType: 'onerror' })
  }
  get postMessage () {
    return this._worker.postMessage.bind(this._worker)
  }
  get terminate () {
    return this._worker.terminate.bind(this._worker)
  }
  _setWorkerCallback = ({ callbackType }) => {
    this._worker[callbackType] = (...args) => {
      for (const registeredCallback of this._callbacks[callbackType]) {
        registeredCallback(...args)
      }
    }
  }
  _registerCallback = ({ callbackType, callback }) => {
    const callbacks = this._callbacks[callbackType] || []
    const nextCallbacks = [...callbacks, callback]
    this._callbacks[callbackType] = nextCallbacks
  }
  _getCallback = ({ callbackType }) => {
    return this._worker[callbackType]
  }
}

export default SlexStoreWorker
