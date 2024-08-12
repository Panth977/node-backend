export interface ConnectionOptions<P extends Record<string, string | string[]> = Record<string, string | string[]>> {
    protocol: string;
    user: string;
    pass: string;
    host: string;
    port?: number;
    db?: string;
    params: P;
}

export function decodeConnectionString<P extends Record<string, string | string[]>>(connectionString: string): ConnectionOptions<P> {
    const regex = /^(?<protocol>[a-z]+):\/\/(?<user>[^:]+):(?<pass>[^@]*)@(?<host>[^:/?]+)(:(?<port>[0-9]+))?(\/(?<db>[^?]+))?(?<paramsStr>\?.+)?$/;
    const match = connectionString.match(regex);
    if (!match || !match.groups) throw new Error('Unparsable connection string!');
    const { protocol, user, pass, host, port, db, paramsStr } = match.groups;
    const decodedUser = decodeURIComponent(user);
    const decodedPass = decodeURIComponent(pass);
    const decodedHost = decodeURIComponent(host);

    const params: Record<string, string | string[]> = {};
    if (paramsStr) {
        const searchParams = new URLSearchParams(paramsStr);
        for (const [key_, value] of searchParams) {
            let key = key_;
            if (key.endsWith('[]')) {
                key = key.slice(0, key.length - 2);
                params[key] ??= [];
            }
            const val = params[key];
            if (val === undefined) {
                params[key] = value;
            } else if (Array.isArray(val)) {
                val.push(value);
            } else {
                params[key] = [val, value];
            }
        }
    }
    return {
        protocol,
        user: decodedUser,
        pass: decodedPass,
        host: decodedHost,
        port: parseInt(port),
        db: db as string | undefined,
        params: params as P,
    };
}

export function encodeConnectionString<P extends Record<string, string | string[]>>(options: ConnectionOptions<P>): string {
    const { user, pass, host, port, db, params, protocol } = options;
    const encodedUser = encodeURIComponent(user);
    const encodedPass = encodeURIComponent(pass);
    const encodedHost = encodeURIComponent(host);

    let connectionString = `${protocol}://${encodedUser}:${encodedPass}@${encodedHost}`;
    if (port) connectionString += `:${port}`;
    if (db) connectionString += `/${db}`;
    const queryParams = new URLSearchParams();
    for (const key in params) {
        const value = params[key];
        if (Array.isArray(value)) {
            value.forEach((val) => queryParams.append(key + '[]', val));
        } else {
            queryParams.append(key, value);
        }
    }
    if (queryParams.size) connectionString += `?${queryParams.toString()}`;
    return connectionString;
}
