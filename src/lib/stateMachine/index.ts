import {GlobalEventMap, StateHandlers, StateMachineConfig} from "./types.js";
import {UnknownStateError} from "./errors.js";

/**
 * Allows to organize groups of event handlers by tying them to state and exposing one common "emit" method.
 * This replaces (un)subscribing handlers imperatively, redundant "if" statements in handlers etc.
 *
 * @typeParam TSchema - States Schema - a type that maps state name to its event map.
 *
 * @example
 * ```ts
 * type GuestEvents = {
 *     login: {
 *         email: string;
 *         password: string;
 *     };
 * }
 *
 * type AuthenticatedEvents = {
 *     logout: undefined;
 *     message: {
 *         data: string;
 *     };
 * }
 *
 * type AppEvents = {
 *      guest: GuestEvents;
 *      authenticated: AuthenticatedEvents;
 * }
 *
 * const machine = new StateMachine<AppEvents>({
 *     handlers: {
 *         guest: {
 *             login: ({email, password}) => {}
 *         },
 *         authenticated: {
 *             logout: () => {},
 *             message: async ({data}) => {}
 *         }
 *     },
 *     initialState: "guest"
 * });
 *
 * // At this point, machine is in "guest" state, which doesn't have "logout" handler, so method just returns false
 * machine.emit("logout", undefined);
 *
 * // Calls login handler from guest state
 * machine.emit("login", {
 *     email: "test",
 *     password: "test"
 * });
 *
 * // Switches the machine to "authenticated" state
 * machine.switchTo("authenticated");
 *
 * // Now current machine state contains "logout" handler, so it gets called
 * machine.emit("logout", undefined);
 *
 * // Awaits the handler, so its errors can be caught by the caller
 * await machine.emitAsync("message", {data: "hello"});
 * ```
 */
export class StateMachine<TSchema extends Record<string, any>> {
    /**
     * Current machine state name.
     * @private
     */
    private currentState: keyof TSchema;

    /**
     * A mapping between state name and its {@link StateHandlers}.
     * @private
     */
    private handlers: { [State in keyof TSchema]: StateHandlers<TSchema[State]> };

    /**
     * Returns {@link StateHandlers} for current state.
     * @private
     */
    private get currentHandlers() {
        return this.handlers[this.currentState];
    }

    /**
     * Current machine state name.
     */
    get state(): keyof TSchema {
        return this.currentState;
    }

    /**
     * Initializes a new instance of the {@link StateMachine} class.
     *
     * @param config - State Machine configuration.
     */
    constructor({handlers, initialState}: StateMachineConfig<TSchema>) {
        this.handlers = handlers;
        this.currentState = initialState;
    }

    /**
     * Switches machine to another state.
     *
     * @param state - a state name for machine to switch to.
     *
     * @throws {@link UnknownStateError}
     * Thrown if the given state doesn't exist in the State Schema.
     */
    switchTo(state: keyof TSchema) {
        if (!Object.hasOwn(this.handlers, state)) {
            throw new UnknownStateError(state);
        }
        this.currentState = state;
    }

    /**
     * Calls the handler for `eventName` in the current state if there's one.
     *
     * Synchronous handlers finish before this method returns.
     * Async handlers are not awaited, therefore their rejections can't be caught by the caller.
     * Use {@link StateMachine.emitAsync} if you need to catch them or wait until the handler finishes.
     *
     * @param eventName - Name of the event to emit.
     * @param payload - Event data.
     * @returns `true` if the handler for that event exists in current machine state and was called, or `false` otherwise.
     */
    emit<EventName extends keyof GlobalEventMap<TSchema>>(
        eventName: EventName,
        payload: GlobalEventMap<TSchema>[EventName]
    ): boolean {
        const handler = this.currentHandlers[eventName];
        if (handler) handler(payload);
        return !!handler;
    }

    /**
     * Calls and awaits the handler for `eventName` in the current state if there's one.
     *
     * The handler is picked at call time, so it runs even if the state changes while it's still executing.
     * Async handler can overlap with later `emit`/`emitAsync` calls, which run against the state that is current then.
     *
     * @param eventName - Name of the event to emit.
     * @param payload - Event data.
     * @returns A promise that resolves to `true` if the handler for that event exists in current machine state and was called, or to `false` otherwise.
     */
    async emitAsync<EventName extends keyof GlobalEventMap<TSchema>>(
        eventName: EventName,
        payload: GlobalEventMap<TSchema>[EventName]
    ): Promise<boolean> {
        const handler = this.currentHandlers[eventName];
        if (handler) await handler(payload);
        return !!handler;
    }
}