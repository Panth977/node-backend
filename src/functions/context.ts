import { randomUUID } from 'crypto';

export type Context = {
    id: string;
    log(message: string, meta?: unknown): void;
    onDispose: (exe: () => Promise<void>) => void;
    dispose: () => Promise<void>;
    getStack(): string | undefined;
};
export type BuildContext<C extends Context> = (context: Context | null) => C;
export const DefaultBuildContext: BuildContext<Context> = function (context) {
    if (context) return Object.assign({}, context);
    let dispose: (() => Promise<void>)[] = [];
    return {
        id: randomUUID(),
        log(message, meta) {
            console.log(this.id, message, meta);
        },
        onDispose(exe) {
            dispose.push(exe);
        },
        async dispose() {
            const dispose_ = [...dispose];
            dispose = [];
            await Promise.allSettled(dispose_.map((exe) => exe));
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
