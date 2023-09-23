import { Types, general, types } from './helper';

const CodeMap = {
    ok: { canonicalName: 'OK', status: 200 },
    cancelled: { canonicalName: 'CANCELLED', status: 499 },
    unknown: { canonicalName: 'UNKNOWN', status: 500 },
    'invalid-argument': { canonicalName: 'INVALID_ARGUMENT', status: 400 },
    'deadline-exceeded': { canonicalName: 'DEADLINE_EXCEEDED', status: 504 },
    'not-found': { canonicalName: 'NOT_FOUND', status: 404 },
    'already-exists': { canonicalName: 'ALREADY_EXISTS', status: 409 },
    'permission-denied': { canonicalName: 'PERMISSION_DENIED', status: 403 },
    unauthenticated: { canonicalName: 'UNAUTHENTICATED', status: 401 },
    'resource-exhausted': { canonicalName: 'RESOURCE_EXHAUSTED', status: 429 },
    'failed-precondition': { canonicalName: 'FAILED_PRECONDITION', status: 400 },
    aborted: { canonicalName: 'ABORTED', status: 409 },
    'out-of-range': { canonicalName: 'OUT_OF_RANGE', status: 400 },
    unimplemented: { canonicalName: 'UNIMPLEMENTED', status: 501 },
    internal: { canonicalName: 'INTERNAL', status: 500 },
    unavailable: { canonicalName: 'UNAVAILABLE', status: 503 },
    'data-loss': { canonicalName: 'DATA_LOSS', status: 500 },
} as const;

export default class HttpsResponse<Code extends keyof typeof CodeMap, Data = null> extends Error {
    readonly code: Code;
    readonly data: Data;
    readonly httpErrorCode: (typeof CodeMap)[Code];
    constructor(code: Code, message: string, data?: Data) {
        super(message);
        if (code in CodeMap === false) {
            throw new Error(`Unknown error code: ${code}.`);
        }
        this.code = code;
        this.data = data ?? (null as never);
        this.httpErrorCode = CodeMap[code];
    }

    declare [types]: {
        Code: Code;
        Data: Data;
        AsJson: { data: Data; message: string; status: (typeof CodeMap)[Code]['canonicalName'] };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    declare static [general]: HttpsResponse<any, any>;

    toJSON(): this[Types]['AsJson'] {
        return { data: this.data, message: this.message, status: this.httpErrorCode.canonicalName };
    }
}
