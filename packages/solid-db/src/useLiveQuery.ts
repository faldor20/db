import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  untrack,
} from 'solid-js'
import {
  BaseQueryBuilder,
  createLiveQueryCollection,
  isCollection,
  isSingleResultCollection,
} from '@tanstack/db'
import { ReactiveMap } from './reactive-map'
import type { Accessor } from 'solid-js'
import type {
  ChangeMessage,
  Collection,
  CollectionStatus,
  Context,
  GetResult,
  InferResultType,
  InitialQueryBuilder,
  LiveQueryCollectionConfig,
  NonSingleResult,
  QueryBuilder,
  SingleResult,
} from '@tanstack/db'

/**
 * Create a live query using a query function
 * @param queryFn - Query function that defines what data to fetch
 * @returns Accessor that returns data with Suspense support, with state and status information as properties
 * @example
 * // Basic query with object syntax
 * const todosQuery = useLiveQuery((q) =>
 *   q.from({ todos: todosCollection })
 *    .where(({ todos }) => eq(todos.completed, false))
 *    .select(({ todos }) => ({ id: todos.id, text: todos.text }))
 * )
 *
 * @example
 * // With dependencies that trigger re-execution
 * const todosQuery = useLiveQuery(
 *   (q) => q.from({ todos: todosCollection })
 *          .where(({ todos }) => gt(todos.priority, minPriority())),
 * )
 *
 * @example
 * // Join pattern
 * const personIssues = useLiveQuery((q) =>
 *   q.from({ issues: issueCollection })
 *    .join({ persons: personCollection }, ({ issues, persons }) =>
 *      eq(issues.userId, persons.id)
 *    )
 *    .select(({ issues, persons }) => ({
 *      id: issues.id,
 *      title: issues.title,
 *      userName: persons.name
 *    }))
 * )
 *
 * @example
 * // Handle loading and error states
 * const todosQuery = useLiveQuery((q) =>
 *   q.from({ todos: todoCollection })
 * )
 *
 * return (
 *   <Switch>
 *     <Match when={todosQuery.isLoading}>
 *       <div>Loading...</div>
 *     </Match>
 *     <Match when={todosQuery.isError}>
 *       <div>Error: {todosQuery.status}</div>
 *     </Match>
 *     <Match when={todosQuery.isReady}>
 *       <For each={todosQuery()}>
 *         {(todo) => <li key={todo.id}>{todo.text}</li>}
 *       </For>
 *     </Match>
 *   </Switch>
 * )
 *
 * @example
 * // Use Suspense boundaries
 * const todosQuery = useLiveQuery((q) =>
 *   q.from({ todos: todoCollection })
 * )
 *
 * return (
 *   <Suspense fallback={<div>Loading...</div>}>
 *     <For each={todosQuery()}>
 *       {(todo) => <li key={todo.id}>{todo.text}</li>}
 *     </For>
 *   </Suspense>
 * )
 */
// Overload 1: Accept query function that always returns QueryBuilder
export function useLiveQuery<TContext extends Context>(
  queryFn: (q: InitialQueryBuilder) => QueryBuilder<TContext>,
): Accessor<InferResultType<TContext>> & {
  /**
   * @deprecated use function result instead
   * query.data -> query()
   */
  data: InferResultType<TContext>
  state: ReactiveMap<string | number, GetResult<TContext>>
  collection: Collection<GetResult<TContext>, string | number, {}>
  status: CollectionStatus
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
}

// Overload 1b: Accept query function that can return undefined/null
export function useLiveQuery<TContext extends Context>(
  queryFn: (
    q: InitialQueryBuilder,
  ) => QueryBuilder<TContext> | undefined | null,
): Accessor<InferResultType<TContext>> & {
  /**
   * @deprecated use function result instead
   * query.data -> query()
   */
  data: InferResultType<TContext>
  state: ReactiveMap<string | number, GetResult<TContext>>
  collection: Collection<GetResult<TContext>, string | number, {}> | null
  status: CollectionStatus | `disabled`
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
}

/**
 * Create a live query using configuration object
 * @param config - Configuration object with query and options
 * @returns Accessor that returns data with Suspense support, with state and status information as properties
 * @example
 * // Basic config object usage
 * const todosQuery = useLiveQuery(() => ({
 *   query: (q) => q.from({ todos: todosCollection }),
 *   gcTime: 60000
 * }))
 *
 * @example
 * // With query builder and options
 * const queryBuilder = new Query()
 *   .from({ persons: collection })
 *   .where(({ persons }) => gt(persons.age, 30))
 *   .select(({ persons }) => ({ id: persons.id, name: persons.name }))
 *
 * const personsQuery = useLiveQuery(() => ({ query: queryBuilder }))
 *
 * @example
 * // Handle all states uniformly
 * const itemsQuery = useLiveQuery(() => ({
 *   query: (q) => q.from({ items: itemCollection })
 * }))
 *
 * return (
 *   <Switch fallback={<div>{itemsQuery().length} items loaded</div>}>
 *     <Match when={itemsQuery.isLoading}>
 *       <div>Loading...</div>
 *     </Match>
 *     <Match when={itemsQuery.isError}>
 *       <div>Something went wrong</div>
 *     </Match>
 *     <Match when={!itemsQuery.isReady}>
 *       <div>Preparing...</div>
 *     </Match>
 *   </Switch>
 * )
 */
// Overload 2: Accept config object
export function useLiveQuery<TContext extends Context>(
  config: Accessor<LiveQueryCollectionConfig<TContext>>,
): Accessor<InferResultType<TContext>> & {
  /**
   * @deprecated use function result instead
   * query.data -> query()
   */
  data: InferResultType<TContext>
  state: ReactiveMap<string | number, GetResult<TContext>>
  collection: Collection<GetResult<TContext>, string | number, {}>
  status: CollectionStatus
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
}

/**
 * Subscribe to an existing live query collection
 * @param liveQueryCollection - Pre-created live query collection to subscribe to
 * @returns Accessor that returns data with Suspense support, with state and status information as properties
 * @example
 * // Using pre-created live query collection
 * const myLiveQuery = createLiveQueryCollection((q) =>
 *   q.from({ todos: todosCollection }).where(({ todos }) => eq(todos.active, true))
 * )
 * const todosQuery = useLiveQuery(() => myLiveQuery)
 *
 * @example
 * // Access collection methods directly
 * const existingQuery = useLiveQuery(() => existingCollection)
 *
 * // Use collection for mutations
 * const handleToggle = (id) => {
 *   existingQuery.collection.update(id, draft => { draft.completed = !draft.completed })
 * }
 *
 * @example
 * // Handle states consistently
 * const sharedQuery = useLiveQuery(() => sharedCollection)
 *
 * return (
 *  <Switch fallback={<div><For each={sharedQuery()}>{(item) => <Item key={item.id} {...item} />}</For></div>}>
 *    <Match when={sharedQuery.isLoading}>
 *      <div>Loading...</div>
 *    </Match>
 *    <Match when={sharedQuery.isError}>
 *      <div>Error loading data</div>
 *    </Match>
 *  </Switch>
 * )
 */
// Overload 3: Accept pre-created live query collection (non-single result)
export function useLiveQuery<
  TResult extends object,
  TKey extends string | number,
  TUtils extends Record<string, any>,
>(
  liveQueryCollection: Accessor<
    Collection<TResult, TKey, TUtils> & NonSingleResult
  >,
): Accessor<Array<TResult>> & {
  /**
   * @deprecated use function result instead
   * query.data -> query()
   */
  data: Array<TResult>
  state: ReactiveMap<TKey, TResult>
  collection: Collection<TResult, TKey, TUtils>
  status: CollectionStatus
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
}

// Overload 3b: Accept pre-created live query collection with singleResult: true
export function useLiveQuery<
  TResult extends object,
  TKey extends string | number,
  TUtils extends Record<string, any>,
>(
  liveQueryCollection: Accessor<
    Collection<TResult, TKey, TUtils> & SingleResult
  >,
): Accessor<TResult | undefined> & {
  /**
   * @deprecated use function result instead
   * query.data -> query()
   */
  data: TResult | undefined
  state: ReactiveMap<TKey, TResult>
  collection: Collection<TResult, TKey, TUtils> & SingleResult
  status: CollectionStatus
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
}

// Implementation - use function overloads to infer the actual collection type
export function useLiveQuery(
  configOrQueryOrCollection: (queryFn?: any) => any,
) {
  const collection = createMemo(() => {
    if (configOrQueryOrCollection.length === 1) {
      // This is a query function - check if it returns null/undefined
      const queryBuilder = new BaseQueryBuilder() as InitialQueryBuilder
      const result = configOrQueryOrCollection(queryBuilder)

      if (result === undefined || result === null) {
        // Disabled query - return null
        return null
      }

      return createLiveQueryCollection({
        query: configOrQueryOrCollection,
        startSync: true,
      })
    }

    const innerCollection = configOrQueryOrCollection()

    if (innerCollection === undefined || innerCollection === null) {
      // Disabled query - return null
      return null
    }

    if (isCollection(innerCollection)) {
      innerCollection.startSyncImmediate()
      return innerCollection as Collection
    }

    return createLiveQueryCollection({
      ...innerCollection,
      startSync: true,
    })
  })

  // Reactive state that gets updated granularly through change events
  const state = new ReactiveMap<string | number, any>()

  // Reactive data array that maintains sorted order
  const [data, setData] = createStore<Array<any>>([])

  // Track collection status reactively. Read the initial value untracked so
  // the hook body doesn't register a top-level reactive read (forbidden in
  // Solid 2.0); the effect below keeps it up to date afterwards.
  const [status, setStatus] = createSignal<CollectionStatus | `disabled`>(
    untrack(() => {
      const c = collection()
      return c ? c.status : `disabled`
    }),
  )

  // Helper to sync data array from collection in correct order. Returning a
  // new array from the store setter diffs it into the existing store array by
  // index, so rows whose object reference is unchanged keep their store
  // identity (and don't trigger downstream updates) while only the rows that
  // actually changed are replaced — the fine-grained render path.
  const syncDataFromCollection = (
    currentCollection: Collection<any, any, any>,
  ) => {
    const next = Array.from(currentCollection.values()).filter(Boolean)
    setData(() => next)
  }

  // Solid 2.0 removes createResource. Live queries stream their data in via
  // the change subscription below, so we drive the reactive `data`/`state`
  // and `status` entirely from that subscription plus a readiness check.
  createEffect(
    () => collection(),
    (currentCollection) => {
      if (!currentCollection) {
        setStatus(`disabled`)
        state.clear()
        setData(() => [])
        return
      }

      // Reset for a clean switch between collections (the new subscription's
      // initial state only emits inserts, never deletes for the old one).
      state.clear()
      setData(() => [])
      setStatus(currentCollection.status)

      let disposed = false

      const subscription = currentCollection.subscribeChanges(
        (changes: Array<ChangeMessage<any>>) => {
          for (const change of changes) {
            switch (change.type) {
              case `insert`:
              case `update`:
                state.set(change.key, change.value)
                break
              case `delete`:
                state.delete(change.key)
                break
            }
          }

          syncDataFromCollection(currentCollection)

          // Update status on every change
          setStatus(currentCollection.status)
        },
        {
          // Include initial state to ensure immediate population for
          // pre-created collections
          includeInitialState: true,
        },
      )

      // The change subscription won't fire when a collection is marked ready
      // with no data, so settle the status off readiness explicitly too.
      currentCollection
        .toArrayWhenReady()
        .then(() => {
          if (!disposed) setStatus(currentCollection.status)
        })
        .catch(() => {
          if (!disposed) setStatus(`error`)
        })

      return () => {
        disposed = true
        subscription.unsubscribe()
      }
    },
  )

  function getData() {
    const currentCollection = collection()
    if (currentCollection) {
      if (isSingleResultCollection(currentCollection)) {
        return data[0]
      }
    }
    return data
  }

  Object.defineProperties(getData, {
    data: {
      get() {
        return getData()
      },
    },
    status: {
      get() {
        return status()
      },
    },
    collection: {
      get() {
        return collection()
      },
    },
    state: {
      get() {
        return state
      },
    },
    isLoading: {
      get() {
        return status() === `loading`
      },
    },
    isReady: {
      get() {
        return status() === `ready` || status() === `disabled`
      },
    },
    isIdle: {
      get() {
        return status() === `idle`
      },
    },
    isError: {
      get() {
        return status() === `error`
      },
    },
    isCleanedUp: {
      get() {
        return status() === `cleaned-up`
      },
    },
  })
  return getData
}
