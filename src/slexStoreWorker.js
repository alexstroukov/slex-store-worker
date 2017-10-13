import createSlexStore, { createDispatch, createReducer } from 'slex-store'
import _ from 'lodash'

export const createSyncAction = nextState => {
  return {
    type: 'SYNC_WITH_WORKER_STORE',
    nextState
  }
}
function createSyncReducer () {
  return (state, action) => {
    switch (action.type) {
      case 'SYNC_WITH_WORKER_STORE':
        return action.nextState
      default:
        return state
    }
  }
}

export function createClientStore ({ worker }) {
  worker.onmessage = workerStoreReceived

  const store =
    createSlexStore(
      createDispatch({
        reducer: createSyncReducer(),
        middleware: [
          forwardActionToWorkerStoreMiddleware
        ]
      })
    )

  function workerStoreReceived (event) {
    const nextState = event.data
    store.dispatch(createSyncAction(nextState))
  }
  function forwardActionToWorkerStoreMiddleware (dispatch, getState, action) {
    if (action.type && action.type !== 'SYNC_WITH_WORKER_STORE') {
      worker.postMessage(action)
    }
  }

  return store
}

export function createSyncedDispatch ({ workerGlobalContext, reducer, middleware, sideEffects }) {
  const { applyDispatch, reducer } = createDispatch({ reducer, middleware, sideEffects })
  const wrappedApplyDispatch = ({ dispatch, getState }) => {
    const appliedDispatch = applyDispatch({ dispatch, getState })
    return action => {
      const appliedResult = appliedDispatch(action)
      if (appliedResult.stateChanged) {
        workerGlobalContext.postMessage(appliedResult.nextState)
      }
      return appliedResult
    }
  }
  return {
    applyDispatch: wrappedApplyDispatch,
    reducer
  }
}

export {
  createSyncedDispatch,
  createClientStore,
  createSyncReducer,
  createSyncAction
}
