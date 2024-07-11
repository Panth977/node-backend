import util from 'util';

export function createStringifyLogger(forEachLine: boolean, options: { addPrefix?: string; addTs?: 'epoch' | 'iso' } = {}) {
    return function (prefix: string | null, args: unknown[]) {
        let logs = [util.format(...args)];
        if (forEachLine) logs = logs[0].split('\n');
        if (options.addPrefix) logs = logs.map((x) => util.format(options.addPrefix, x));
        if (prefix) logs = logs.map((x) => util.format(prefix, x));
        if (options.addTs === 'epoch') {
            const epoch = Math.floor(Date.now() / 1000);
            logs = logs.map((x) => util.format(epoch, x));
        } else if (options.addTs === 'iso') {
            const iso = new Date().toISOString();
            logs = logs.map((x) => util.format(iso, x));
        }
        return logs.join('\n');
    };
}
