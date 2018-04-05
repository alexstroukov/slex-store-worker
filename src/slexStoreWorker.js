import slexStore from 'slex-store'
import deepDiff from './deepDiff'
import applyDiff from './applyDiff'
import _ from 'lodash'

class SlexWorkerStoreModule {
  createWorkerResponseMiddleware = middleware => {
    return ({ prevState, nextState, action }) => {
      if (action.type === 'SYNC_WITH_WORKER_STORE') {
        const forwardedAction = action.action
        if (forwardedAction) {
          return middleware({ prevState, nextState, action: forwardedAction })
        } else {
          return middleware({ prevState, nextState, action })
        }
      } else {
        return middleware({ prevState, nextState, action })
      }
    }
  }
  createSyncAction = ({ prevState = {}, nextState, action }) => {
    const partialState = _.pickBy(nextState, (value, key) => prevState[key] !== value)
    const prevPartialState = _.pick(prevState, _.keys(partialState))
    const differences = deepDiff.diff(prevPartialState, partialState) //, (path, key) => false)
    return {
      type: 'SYNC_WITH_WORKER_STORE',
      differences,
      action
    }
  }
  createClientReducer = (reducers) => {
    const baseReducer = slexStore.createReducer(reducers)
    return (state, action) => {
      switch (action.type) {
        case 'SYNC_WITH_WORKER_STORE':
          return applyDiff.applyDifferences(action.differences, state)
        default:
          return baseReducer(state, action)
      }
    }
  }
  createForwardActionToWorkerStoreMiddleware = ({ worker }) => {
    // forward action to worker
    return function forwardActionToWorkerStoreMiddleware (dispatch, getState, action) {
      if (action.type && action.type !== 'SYNC_WITH_WORKER_STORE') {
        worker.postMessage(action)
      }
    }
  }
  createClientDispatch = ({ worker, reducer, middleware = [], sideEffects = [], blacklist = [] }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      middleware: [this.createForwardActionToWorkerStoreMiddleware({ worker }), ...middleware],
      sideEffects,
      blacklist
    })
    const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
      const appliedDispatch = createdDispatch.applyDispatch({ dispatch, getState, setState, notifyListeners })
      // receive forwarded action from worker
      worker.onmessage = event => {
        if (event.data.type === 'SYNC_WITH_WORKER_STORE') {
          const action = event.data
          const { action: originalAction, nextState } = action
          dispatch(action)
        }
      }
      return appliedDispatch
    }
    return {
      applyDispatch: wrappedApplyDispatch,
      reducer: createdDispatch.reducer,
      blacklist: createdDispatch.blacklist
    }
    return createdDispatch
  }
  createWorkerDispatch = ({ workerGlobalContext, reducer, middleware = [], sideEffects = [] }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      middleware,
      sideEffects
    })
    const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
      const appliedDispatch = createdDispatch.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const wrappedAppliedDispatch = action => {
        const prevState = getState()
        const appliedResult = appliedDispatch(action)
        if (appliedResult.stateChanged) {
          // notify client of new state
          workerGlobalContext.postMessage(this.createSyncAction({ prevState, nextState: appliedResult.nextState, action }))
        }
        return appliedResult
      }
      // dispatch action forwarded by client
      workerGlobalContext.addEventListener('message', event => {
        const action = event.data
        wrappedAppliedDispatch(action)
      })
      return wrappedAppliedDispatch
    }
    return {
      applyDispatch: wrappedApplyDispatch,
      reducer: createdDispatch.reducer
    }
  }
}

export default new SlexWorkerStoreModule()
