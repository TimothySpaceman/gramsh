/**
 * Represents a mapping between state events and handlers, including payload types.
 *
 * @typeParam TEventMap - A type that maps event names to payload types.
 */
export type StateHandlers<TEventMap> = {
    [Event in keyof TEventMap]: (payload: TEventMap[Event]) => void | Promise<void>;
};

/**
 * Extracts all event names from the states schema.
 *
 * @typeParam TSchema - States Schema to flatten (a mapping between state names and event maps).
 */
type AllEventNames<TSchema> = {
    [State in keyof TSchema]: keyof TSchema[State];
}[keyof TSchema];

/**
 * Maps all event names from the states schema to the union of their payload types.
 * If an event name occurs in multiple states, it gets mapped to the union of the payload types from across those states.
 *
 * @typeParam TSchema - States Schema.
 */
export type GlobalEventMap<TSchema> = {
    [Event in AllEventNames<TSchema>]: {
        [State in keyof TSchema]: Event extends keyof TSchema[State] ? TSchema[State][Event] : never;
    }[keyof TSchema];
};

/**
 * StateMachine configuration.
 *
 * @typeParam TSchema - States Schema - a type that maps state name to its event map.
 */
export type StateMachineConfig<TSchema extends Record<string, any>> = {
    /**
     * A mapping between state name and its {@link StateHandlers}.
     */
    handlers: {
        [State in keyof TSchema]: StateHandlers<TSchema[State]>
    };

    /**
     * Initial machine state.
     */
    initialState: keyof TSchema;
};