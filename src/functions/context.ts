import { randomUUID } from 'crypto';

export type Context = {
    id: string;
    log(message: string, meta?: unknown): void;
    onDispose: (exe: () => Promise<void>) => void;
    dispose: () => Promise<void>;
    getStack(): string | undefined;
};
export type BuildContext<C extends Context> = (context: Context | null) => C;
export const DefaultBuildContext = (function () {
    type Logger = (context: Omit<Context, 'log'>, args: unknown[]) => void;
    type OnDisposeExe = (context: Omit<Context, 'onDispose' | 'dispose'>) => Promise<void>;
    const loggers = new Set<Logger>();
    const onDisposeExes = new Set<OnDisposeExe>();
    function addLogger(logger: Logger) {
        loggers.add(logger);
        return function () {
            loggers.delete(logger);
        };
    }
    function addOnDisposeExe(onDisposeExe: OnDisposeExe) {
        onDisposeExes.add(onDisposeExe);
        return function () {
            onDisposeExes.delete(onDisposeExe);
        };
    }
    const DefaultBuildContext: BuildContext<Context> = function (context) {
        if (context) return Object.assign({}, context, { params: undefined });
        const dispose: Parameters<Context['onDispose']>[0][] = [];
        return {
            id: randomUUID(),
            log(...args) {
                if (loggers.size) {
                    for (const fn of loggers) {
                        fn(this, args);
                    }
                } else {
                    console.log(...args);
                }
            },
            onDispose(exe) {
                dispose.push(exe);
            },
            async dispose() {
                await Promise.allSettled([...dispose].reverse().map((exe) => exe()));
                for (const fn of onDisposeExes) {
                    fn(this);
                }
            },
            getStack() {
                return new Error().stack?.substring(5);
            },
        };
    };
    return Object.assign(DefaultBuildContext, { addLogger, addOnDisposeExe });
})();
export function BuildContextWithParamsBuilder<P, C extends Context>(params: P, buildContext: BuildContext<C>): BuildContext<C & { params: P }> {
    return function (context) {
        return Object.assign(buildContext(context), { params: params });
    };
}
