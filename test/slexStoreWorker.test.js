import { expect } from 'chai'
import sinon from 'sinon'
import deepDiff from '../src/deepDiff'
import applyDiff from '../src/applyDiff'
import workerStub from './workerStub'
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
  describe('createSyncForClientAction', function () {
    let action
    const payloadIsInitAction = true
    const payloadDifferences = {}
    beforeEach(function () {
      action = slexStoreWorker.createSyncForClientAction({ differences: payloadDifferences, isInitAction: payloadIsInitAction })
    })
    it('should return an object', function () {
      expect(action).to.exist
      expect(typeof action === 'object').to.equal(true)
    })
    it('should have type SYNC_FOR_CLIENT_STORE', function () {
      expect(action.type).to.exist
      expect(action.type).to.equal('SYNC_FOR_CLIENT_STORE')
    })
    it('should have provided differences', function () {
      expect(action.differences).to.exist
      expect(action.differences).to.equal(payloadDifferences)
    })
    it('should have provided isInitAction', function () {
      expect(action.isInitAction).to.exist
      expect(action.isInitAction).to.equal(payloadIsInitAction)
    })
  })
  describe('createClientReducer', function () {
    const state = {}
    let baseReducerStub
    let applyDiffStub
    const baseReducerStubResult = {}
    const applyDiffStubResult = {}
    beforeEach(function () {
      baseReducerStub = sandbox.stub().returns(baseReducerStubResult)
      applyDiffStub = sandbox.stub(applyDiff, 'applyDifferences').returns(applyDiffStubResult)
    })
    it('should return a function', function () {
      const reducer = slexStoreWorker.createClientReducer()
      expect(reducer).to.exist
      expect(typeof reducer === 'function').to.equal(true)
    })
    it('should return a reducer which applies differences when the action is a sync action', function () {
      const action = slexStoreWorker.createSyncForClientAction({})
      const reducer = slexStoreWorker.createClientReducer()
      const reduceResult = reducer(state, action)
      expect(reduceResult).to.equal(applyDiffStubResult)
    })
    it('should return a reducer which returns baseReducer result when the action is any action other than a sync action', function () {
      const action = {}
      const reducer = slexStoreWorker.createClientReducer(baseReducerStub)
      const reduceResult = reducer(state, action)
      expect(reduceResult).to.equal(baseReducerStubResult)
    })
  })
  describe('createClientDispatch', function () {
    const applyDispatchStubResult = {}
    const appliedDispatchStubResult = sandbox.stub().returns(applyDispatchStubResult)
    let worker
    let diffStub
    let createDispatchStub
    let applyDispatchStub
    let createDispatchStubResult
    let createForwardActionToWorkerStoreSideEffectStubResult = {}
    beforeEach(function () {
      applyDispatchStub = sandbox.stub().returns(appliedDispatchStubResult)
      createDispatchStubResult = {
        applyDispatch: sandbox.stub().returns(applyDispatchStub)
      }
      worker = new Worker('testUrl')
    })
    it('should return an object with applyDispatch which wraps the given applyDispatch', function () {
      const action = {}
      const result = slexStoreWorker.createClientDispatch({
        worker,
        applyDispatch: applyDispatchStub
      })
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const appliedDispatchResult = appliedDispatch(action)
      expect(appliedDispatchResult).to.equal(applyDispatchStubResult)
    })
    it('should set worker onmessage callback', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        applyDispatch: applyDispatchStub
      })
      const event = {
        data: slexStoreWorker.createSyncForClientAction({})
      }
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      expect(worker.onmessage).to.exist
    })
    it('should dispatch sync action onmessage', function () {
      const differences = []
      const isInitAction = false
      const result = slexStoreWorker.createClientDispatch({
        worker,
        applyDispatch: applyDispatchStub
      })
      const event = {
        data: slexStoreWorker.createSyncForClientAction({ differences, isInitAction })
      }
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      expect(worker.onmessage).to.exist
      worker.onmessage(event)
      expect(dispatch.calledOnce).to.be.true
      expect(dispatch.firstCall.args[0].type).to.equal('SYNC_FOR_CLIENT_STORE')
      expect(dispatch.firstCall.args[0].differences).to.equal(differences)
      expect(dispatch.firstCall.args[0].isInitAction).to.equal(isInitAction)
    })
    it('should not dispatch anything onmessage when data is not sync action', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        applyDispatch: applyDispatchStub
      })
      const event = {
        data: {}
      }
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      expect(worker.onmessage).to.exist
      worker.onmessage(event)
      expect(dispatch.notCalled).to.be.true
    })
  })
  describe('createWorkerDispatch', function () {
    const applyDispatchStubResult = { stateChanged: true, prefState: {}, nextState: {} }
    const appliedDispatchStubResult = sandbox.stub().returns(applyDispatchStubResult)
    let diffStub
    let applyDispatchStub
    let createDispatchStubResult
    let workerGlobalContext
    let diffStubResult = [deepDiff.createDiffNew('test', 'test')]

    beforeEach(function () {
      diffStub = sandbox.stub(deepDiff, 'diff').returns(diffStubResult)
      applyDispatchStub = sandbox.stub().returns(appliedDispatchStubResult)
      createDispatchStubResult = {
        reducer: sandbox.spy(),
        applyDispatch: sandbox.stub().returns(applyDispatchStub)
      }
      workerGlobalContext = {
        addEventListener: sandbox.spy(),
        postMessage: sandbox.spy()
      }
    })
    it('should return an object with applyDispatch which wraps the given applyDispatch', function () {
      const action = {}
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        applyDispatch: applyDispatchStub
      })
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const appliedDispatchResult = appliedDispatch(action)
      expect(appliedDispatchResult).to.equal(applyDispatchStubResult)
    })
    it('should return an object with applyDispatch which dispatches actions forwarded by client', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        applyDispatch: applyDispatchStub
      })
      const action = {}
      const event = {
        data: { type: 'SYNC_FOR_WORKER_STORE', action: {} }
      }
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const appliedDispatchResult = appliedDispatch(action)
      expect(workerGlobalContext.addEventListener.calledOnce).to.be.true
      const workerForwardedActionEventHandler = workerGlobalContext.addEventListener.firstCall.args[1]
      const dispatchResult = workerForwardedActionEventHandler(event)
      expect(applyDispatchStub.calledOnce).to.be.true
      expect(applyDispatchStub.firstCall.args[0].dispatch).to.equal(dispatch)
      expect(applyDispatchStub.firstCall.args[0].getState).to.equal(getState)
      expect(applyDispatchStub.firstCall.args[0].setState).to.equal(setState)
      expect(applyDispatchStub.firstCall.args[0].notifyListeners).to.equal(notifyListeners)
    })
    it('should return an object with applyDispatch which forwards provided appliedDispatch result', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        applyDispatch: applyDispatchStub
      })
      const action = {}
      const event = {
        data: { type: 'SYNC_FOR_WORKER_STORE', action: {} }
      }
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const appliedDispatchResult = appliedDispatch(action)
      expect(workerGlobalContext.addEventListener.calledOnce).to.be.true
      const workerForwardedActionEventHandler = workerGlobalContext.addEventListener.firstCall.args[1]
      const dispatchResult = workerForwardedActionEventHandler(event)
      expect(dispatchResult).to.equal(appliedDispatchResult)
    })
    it('should return an object with applyDispatch which has a side effect of notifying client about differences which resulted in reducing the action from client store', function () {
      const createBufferedPostMessageStub = sandbox.stub(slexStoreWorker, 'createBufferedPostMessage')
        .returns(slexStoreWorker.createPostMessage({ workerGlobalContext }))
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        applyDispatch: applyDispatchStub
      })
      const action = {}
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      appliedDispatch(action)
      expect(workerGlobalContext.postMessage.calledOnce).to.be.true
      expect(workerGlobalContext.postMessage.firstCall.args[0].type).to.equal('SYNC_FOR_CLIENT_STORE')
      expect(workerGlobalContext.postMessage.firstCall.args[0].differences.length).to.equal(diffStubResult.length)
      expect(workerGlobalContext.postMessage.firstCall.args[0].differences[0]).to.equal(diffStubResult[0])
    })
  })
  describe('createForwardActionToWorkerStoreSideEffect', function () {
    let worker
    let dispatchStub
    let getStateStub
    const action = { type: 'createForwardActionToWorkerStoreSideEffectTest' }
    const syncAction = slexStoreWorker.createSyncForClientAction({})
    beforeEach(function () {
      dispatchStub = sandbox.stub()
      getStateStub = sandbox.stub()
      worker = {
        postMessage: sandbox.spy()
      }
    })
    it('should return a function', function () {
      const sideEffect = slexStoreWorker.createForwardActionToWorkerStoreSideEffect({ worker })
      expect(sideEffect).to.exist
      expect(typeof sideEffect === 'function').to.equal(true)
    })
    it('should return a sideEffect which syncs actions to worker', function () {
      const createSyncForWorkerActionStubResult = {}
      const createSyncForWorkerActionStub = sandbox.stub(slexStoreWorker, 'createSyncForWorkerAction').returns(createSyncForWorkerActionStubResult)
      const sideEffect = slexStoreWorker.createForwardActionToWorkerStoreSideEffect({ worker })
      sideEffect({ dispatch: dispatchStub, getState: getStateStub, action })
      expect(worker.postMessage.calledOnce).to.be.true
      expect(worker.postMessage.firstCall.args[0]).to.equal(createSyncForWorkerActionStubResult)
    })
    it('should return a sideEffect which ignores sync actions', function () {
      const sideEffect = slexStoreWorker.createForwardActionToWorkerStoreSideEffect({ worker })
      sideEffect({ dispatch: dispatchStub, getState: getStateStub, action: syncAction })
      expect(worker.postMessage.called).to.be.false
    })
  })
})
