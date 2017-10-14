import createSlexStore, { createDispatch, createReducer } from 'slex-store'

export const createSyncAction = ({ nextState }) => {
  return {
    type: 'SYNC_WITH_WORKER_STORE',
    nextState
  }
}

export function createClientReducer () {
  return (state, action) => {
    switch (action.type) {
      case 'SYNC_WITH_WORKER_STORE':
        return action.nextState
      default:
        return state
    }
  }
}

export function createClientDispatch ({ worker, reducer, middleware = [], sideEffects = [] }) {
  // dispatch action to replace store with one received from worker
  worker.onmessage = function workerStoreReceived (event) {
    const nextState = event.data
    store.dispatch(createSyncAction({ nextState }))
  }
  // forward action to worker
  function forwardActionToWorkerStoreMiddleware (dispatch, getState, action) {
    if (action.type && action.type !== 'SYNC_WITH_WORKER_STORE') {
      worker.postMessage(action)
    }
  }
  return createDispatch({
    reducer,
    middleware: [forwardActionToWorkerStoreMiddleware, ...middleware],
    sideEffects
  })
}

export function createWorkerDispatch ({ workerGlobalContext, reducer, middleware = [], sideEffects = [] }) {
  const { applyDispatch, reducer } = createDispatch({ reducer, middleware, sideEffects })
  const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
    const appliedDispatch = applyDispatch({ dispatch, getState, setState, notifyListeners })
    const wrappedAppliedDispatch = action => {
      const appliedResult = appliedDispatch(action)
      if (appliedResult.stateChanged) {
        // notify client of new state
        workerGlobalContext.postMessage(appliedResult.nextState)
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
    reducer
  }
}
