import { randomUUID } from 'crypto';

export type Context = {
    id: string;
    stack: readonly {
        in: 'endpoint' | 'function*' | 'async function*' | 'function' | 'async function' | 'wrapper' | 'implementation';
        name: string;
    }[];
    logger: Record<'info' | 'debug' | 'warn' | 'error', (message: string, meta?: unknown) => void>;
    onDispose: (exe: () => Promise<void>) => void;
    dispose: () => Promise<void>;
    getStack(): string;
};

export function createContext(initialStack: Context['stack'][number]): Context {
    let dispose: (() => Promise<void>)[] = [];
    return {
        id: randomUUID(),
        stack: Object.freeze([initialStack]),
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
            return this.stack
                .map((stack) => {
                    if (stack.in === 'implementation') return `\t\timplementation()`;
                    if (stack.in === 'wrapper') return `\t\t${stack.in} [${stack.name}]()`;
                    return `\t${stack.in} [${stack.name}]:`;
                })
                .join('\n');
        },
    };
}
