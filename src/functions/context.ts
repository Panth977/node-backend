import { randomUUID } from 'crypto';

export type Context = {
    id: string;
    logger: Record<'info' | 'debug' | 'warn' | 'error', (message: string, meta?: unknown) => void>;
    onDispose: (exe: () => Promise<void>) => void;
    dispose: () => Promise<void>;
    getStack(): string | undefined;
};

export function createContext(): Context {
    let dispose: (() => Promise<void>)[] = [];
    return {
        id: randomUUID(),
        logger: console,
        onDispose(exe) {
            dispose.push(exe);
        },
        async dispose() {
            const dispose_ = [...dispose];
            dispose = [];
            await Promise.allSettled(dispose_.map((exe) => exe));
        },
        getStack() {
            return new Error().stack;
        },
    };
}
