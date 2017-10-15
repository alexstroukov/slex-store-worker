import { expect } from 'chai'
import sinon from 'sinon'
import workerStub from './workerStub'
import slexStore from 'slex-store'
import slexStoreWorker from '../src/slexStoreWorker'

describe('slexStoreWorker', function () {
  const sandbox = sinon.sandbox.create()
  let restoreWorker
  before(function () {
    restoreWorker = workerStub()
  })
  after(function () {
    restoreWorker()
  })
  beforeEach(function () {
    sandbox.restore()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('createSyncAction', function () {
    const nextState = {}
    it('should return an object', function () {
      const action = slexStoreWorker.createSyncAction({ nextState })
      expect(action).to.exist
      expect(typeof action === 'object').to.equal(true)
    })
    it('should have type SYNC_WITH_WORKER_STORE', function () {
      const action = slexStoreWorker.createSyncAction({ nextState })
      expect(action.type).to.exist
      expect(action.type).to.equal('SYNC_WITH_WORKER_STORE')
    })
    it('should have nextState', function () {
      const action = slexStoreWorker.createSyncAction({ nextState })
      expect(action.nextState).to.exist
      expect(action.nextState).to.equal(nextState)
    })
  
    // it('should dispatch an initialise action when created to allow reducers to provide an initial state for their store', function () {
    //   const initialState = {}
    //   const reducer = (state = initialState, action) => state
    //   const spyReducer = sandbox.spy(reducer)
    //   const store = createStore({
    //     reducers: {
    //       testStore: spyReducer
    //     }
    //   })
    //   expect(spyReducer.calledOnce).to.be.true
    //   expect(spyReducer.firstCall.args[0]).to.equal(undefined)
    //   expect(spyReducer.firstCall.args[1]).to.equal(initialAction)
    //   expect(store.getState().testStore).to.equal(initialState)
    // })
  })

  describe('createClientReducer', function () {
    it('should return a function', function () {
      const reducer = slexStoreWorker.createClientReducer()
      expect(reducer).to.exist
      expect(typeof reducer === 'function').to.equal(true)
    })
    it('should return a reducer which returns nextState when the action is a sync action', function () {
      const state = {}
      const nextState = {}
      const action = slexStoreWorker.createSyncAction({ nextState })
      const reducer = slexStoreWorker.createClientReducer()
      const reduceResult = reducer(state, action)
      expect(reduceResult).to.equal(nextState)
    })
    it('should return a reducer which returns nextState when the action is any action other than a sync action', function () {
      const state = {}
      const nextState = {}
      const action = {}
      const reducer = slexStoreWorker.createClientReducer()
      const reduceResult = reducer(state, action)
      expect(reduceResult).to.equal(state)
    })
  })
  describe('createClientWorker', function () {
    const url = 'testUrl'
    const reducer = sandbox.spy()
    it('should return a worker', function () {
      const worker = slexStoreWorker.createClientWorker({ url })
      expect(worker).to.exist
      expect(worker instanceof global.Worker).to.equal(true)
    })
  })
  describe('createClientDispatch', function () {
    const middleware = [{}]
    const sideEffects = []
    let reducer
    let worker
    let createDispatchStub
    let createDispatchStubResult = {}
    let createForwardActionToWorkerStoreMiddlewareStub
    let createForwardActionToWorkerStoreMiddlewareStubResult = {}
    beforeEach(function () {
      createForwardActionToWorkerStoreMiddlewareStub = sandbox.stub(slexStoreWorker, 'createForwardActionToWorkerStoreMiddleware').returns(createForwardActionToWorkerStoreMiddlewareStubResult)
      createDispatchStub = sandbox.stub(slexStore, 'createDispatch').returns(createDispatchStubResult)
      reducer = sandbox.spy()
      worker = slexStoreWorker.createClientWorker({ url: 'testUrl' })
    })
    it('should createDispatch with slex-store', function () {
      debugger
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        middleware,
        sideEffects
      })
      expect(createDispatchStub.calledOnce).to.be.true
      expect(createDispatchStubResult).to.equal(createDispatchStubResult)
    })
    it('should createDispatch with given reducer', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        middleware,
        sideEffects
      })
      expect(createDispatchStub.firstCall.args[0].reducer).to.equal(reducer)
    })
    it('should createDispatch with given sideEffects', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        middleware,
        sideEffects
      })
      expect(createDispatchStub.firstCall.args[0].sideEffects).to.equal(sideEffects)
    })
    it('should createForwardActionToWorkerStoreMiddleware and prefix the middleware with the created forwardActionToWorkerStoreMiddleware', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        middleware,
        sideEffects
      })
      expect(createForwardActionToWorkerStoreMiddlewareStub.calledOnce).to.be.true
      expect(createDispatchStub.firstCall.args[0].middleware[0]).to.equal(createForwardActionToWorkerStoreMiddlewareStubResult)
      expect(createDispatchStub.firstCall.args[0].middleware[1]).to.equal(middleware[0])
    })
  })
})
