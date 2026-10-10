import {GramShError} from "../errors.js";

export class UnknownStateError extends GramShError {
    code = "UNKNOWN_STATE_NAME";

    constructor(state: any) {
        super(`Cannot switch to unknown state "${String(state)}"`);
    }
}