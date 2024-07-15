import { randomUUID } from 'crypto';

export type Context = {
    id: string;
    log(...args: unknown[]): void;
    onDispose: (exe: () => void) => void;
    dispose: () => Promise<void>;
    getStack(): string | undefined;
};
export type BuildContext<C extends Context> = (context: Context | null) => C;
export const DefaultBuildContext = (function () {
    type Logger = (context: Omit<Context, 'log'>, args: unknown[]) => void;
    type OnDisposeExe = (context: Omit<Context, 'onDispose' | 'dispose'>) => void;
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
        if (context) return Object.assign({}, context);
        const dispose: Parameters<Context['onDispose']>[0][] = [];
        return {
            id: randomUUID(),
            async log(...args) {
                await Promise.allSettled([
                    //
                    ...[...loggers].map(async (fn) => fn(this, args)),
                ]);
            },
            onDispose(exe) {
                dispose.push(exe);
            },
            async dispose() {
                await Promise.allSettled([
                    //
                    ...dispose.map(async (exe) => exe()),
                    ...[...onDisposeExes].map(async (exe) => exe(this)),
                ]);
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
