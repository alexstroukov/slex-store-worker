import { expect } from 'chai'
import sinon from 'sinon'
import { createSyncAction, createClientReducer, createClientDispatch, createWorkerDispatch } from '../src/slexStoreWorker'

describe('slexStoreWorker', function () {
  const sandbox = sinon.sandbox.create()
  beforeEach(function () {
    sandbox.restore()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('createSyncAction', function () {
    const nextState = {}
    it('should return an object', function () {
      const action = createSyncAction({ nextState })
      expect(action).to.exist
      expect(typeof action === 'object').to.equal(true)
    })
  })

})
