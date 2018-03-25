import slexStore from 'slex-store'
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
  createSyncAction = ({ action, nextState }) => {
    return {
      type: 'SYNC_WITH_WORKER_STORE',
      nextState,
      action
    }
  }
  createClientReducer = (reducers) => {
    const baseReducer = slexStore.createReducer(reducers)
    return (state, action) => {
      switch (action.type) {
        case 'SYNC_WITH_WORKER_STORE':
          return {
            ...state,
            ...action.nextState
          }
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
  createClientDispatch = ({ worker, reducer, middleware = [], sideEffects = [] }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      middleware: [this.createForwardActionToWorkerStoreMiddleware({ worker }), ...middleware],
      sideEffects
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
      reducer: createdDispatch.reducer
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
        const appliedResult = appliedDispatch(action)
        if (appliedResult.stateChanged) {
          // notify client of new state
          workerGlobalContext.postMessage(this.createSyncAction({ action, nextState: appliedResult.nextState }))
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
