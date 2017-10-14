# Slex Store Worker

```
$ npm install slex-store-worker
```

`slex-store-worker` is a set of wrappers which allow developers to extract their store into a web worker. It works by having two parallel stores which synchronise every time the state changes.


## Example Usage

Client

```javascript
import { createClientReducer, createClientDispatch } from 'slex-store-worker'
import createSlexStore from 'slex-store'

const worker = new Worker('/server/path.js')

const store =
  createSlexStore(
      createClientDispatch({
        worker,
        reducer: createClientReducer()
      })
    )
  )

store.subscribe((state) => {
  // rerender your app e.g. ReactDOM.render()
})

```

Worker

```javascript
import { createWorkerDispatch } from 'slex-store-worker'
import createSlexStore, { createReducer } from 'slex-store'

const store =
  createSlexStore(
      createWorkerDispatch({
        workerGlobalContext: self,
        reducer: createReducer({
          ...
        }),
        middleware: [...],
        sideEffects: [...]
      })
    )
  )

```