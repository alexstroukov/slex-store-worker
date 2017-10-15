import slexStore from 'slex-store'

class SlexWorkerStoreModule {

  createSyncAction = ({ nextState }) => {
    return {
      type: 'SYNC_WITH_WORKER_STORE',
      nextState
    }
  }
  
  createClientReducer = () => {
    return (state, action) => {
      switch (action.type) {
        case 'SYNC_WITH_WORKER_STORE':
          return action.nextState
        default:
          return state
      }
    }
  }
  
  createClientWorker = ({ url }) => {
    const worker = new Worker(url)
    // dispatch action to replace store with one received from worker
    worker.onmessage = function workerStoreReceived (event) {
      const nextState = event.data
      createdDispatch.dispatch(this.createSyncAction({ nextState }))
    }
    return worker
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
      reducer: createdDispatch.reducer
    }
  }
}

export default new SlexWorkerStoreModule()
