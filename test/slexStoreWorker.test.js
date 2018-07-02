import { expect } from 'chai'
import sinon from 'sinon'
import deepDiff from '../src/deepDiff'
import applyDiff from '../src/applyDiff'
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
  describe('createSyncForClientAction', function () {
    // const state1 = {}
    // const state1Changed = {}
    // const state2 = {}
    // const prevState = {
    //   state1,
    //   state2
    // }
    // const nextState = {
    //   state1: state1Changed,
    //   state2
    // }
    // let diffStub
    let action
    const payloadIsInitAction = true
    const payloadDifferences = {}
    const diffStubResult = []
    beforeEach(function () {
      // diffStub = sandbox.stub(deepDiff, 'diff').returns(diffStubResult)
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
    // it('should have differences from deep diff', function () {
    //   expect(action.differences).to.exist
    //   expect(action.differences).to.equal(diffStubResult)
    // })
    // it('should calculate deep diff only on the stores which have changed', function () {
    //   expect(action.differences).to.exist
    //   expect(diffStub.calledOnce).to.equal(true)
    //   const diffPrevPartialStateKeys = Object.keys(diffStub.firstCall.args[0])
    //   const diffNextPartialStateKeys = Object.keys(diffStub.firstCall.args[1])
    //   expect(diffPrevPartialStateKeys.length).to.equal(1)
    //   expect(diffNextPartialStateKeys.length).to.equal(1)
    //   expect(diffStub.firstCall.args[0][diffPrevPartialStateKeys[0]]).to.equal(state1)
    //   expect(diffStub.firstCall.args[1][diffNextPartialStateKeys[0]]).to.equal(state1Changed)
    // })
  })
  describe('createClientReducer', function () {
    const state1 = {}
    const state2 = {}
    const prevState = {
      state1,
      state2
    }
    const nextState = {
      state1,
      state2
    }
    let diffStub
    let applyDiffStub
    let createReducerStub
    let baseReducerStub
    const baseReducerStubResult = {}
    const payloadAction = {}
    const diffStubResult = []
    const applyDiffStubResult = {}
    beforeEach(function () {
      baseReducerStub = sandbox.stub().returns(baseReducerStubResult)
      createReducerStub = sandbox.stub(slexStore, 'createReducer').returns(baseReducerStub)
      applyDiffStub = sandbox.stub(applyDiff, 'applyDifferences').returns(applyDiffStubResult)
      diffStub = sandbox.stub(deepDiff, 'diff').returns(diffStubResult)
    })
    it('should return a function', function () {
      const reducer = slexStoreWorker.createClientReducer()
      expect(reducer).to.exist
      expect(typeof reducer === 'function').to.equal(true)
    })
    it('should return a reducer which applies differences when the action is a sync action', function () {
      const action = slexStoreWorker.createSyncForClientAction({ prevState, nextState, action: payloadAction })
      const reducer = slexStoreWorker.createClientReducer()
      const reduceResult = reducer(prevState, action)
      expect(reduceResult).to.equal(applyDiffStubResult)
    })
    it('should return a reducer which returns baseReducer result when the action is any action other than a sync action', function () {
      const action = {}
      const reducer = slexStoreWorker.createClientReducer()
      const reduceResult = reducer(prevState, action)
      expect(reduceResult).to.equal(baseReducerStubResult)
    })
  })
  describe('createClientDispatch', function () {
    const sideEffects = []
    const action = {}
    const prevState = {}
    const nextState = {}
    let reducer
    let worker
    let diffStub
    let createDispatchStub
    let applyDispatchStub
    let createDispatchStubResult
    let diffStubResult = []
    let appliedDispatchStubResult = {
      stateChanged: true,
      nextState
    }
    let createForwardActionToWorkerStoreSideEffectStub
    let createForwardActionToWorkerStoreSideEffectStubResult = {}
    beforeEach(function () {
      diffStub = sandbox.stub(deepDiff, 'diff').returns(diffStubResult)
      createForwardActionToWorkerStoreSideEffectStub = sandbox.stub(slexStoreWorker, 'createForwardActionToWorkerStoreSideEffect').returns(createForwardActionToWorkerStoreSideEffectStubResult)
      applyDispatchStub = sandbox.stub().returns(appliedDispatchStubResult)
      createDispatchStubResult = {
        reducer: sandbox.spy(),
        applyDispatch: sandbox.stub().returns(applyDispatchStub)
      }
      createDispatchStub = sandbox.stub(slexStore, 'createDispatch').returns(createDispatchStubResult)
      reducer = sandbox.spy()
      worker = new Worker('testUrl')
    })

    it('should createDispatch with slex-store', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        sideEffects
      })
      expect(createDispatchStub.calledOnce).to.be.true
    })
    it('should createDispatch with given reducer', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        sideEffects
      })
      expect(createDispatchStub.firstCall.args[0].reducer).to.equal(reducer)
    })
    // it('should createDispatch with given sideEffects', function () {
    //   const result = slexStoreWorker.createClientDispatch({
    //     worker,
    //     reducer,
    //     sideEffects
    //   })
    //   expect(createDispatchStub.firstCall.args[0].sideEffects).to.equal(sideEffects)
    // })
    it('should createForwardActionToWorkerStoreSideEffect and prefix the sideEffects with the created forwardActionToWorkerStoreSideEffect', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        sideEffects
      })
      expect(createForwardActionToWorkerStoreSideEffectStub.calledOnce).to.be.true
      expect(createDispatchStub.firstCall.args[0].sideEffects[0]).to.equal(createForwardActionToWorkerStoreSideEffectStubResult)
      expect(createDispatchStub.firstCall.args[0].sideEffects[1]).to.equal(sideEffects[0])
    })
    it('should return an object with applyDispatch which wraps the slex store applyDispatch', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        sideEffects
      })
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      expect(appliedDispatch).to.equal(applyDispatchStub)
      expect(result.reducer).to.equal(createDispatchStubResult.reducer)
    })
    it('should set worker onmessage callback', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        sideEffects
      })
      const event = {
        data: slexStoreWorker.createSyncForClientAction({ prevState, nextState, action })
      }
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      expect(worker.onmessage).to.exist
    })
    it('should dispatch sync action onmessage', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        sideEffects
      })
      const event = {
        data: slexStoreWorker.createSyncForClientAction({ differences: diffStubResult  })
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
      expect(dispatch.firstCall.args[0].differences).to.equal(diffStubResult)
    })
    it('should not dispatch anything onmessage when data is not sync action', function () {
      const result = slexStoreWorker.createClientDispatch({
        worker,
        reducer,
        sideEffects
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
    const sideEffects = []
    const prevState = {}
    const nextState = {}
    let reducer
    let workerGlobalContext
    let diffStub
    let createDispatchStub
    let applyDispatchStub
    let diffStubResult = [deepDiff.createDiffNew('test', 'test')]
    let createDispatchStubResult
    let appliedDispatchStubResult = {
      stateChanged: true,
      nextState
    }
    beforeEach(function () {
      diffStub = sandbox.stub(deepDiff, 'diff').returns(diffStubResult)
      applyDispatchStub = sandbox.stub().returns(appliedDispatchStubResult)
      createDispatchStubResult = {
        reducer: sandbox.spy(),
        applyDispatch: sandbox.stub().returns(applyDispatchStub)
      }
      createDispatchStub = sandbox.stub(slexStore, 'createDispatch').returns(createDispatchStubResult)
      reducer = sandbox.spy()
      workerGlobalContext = {
        addEventListener: sandbox.spy(),
        postMessage: sandbox.spy()
      }
    })
    it('should createDispatch with slex-store', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        reducer,
        sideEffects
      })
      expect(createDispatchStub.calledOnce).to.be.true
    })
    it('should createDispatch with given reducer', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        reducer,
        sideEffects
      })
      expect(createDispatchStub.firstCall.args[0].reducer).to.equal(reducer)
    })
    it('should createDispatch with given sideEffects', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        reducer,
        sideEffects
      })
      expect(createDispatchStub.firstCall.args[0].sideEffects).to.equal(sideEffects)
    })
    it('should return an object with the reducer returned by createDispatch', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        reducer,
        sideEffects
      })
      expect(result.reducer).to.equal(createDispatchStubResult.reducer)
    })
    it('should return an object with applyDispatch which wraps the slex store applyDispatch', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        reducer,
        sideEffects
      })
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      expect(createDispatchStubResult.applyDispatch.calledOnce).to.be.true
    })
    it('should return an object with applyDispatch which dispatches actions forwarded by client', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        reducer,
        sideEffects
      })
      const action = { type: 'SYNC_FOR_WORKER_STORE', action: {} }
      const event = {
        data: action
      }
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })

      expect(workerGlobalContext.addEventListener.calledOnce).to.be.true
      const workerForwardedActionEventHandler = workerGlobalContext.addEventListener.firstCall.args[1]
      workerForwardedActionEventHandler(event)
      expect(applyDispatchStub.calledOnce).to.be.true
      expect(applyDispatchStub.firstCall.args[0]).to.equal(action.action)
    })
    it('should return an object with applyDispatch which forwards slex-store appliedDispatch result', function () {
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        reducer,
        sideEffects
      })
      const action = {}
      const event = {
        data: action
      }
      const dispatch = sandbox.spy()
      const getState = sandbox.spy()
      const setState = sandbox.spy()
      const notifyListeners = sandbox.spy()
      const appliedDispatch = result.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const appliedDispatchResult = appliedDispatch(action)
      expect(appliedDispatchResult).to.equal(appliedDispatchStubResult)
    })
    it('should return an object with applyDispatch which has a side effect of notifying client about differences', function () {
      const createBufferedPostMessageStub = sandbox.stub(slexStoreWorker, 'createBufferedPostMessage')
        .returns(slexStoreWorker.createPostMessage({ workerGlobalContext }))
      const result = slexStoreWorker.createWorkerDispatch({
        workerGlobalContext,
        reducer,
        sideEffects
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
      debugger
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
