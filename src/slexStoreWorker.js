import deepDiff from './deepDiff'
import applyDiff from './applyDiff'
import { buffer, defer } from './utils'
import _ from 'lodash'

class SlexStoreWorker {
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
  defaultReduce = (state, action) => {
    return state
  }
  createClientReducer = (reducer = this.defaultReduce) => {
    return (state, action) => {
      switch (action.type) {
        case 'SYNC_FOR_CLIENT_STORE':
          return applyDiff.applyDifferences(action.differences, state)
        default:
          return reducer(state, action)
      }
    }
  }
  createForwardActionToWorkerStoreSideEffect = ({ worker }) => ({ prevState, nextState, action }) => {
    if (action && action.type !== 'SYNC_FOR_CLIENT_STORE') {
      worker.postMessage(this.createSyncForWorkerAction({ prevState, nextState, action }))
    }
  }
  createClientApplyDispatch = ({ worker, applyDispatch }) => ({ dispatch, getState, setState, notifyListeners }) => {
    // receive forwarded action from worker
    worker.onmessage = event => {
      if (event.data.type === 'SYNC_FOR_CLIENT_STORE') {
        const action = event.data
        dispatch(action, { skipHooks: action.isInitAction })
      }
    }
    return applyDispatch({ dispatch, getState, setState, notifyListeners })
  }

  createClientDispatch = ({ worker, applyDispatch, ...rest }) => {
    return {
      applyDispatch: this.createClientApplyDispatch({ worker, applyDispatch }),
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
  createWorkerApplyDispatch = ({ applyDispatch, workerGlobalContext }) => ({ dispatch, getState, setState, notifyListeners }) => {
    const bufferedPostMessage = this.createBufferedPostMessage({ workerGlobalContext })
    // dispatch action forwarded by client
    workerGlobalContext.addEventListener('message', event => {
      const action = event.data
      if (action && action.type && action.type === 'SYNC_FOR_WORKER_STORE') {
        const { nextState, action: forwardedAction } = action
        const prevState = getState()
        const differences = deepDiff.diff(prevState, nextState)
        const appliedNextState = applyDiff.applyDifferences(differences, prevState)
        const isInitAction = forwardedAction.type === 'INITIALISE'
        return wrappedAppliedDispatch(forwardedAction, { skipHooks: isInitAction, appliedPrevState: appliedNextState })
      }
    }) 
    const appliedDispatch = applyDispatch({ dispatch, getState, setState, notifyListeners })
    const wrappedAppliedDispatch = (action, options) => {
      const prevState = getState()
      const appliedResult = appliedDispatch(action, options)
      const isInitAction = action.type === 'INITIALISE'
      if (!isInitAction && appliedResult.stateChanged) {
        const differences = this.calculateDifferences({ prevState, nextState: appliedResult.nextState })
        bufferedPostMessage(differences)
      }
      return appliedResult
    }
    return wrappedAppliedDispatch
  }
  createWorkerDispatch = ({ workerGlobalContext, applyDispatch, ...rest }) => {
    return {
      workerGlobalContext,
      applyDispatch: this.createWorkerApplyDispatch({ applyDispatch, workerGlobalContext }),
      ...rest
    }
  }
}

export default new SlexStoreWorker()
