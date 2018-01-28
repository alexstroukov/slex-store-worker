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
const store =
  slexStore.createStore(
    slexStoreWorker.createClientDispatch({
      worker: new Worker('./server/worker.js'),
      reducer: slexStoreWorker.createClientReducer()
    })
  )

store.subscribe((state) => {
  // rerender your app e.g. ReactDOM.render()
})

```

Worker

```javascript
import slexStoreWorker from 'slex-store-worker'
import slexStore from 'slex-store'

const store =
  slexStore.createStore(
      slexStoreWorker.createWorkerDispatch({
        workerGlobalContext: self,
        reducer: slexStore.createReducer({
          ...
        }),
        middleware: [...],
        sideEffects: [...]
      })
    )
  )

```