import slexStore from 'slex-store'
import deepDiff from './deepDiff'
import applyDiff from './applyDiff'
import { buffer, defer } from './utils'
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
  createSyncForClientAction = ({ differences, isInitAction, action }) => {
    return {
      type: 'SYNC_FOR_CLIENT_STORE',
      differences,
      isInitAction,
      react_slex_store_disconnected: _.get(action, 'react_slex_store_disconnected')
    }
  }
  calculateDifferences = ({ prevState = {}, nextState }) => {
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
  createClientDispatch = ({ worker, reducer, middleware = [], sideEffects = [], ...rest }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      middleware,
      sideEffects: [this.createForwardActionToWorkerStoreSideEffect({ worker }), ...sideEffects],
      ...rest
    })
    const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
      const appliedDispatch = createdDispatch.applyDispatch({ dispatch, getState, setState, notifyListeners })
      // receive forwarded action from worker
      worker.onmessage = event => {
        if (event.data.type === 'SYNC_FOR_CLIENT_STORE') {
          const action = event.data
          dispatch(action, { skipHooks: action.isInitAction })
          if (action.isInitAction) {
            this._initialSyncDeferred.resolve()
          }
        }
      }
      return appliedDispatch
    }
    return {
      applyDispatch: wrappedApplyDispatch,
      reducer: createdDispatch.reducer,
      ...rest
    }
  }
  prioritiseAction = (action) => {
    return {
      ...action,
      slex_store_worker_priority: true
    }
  }
  createWorkerDispatch = ({ workerGlobalContext, reducer, middleware = [], sideEffects = [] }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      middleware,
      sideEffects
    })
    const bufferedPostMessage = buffer((allDifferences) => {
      const differences = _.chain(allDifferences)
        .flatten()
        .reject(_.isUndefined)
        .value()
      if (differences && differences.length && differences.length > 0) {
        workerGlobalContext.postMessage(this.createSyncForClientAction({ differences }))
      }
    }, 100)
    const postMessage = ({ differences, action }) => {
      if (action.slex_store_worker_priority) {
        workerGlobalContext.postMessage(this.createSyncForClientAction({ action, differences }))
      } else {
        bufferedPostMessage(differences)
      }
    }
    const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
      const appliedDispatch = createdDispatch.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const wrappedAppliedDispatch = (action, options) => {
        const prevState = getState()
        const appliedResult = appliedDispatch(action, options)
        const isInitAction = action.type === slexStore.initialAction.type
        if (!isInitAction && appliedResult.stateChanged) {
          // notify client of new state
          const differences = this.calculateDifferences({ prevState, nextState: appliedResult.nextState })
          postMessage({ differences, action })
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
