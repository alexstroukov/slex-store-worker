import slexStore from 'slex-store'
import _ from 'lodash'

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
      // dispatch sync action to replace store with one received from worker
      worker.onmessage = event => {
        if (event.data.type === 'SYNC_WITH_WORKER_STORE') {
          dispatch(event.data)
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

  _getPostMessage = ({ workerGlobalContext, debounce }) => {
    if (_.isNumber(debounce)) {
      return _.debounce(workerGlobalContext.postMessage, debounce)
    } else {
      return workerGlobalContext.postMessage
    }
  }
  
  createWorkerDispatch = ({ workerGlobalContext, reducer, middleware = [], sideEffects = [], debounce }) => {
    const createdDispatch = slexStore.createDispatch({
      reducer,
      middleware,
      sideEffects
    })
    const postMessage = this._getPostMessage({ workerGlobalContext, debounce })
    const wrappedApplyDispatch = ({ dispatch, getState, setState, notifyListeners }) => {
      const appliedDispatch = createdDispatch.applyDispatch({ dispatch, getState, setState, notifyListeners })
      const wrappedAppliedDispatch = action => {
        const appliedResult = appliedDispatch(action)
        if (appliedResult.stateChanged) {
          // notify client of new state
          postMessage(this.createSyncAction({ nextState: appliedResult.nextState }))
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
