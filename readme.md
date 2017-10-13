# Slex Store Worker

```
$ npm install slex-store-worker
```

`slex-store-worker` is a set of wrappers which allow developers to extract their store into a web worker. It works by having two parallel stores which synchronise every time the state changes.


## Example Usage

Client

```javascript
import { createClientStore } from 'slex-store-worker'

const worker = new Worker('/server/path.js')
const store = createClientStore({ worker })

store.subscribe((state) => {
  // rerender your app e.g. ReactDOM.render()
})

```

Worker

```javascript
import { createSyncedDispatch } from 'slex-store-worker'
import createSlexStore, { createReducer } from 'slex-store'

const store =
  createSlexStore(
      createSyncedDispatch({
        workerGlobalContext: self,
        reducer: createReducer({
          ...
        }),
        middleware: [...],
        sideEffects: [...]
      })
    )
  )

store.subscribe((state) => {
  // rerender your app e.g. ReactDOM.render()
})

```