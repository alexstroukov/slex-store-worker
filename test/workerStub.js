import sinon from 'sinon'
export default function stubWorker () {
  const originalWorker = global.Worker
  global.Worker = class {
    onmessage = undefined
    postMessage = sinon.spy()
  }
  return function restoreWorker () {
    global.Worker = originalWorker
  }
}