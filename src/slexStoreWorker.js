import slexStore from 'slex-store'
import deepDiff from './deepDiff'
import applyDiff from './applyDiff'
import { defer } from './utils'
import _ from 'lodash'

class SlexStoreWorker {
  _initialSyncDeferred = defer()
  deferUntilInitialSync = (fn) => {
    return (...args) => {
      return this._initialSyncDeferred.promise
        .then(() => {
          return fn(...args)
        })
    }
  }
  createWorkerResponseSideEffect = sideEffect => {
    return ({ prevState, nextState, action }) => {
      if (action.type === 'SYNC_FOR_CLIENT_STORE') {
        const forwardedAction = action.action
        if (forwardedAction) {
          return sideEffect({ prevState, nextState, action: forwardedAction })
        } else {
          return sideEffect({ prevState, nextState, action })
        }
      } else {
        return sideEffect({ prevState, nextState, action })
      }
    }
  }
  createSyncForClientAction = ({ prevState, nextState, action }) => {
    const differences = this._calculateDifferences({ prevState, nextState })
    return {
      type: 'SYNC_FOR_CLIENT_STORE',
      differences,
      action
    }
  }
  _calculateDifferences = ({ prevState = {}, nextState }) => {
    const partialState = _.pickBy(nextState, (value, key) => prevState[key] !== value)
    const prevPartialState = _.pick(prevState, _.keys(partialState))
    const differences = deepDiff.diff(prevPartialState, partialState)
    return differences
  }
  createSyncForWorkerAction = ({ prevState = {}, nextState, action, clientOnlyStores = ['form', 'route'] }) => {
    const partialState = _.pick(nextState, clientOnlyStores)
    return {
      type: 'SYNC_FOR_WORKER_STORE',
      partialState,
      action
    }
  }
  createClientReducer = (reducers) => {
    const baseReducer = slexStore.createReducer(reducers)
    return (state, action) => {
      switch (action.type) {
        case 'SYNC_FOR_CLIENT_STORE':
          return applyDiff.applyDifferences(action.differences, state)
        default:
          return baseReducer(state, action)
      }
    }
  }
  createForwardActionToWorkerStoreSideEffect = ({ worker }) => {
    // forward action to worker
    return ({ prevState, nextState, action }) => {
      if (action.type && action.type !== 'SYNC_FOR_CLIENT_STORE') {
        worker.postMessage(this.createSyncForWorkerAction({ prevState, nextState, action }))
      }
    }
  }
  createClientDispatch = ({ worker, reducer, middleware = [], sideEffects = [], blacklist = [] }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      middleware,
      sideEffects: [this.createForwardActionToWorkerStoreSideEffect({ worker }), ...sideEffects],
      blacklist
    })
    const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
      const appliedDispatch = createdDispatch.applyDispatch({ dispatch, getState, setState, notifyListeners })
      // receive forwarded action from worker
      worker.onmessage = event => {
        if (event.data.type === 'SYNC_FOR_CLIENT_STORE') {
          const action = event.data
          const { action: originalAction, nextState } = action
          const isInitAction = originalAction.type === slexStore.initialAction.type
          dispatch(action, { skipHooks: isInitAction })
          if (isInitAction) {
            this._initialSyncDeferred.resolve()
          }
        }
      }
      return appliedDispatch
    }
    return {
      applyDispatch: wrappedApplyDispatch,
      reducer: createdDispatch.reducer,
      blacklist: createdDispatch.blacklist
    }
  }
  createWorkerDispatch = ({ workerGlobalContext, reducer, middleware = [], sideEffects = [] }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      middleware,
      sideEffects
    })
    const postMessage = _.debounce(workerGlobalContext.postMessage, 100)
    const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
      const appliedDispatch = createdDispatch.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const wrappedAppliedDispatch = (action, options) => {
        const prevState = getState()
        const appliedResult = appliedDispatch(action, options)
        const isInitAction = action.type === slexStore.initialAction.type
        if (!isInitAction && appliedResult.stateChanged) {
          // notify client of new state
          postMessage(this.createSyncForClientAction({ prevState, nextState: appliedResult.nextState, action }))
        }
        return appliedResult
      }
      // dispatch action forwarded by client
      workerGlobalContext.addEventListener('message', event => {
        const action = event.data
        if (action && action.type && action.type === 'SYNC_FOR_WORKER_STORE') {
          const { partialState, action: forwardedAction } = action
          const prevState = getState()
          const prevPartialState = _.pick(prevState, _.keys(partialState))
          const differences = deepDiff.diff(prevPartialState, partialState)
          const nextState = applyDiff.applyDifferences(differences, prevState)
          const isInitAction = forwardedAction.type === slexStore.initialAction.type
          wrappedAppliedDispatch(forwardedAction, { skipHooks: isInitAction, appliedPrevState: nextState })
        }
      })
      return wrappedAppliedDispatch
    }
    return {
      applyDispatch: wrappedApplyDispatch,
      reducer: createdDispatch.reducer
    }
  }
}

export default new SlexStoreWorker()
