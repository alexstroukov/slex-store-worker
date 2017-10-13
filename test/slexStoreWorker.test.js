import { expect } from 'chai'
import sinon from 'sinon'
import {
  initialAction,
  createStore
} from '../src/slexStore'

describe('slexStore', function () {
  const sandbox = sinon.sandbox.create()
  beforeEach(function () {
    sandbox.restore()
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('createStore', function () {
    it('should return an object', function () {
      const store = createStore({})
      expect(store).to.exist
      expect(typeof store === 'object').to.equal(true)
    })
    it('should have dispatch function', function () {
      const store = createStore({})
      expect(store.dispatch).to.exist
      expect(typeof store.dispatch === 'function').to.equal(true)
    })
    it('should have getState function', function () {
      const store = createStore({})
      expect(store.dispatch).to.exist
      expect(typeof store.getState === 'function').to.equal(true)
    })
    it('should have subscribe function', function () {
      const store = createStore({})
      expect(store.dispatch).to.exist
      expect(typeof store.subscribe === 'function').to.equal(true)
    })
    it('should dispatch an initialise action when created to allow reducers to provide an initial state for their store', function () {
      const initialState = {}
      const reducer = (state = initialState, action) => state
      const spyReducer = sandbox.spy(reducer)
      const store = createStore({
        reducers: {
          testStore: spyReducer
        }
      })
      expect(spyReducer.calledOnce).to.be.true
      expect(spyReducer.firstCall.args[0]).to.equal(undefined)
      expect(spyReducer.firstCall.args[1]).to.equal(initialAction)
      expect(store.getState().testStore).to.equal(initialState)
    })
  })

  describe('middleware', function () {
    it('should be triggered in the order it was registered', function () {
      const action = { type: 'testAction' }
      const middleware1 = (dispatch, getState, action) => action
      const middleware2 = (dispatch, getState, action) => action
      const spyMiddleware1 = sandbox.spy(middleware1)
      const spyMiddleware2 = sandbox.spy(middleware2)
      const store = createStore({
        middleware: [
          spyMiddleware1,
          spyMiddleware2
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spyMiddleware1.called).to.be.true
      expect(spyMiddleware2.called).to.be.true
      expect(spyMiddleware1.calledBefore(spyMiddleware2)).to.be.true
    })
    it('should be provided the action from the previous middleware', function () {
      const action = { type: 'testAction' }
      const middleware1Action = { type: 'middleware1Action' }
      const middleware1 = (dispatch, getState, action) => middleware1Action
      const middleware2 = (dispatch, getState, action) => action
      const spyMiddleware1 = sandbox.spy(middleware1)
      const spyMiddleware2 = sandbox.spy(middleware2)
      const store = createStore({
        middleware: [
          spyMiddleware1,
          spyMiddleware2
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spyMiddleware1.called).to.be.true
      expect(spyMiddleware2.called).to.be.true
      expect(spyMiddleware2.firstCall.args[2]).to.equal(middleware1Action)
    })
    it('should be provided the action', function () {
      const action = { type: 'testAction' }
      const middleware = (dispatch, getState, action) => {
        return action
      }
      const spyMiddleware = sandbox.spy(middleware)
      const store = createStore({
        middleware: [
          spyMiddleware
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spyMiddleware.firstCall.args[2]).to.equal(action)
    })
    it('should be provided dispatch', function () {
      const action = { type: 'testAction' }
      const middleware = (dispatch, getState, action) => action
      const spyMiddleware = sandbox.spy(middleware)
      const store = createStore({
        middleware: [
          spyMiddleware
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spyMiddleware.firstCall.args[0]).to.equal(store.dispatch)
    })
    it('should be provided getState', function () {
      const action = { type: 'testAction' }
      const middleware = (dispatch, getState, action) => action
      const spyMiddleware = sandbox.spy(middleware)
      const store = createStore({
        middleware: [
          spyMiddleware
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spyMiddleware.firstCall.args[1]).to.equal(store.getState)
    })
  })

  describe('sideEffects', function () {
    it('should be triggered in the order they were registered', function () {
      const action = { type: 'testAction' }
      const sideEffect1 = ({ prevState, nextState, action, dispatch }) => action
      const sideEffect2 = ({ prevState, nextState, action, dispatch }) => action
      const spySideEffect1 = sandbox.spy(sideEffect1)
      const spySideEffect2 = sandbox.spy(sideEffect2)
      const store = createStore({
        sideEffects: [
          spySideEffect1,
          spySideEffect2
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spySideEffect1.called).to.be.true
      expect(spySideEffect2.called).to.be.true
      expect(spySideEffect1.calledBefore(spySideEffect2)).to.be.true
    })
    it('should be provided the state before and after the reduction of a dispatched action', function () {
      const initialState = {}
      const reducedState = {}
      const action = { type: 'testAction' }
      const reducer = (state = initialState, action) => {
        switch (action.type) {
          case 'testAction':
            return reducedState
          default:
            return state
        }
      }
      const spyReducer = sandbox.spy(reducer)
      const sideEffect = ({ prevState, nextState, action, dispatch }) => action
      const spySideEffect = sandbox.spy(sideEffect)
      const store = createStore({
        reducers: {
          testStore: spyReducer
        },
        sideEffects: [
          spySideEffect
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spySideEffect.called).to.be.true
      expect(spySideEffect.firstCall.args[0].prevState.testStore).to.equal(initialState)
      expect(spySideEffect.firstCall.args[0].nextState.testStore).to.equal(reducedState)
    })
    it('should provided the action', function () {
      const action = { type: 'testAction' }
      const sideEffect = ({ prevState, nextState, action, dispatch }) => {
        return
      }
      const spySideEffect = sandbox.spy(sideEffect)
      const store = createStore({
        sideEffects: [
          spySideEffect
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spySideEffect.firstCall.args[0].action).to.equal(action)
    })
    it('should be provided dispatch', function () {
      const action = { type: 'testAction' }
      const sideEffect = ({ prevState, nextState, action, dispatch }) => action
      const spySideEffect = sandbox.spy(sideEffect)
      const store = createStore({
        sideEffects: [
          spySideEffect
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)

      expect(spySideEffect.called).to.be.true
      expect(spySideEffect.firstCall.args[0].dispatch).to.equal(store.dispatch)
    })
  })

  describe('reducers', function () {
    it('should be triggered when an action is dispatched', function () {
      const initialState = {}
      const action = { type: 'testAction' }
      const reducer = (state = initialState, action) => {
        return state
      }
      const spyReducer = sandbox.spy(reducer)
      const store = createStore({
        reducers: {
          testStore: spyReducer
        }
      })
      store.subscribe(() => {})
      store.dispatch(action)
      // twice because of initial action
      expect(spyReducer.calledTwice).to.be.true
    })
    it('should be provided the action', function () {
      const initialState = {}
      const action = { type: 'testAction' }
      const reducer = (state = initialState, action) => {
        return state
      }
      const spyReducer = sandbox.spy(reducer)
      const store = createStore({
        reducers: {
          testStore: spyReducer
        }
      })
      store.subscribe(() => {})
      store.dispatch(action)
      // twice because of initial action
      expect(spyReducer.secondCall.args[1]).to.equal(action)
    })
    it('should provide the next state for their store', function () {
      const reducedState = {}
      const action = { type: 'testAction' }
      const reducer = (state, action) => {
        return reducedState
      }
      const spyReducer = sandbox.spy(reducer)
      const store = createStore({
        reducers: {
          testStore: spyReducer
        }
      })
      store.subscribe(() => {})
      store.dispatch(action)
      expect(store.getState().testStore).to.equal(reducedState)
    })
  })

  describe('dispatch', function () {
    it('should trigger middleware, reducers, then sideEffects in that order', function () {
      const action = { type: 'testAction' }
      const spyReducer = sandbox.spy()
      const spyMiddleware = sandbox.spy()
      const spySideEffect = sandbox.spy()
      const store = createStore({
        middleware: [
          spyMiddleware
        ],
        reducers: {
          testStore: spyReducer
        },
        sideEffects: [
          spySideEffect
        ]
      })
      store.subscribe(() => {})
      store.dispatch(action)
      // twice because of initial action
      expect(spyMiddleware.calledOnce).to.be.true
      expect(spyMiddleware.firstCall.calledBefore(spyReducer.secondCall)).to.be.true

      expect(spyReducer.calledTwice).to.be.true
      expect(spyReducer.secondCall.calledAfter(spyMiddleware.firstCall)).to.be.true
      expect(spyReducer.secondCall.calledBefore(spySideEffect.firstCall)).to.be.true

      expect(spySideEffect.calledOnce).to.be.true
      expect(spySideEffect.firstCall.calledAfter(spyReducer.secondCall)).to.be.true
    })
  })

  describe('getState', function () {
    it('should return the state of the store', function () {
      const initialState1 = {}
      const initialState2 = {}
      const action = { type: 'testAction' }
      const createReducer = initialState => (state = initialState, action) => state
      const spyReducer1 = sandbox.spy(createReducer(initialState1))
      const spyReducer2 = sandbox.spy(createReducer(initialState2))
      const store = createStore({
        reducers: {
          testStore1: spyReducer1,
          testStore2: spyReducer2
        }
      })
      store.subscribe(() => {})
      store.dispatch(action)
      expect(store.getState().testStore1).to.equal(initialState1)
      expect(store.getState().testStore2).to.equal(initialState2)
    })
  })

  describe('array actions', function () {
    it('should reduce each of the actions in the array in the order they are provided', function () {
      const arrayAction1 = {}
      const arrayAction2 = {}
      const arrayAction3 = {}
      const action = [arrayAction1, arrayAction2, arrayAction3]
      const reducer = (state, action) => state
      const reducerSpy = sandbox.spy(reducer)
      const store = createStore({
        reducers: {
          testStore: reducerSpy
        }
      })
      store.subscribe(() => {})
      store.dispatch(action)
      // first is initial, next should be the array actions, then finally its the array itself
      expect(reducerSpy.callCount).to.equal(5)
      expect(reducerSpy.args[1][1]).to.equal(arrayAction1)
      expect(reducerSpy.args[2][1]).to.equal(arrayAction2)
      expect(reducerSpy.args[3][1]).to.equal(arrayAction3)
    })
  })

  describe('function actions', function () {
    it('should execute the thunk with dispatch and getState', function () {
      const action = sandbox.spy()
      const reducer = (state, action) => state
      const reducerSpy = sandbox.spy(reducer)
      const store = createStore({
        reducers: {
          testStore: reducerSpy
        }
      })
      store.subscribe(() => {})
      store.dispatch(action)
      expect(reducerSpy.callCount).to.equal(2)
      expect(action.calledOnce).to.be.true
      expect(action.firstCall.args[0]).to.equal(store.dispatch)
      expect(action.firstCall.args[1]).to.equal(store.getState)
    })
    it('should promisify dispatch when returning a promise', function () {
      const action = (dispatch, getState) => Promise.resolve()
      const reducer = (state, action) => state
      const reducerSpy = sandbox.spy(reducer)
      const store = createStore({
        reducers: {
          testStore: reducerSpy
        }
      })
      store.subscribe(() => {})
      const promisiviedResult = store.dispatch(action)
      expect(promisiviedResult.then).to.exist
    })
  })
})
