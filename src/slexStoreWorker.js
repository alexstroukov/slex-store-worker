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
  createSyncForClientAction = ({ differences, isInitAction }) => {
    return {
      type: 'SYNC_FOR_CLIENT_STORE',
      differences,
      isInitAction
    }
  }
  calculateDifferences = ({ prevState = {}, nextState }) => {
    const partialState = _.pickBy(nextState, (value, key) => prevState[key] !== value)
    const prevPartialState = _.pick(prevState, _.keys(partialState))
    const differences = deepDiff.diff(prevPartialState, partialState)
    return differences
  }
  createSyncForWorkerAction = ({ prevState = {}, nextState, action }) => {
    return {
      type: 'SYNC_FOR_WORKER_STORE',
      nextState,
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
  createForwardActionToWorkerStoreSideEffect = ({ worker }) => ({ prevState, nextState, action }) => {
    if (action && action.type !== 'SYNC_FOR_CLIENT_STORE') {
      worker.postMessage(this.createSyncForWorkerAction({ prevState, nextState, action }))
    }
  }
  createClientDispatch = ({ worker, reducer, sideEffects = [], ...rest }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
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
  createBufferedPostMessage = ({ workerGlobalContext }) => buffer(this.createPostMessage({ workerGlobalContext }))
  createPostMessage = ({ workerGlobalContext }) => (allDifferences) => {
    const differences = _.chain(allDifferences)
      .flatten()
      .value()
    if (differences && differences.length && differences.length > 0) {
      workerGlobalContext.postMessage(this.createSyncForClientAction({ differences }))
    }
  }
  createWorkerDispatch = ({ workerGlobalContext, reducer, sideEffects = [] }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      sideEffects
    })
    const bufferedPostMessage = this.createBufferedPostMessage({ workerGlobalContext })
    const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
      const appliedDispatch = createdDispatch.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const wrappedAppliedDispatch = (action, options) => {
        const prevState = getState()
        const appliedResult = appliedDispatch(action, options)
        const isInitAction = action.type === slexStore.initialAction.type
        if (!isInitAction && appliedResult.stateChanged) {
          // notify client of new state
          const differences = this.calculateDifferences({ prevState, nextState: appliedResult.nextState })
          bufferedPostMessage(differences)
        }
        return appliedResult
      }
      // dispatch action forwarded by client
      workerGlobalContext.addEventListener('message', event => {
        const action = event.data
        if (action && action.type && action.type === 'SYNC_FOR_WORKER_STORE') {
          const { nextState, action: forwardedAction } = action
          const prevState = getState()
          const differences = deepDiff.diff(prevState, nextState)
          const appliedNextState = applyDiff.applyDifferences(differences, prevState)
          if (_.isArray(forwardedAction)) {
            const appliedDispatch = _.chain(forwardedAction)
              .flatten()
              .reduce((appliedDispatch, action) => {
                const { nextState } = appliedDispatch
                const isInitAction = action.type === slexStore.initialAction.type
                return wrappedAppliedDispatch(action, { skipHooks: isInitAction, appliedPrevState: nextState })
              }, { nextState: appliedNextState })
              .value()
            return appliedDispatch
          } else {
            const isInitAction = forwardedAction.type === slexStore.initialAction.type
            return wrappedAppliedDispatch(forwardedAction, { skipHooks: isInitAction, appliedPrevState: appliedNextState })
          }
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
