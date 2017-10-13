import createWorkerStore from './createWorkerStore'
import _ from 'lodash'

const dispatchWrapper = ({ applyDispatch, reducer }) => {
  const wrappedApplyDispatch = ({ dispatch, getState }) => {
    const appliedDispatch = applyDispatch({ dispatch, getState })
    return action => {
      const appliedResult = appliedDispatch(action)
      if (appliedResult.stateChanged) {
        self.postMessage(appliedResult.nextState)
      }
      return appliedResult
    }
  }
  return {
    applyDispatch: wrappedApplyDispatch,
    reducer
  }
}

const applicationStore = createWorkerStore(dispatchWrapper)

// Respond to message from parent thread
self.addEventListener('message', event => {
  const action = event.data
  applicationStore.dispatch(action)
})
