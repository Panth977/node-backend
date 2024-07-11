import { randomUUID } from 'crypto';

export type Context = {
    id: string;
    log(message: string, meta?: unknown): void;
    onDispose: (exe: (context: Omit<Context, 'onDispose' | 'dispose'>) => Promise<void>) => void;
    dispose: () => Promise<void>;
    getStack(): string | undefined;
};
export type BuildContext<C extends Context> = (context: Context | null) => C;
let defaultLogger = function (context: Omit<Context, 'log'>, args: unknown[]) {
    console.log(...args);
};
export function setDefaultLogger(logger: typeof defaultLogger) {
    defaultLogger = logger;
}
let defaultOnDisposeExe: Parameters<Context['onDispose']>[0] | null = null;
export function setDefaultOnDisposeExe(exe: typeof defaultOnDisposeExe) {
    defaultOnDisposeExe = exe;
}
export const DefaultBuildContext: BuildContext<Context> = function (context) {
    if (context) return Object.assign({}, context, { params: undefined });
    const dispose: Parameters<Context['onDispose']>[0][] = [];
    if (defaultOnDisposeExe) dispose.push(defaultOnDisposeExe);
    return {
        id: randomUUID(),
        log(...args) {
            defaultLogger(this, args);
        },
        onDispose(exe) {
            dispose.push(exe);
        },
        async dispose() {
            await Promise.allSettled([...dispose].reverse().map((exe) => exe(this)));
        },
        getStack() {
            return new Error().stack?.substring(5);
        },
    };
};
export function BuildContextWithParamsBuilder<P, C extends Context>(params: P, buildContext: BuildContext<C>): BuildContext<C & { params: P }> {
    return function (context) {
        return Object.assign(buildContext(context), { params: params });
    };
}
