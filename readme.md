[![CircleCI](https://circleci.com/gh/alexstroukov/slex-store-worker.svg?style=svg)](https://circleci.com/gh/alexstroukov/slex-store-worker)

# Slex Store Worker

```
$ npm install slex-store-worker
```

`slex-store-worker` is a set of wrappers which allow developers to extract their store into a web worker. It works by having two parallel stores which synchronise every time the state changes.


## Example Usage

Client

```javascript
import slexStoreWorker from 'slex-store-worker'
import slexStore from 'slex-store'

const createDispatch = slexStore.compose(
  slexStore.createDispatch,
  slexStoreWorker.createClientDispatch
)
const createStore = () => slexStore.createStore(
  createDispatch({
    worker: new Worker('./server/worker.js'),
    reducer: slexStore.createReducer({
      store: reducer
    }),
    sideEffects: [...]
  })
)
const store = createStore()

store.subscribe((state) => {
  // rerender your app e.g. ReactDOM.render()
})
```

Worker

```javascript
import slexStoreWorker from 'slex-store-worker'
import slexStore from 'slex-store'

const createDispatch = slexStore.compose(
  slexStore.createDispatch,
  slexStoreWorker.createWorkerDispatch
)
const createStore = () => slexStore.createStore(
  createDispatch({
    workerGlobalContext: self,
    reducer: slexStore.createReducer({
      store: reducer
    }),
    sideEffects: [...]
  })
)
const store = createStore()

store.subscribe((state) => {
  // rerender your app e.g. ReactDOM.render()
})

```