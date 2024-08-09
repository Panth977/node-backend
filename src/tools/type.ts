type Primitive = string | number | symbol | boolean | null | undefined;

export function Exclude<T, U extends Primitive>(t: T, u_: U[]): Exclude<T, U> {
    if (u_.includes(t as never)) throw new Error('Expected not to be!');
    return t as never;
}

export function Extract<T, U>(t: T, u_: U[]): Extract<T, U> {
    if (!u_.includes(t as never)) throw new Error('Expected to be!');
    return t as never;
}

export function Pick<T, K extends keyof T>(t: T, k_: K[]): Pick<T, K> {
    const r = {};
    for (const k of k_) {
        if (k in (t ?? {})) Object.assign(r, { [k]: t[k] });
    }
    return r as never;
}

export function Omit<T, K extends keyof T>(t: T, k_: K[]): Omit<T, K> {
    const r = { ...t };
    for (const k of k_) {
        if (k in (r ?? {})) delete r[k];
    }
    return r as never;
}
