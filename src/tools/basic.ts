type Prop<T, K> = K extends [infer K1 extends string, ...infer Ks extends string[]]
    ? T extends { [k in K1]: infer V }
        ? Prop<V, Ks>
        : T extends { [k in K1]?: infer V }
          ? Prop<V, Ks> | undefined
          : never
    : T;
type PropExe<T, K> = K extends [infer K1 extends string, ...infer Ks extends string[]]
    ? T extends { [k in K1]: infer V }
        ? PropExe<V, Ks>
        : T extends { [k in K1]?: infer V }
          ? PropExe<V, Ks>
          : never
    : T;
type KeyOf<T> = Exclude<{ [k in keyof T]: k }[keyof T], undefined>;
type ValueOf<T> = T[KeyOf<T>];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Primitive = null | symbol | undefined | number | string | boolean | ((...arg: any[]) => any);
type KeyTree<T> = ValueOf<{
    [K in KeyOf<T>]: T extends { [k_ in K]: Primitive }
        ? [K]
        : T extends { [k_ in K]?: Primitive }
          ? [K]
          : [K] | [K, ...KeyTree<Exclude<T[K], undefined>>];
}>;
type _Join<A, S extends string> = A extends [infer E1 extends string | number, ...infer Es] ? `${E1}${S}${_Join<Es, S>}` : ``;
type Join<A, S extends string> = _Join<A, S> extends `${infer E}${S}` ? E : never;
type _Split<A, S extends string> = A extends `${infer E1}${S}${infer Es}` ? [E1, ..._Split<Es, S>] : [];
type Split<A, S extends string> = A extends string ? _Split<`${A}${S}`, S> : never;

export type KeyPath<T, S extends string> = Join<KeyTree<T>, S> | (string & Record<never, never>);
export type PropType<T, S extends string, K> = Prop<T, Split<K, S>>;
export type PropTypeExe<T, S extends string, K> = PropExe<T, Split<K, S>>;
export type DefaultSplitChar = '.';
export const DefaultSplitChar: DefaultSplitChar = '.';

export function getInnerProps<
    //
    T,
    K extends KeyPath<T, S>,
    S extends string = DefaultSplitChar,
>(obj: T, keyPath: K, split: S = '.' as never): PropType<T, S, K> {
    const path = keyPath.split(split as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return path.reduce<any>((acc, part) => acc?.[part], obj);
}

export function setInnerProps<
    //
    T,
    K extends KeyPath<T, S>,
    S extends string = DefaultSplitChar,
>(obj: T, keyPath: K, value: PropTypeExe<T, S, K>, split: S = '.' as never): void {
    const path = keyPath.split(split as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    path.slice(0, path.length - 1).reduce<any>((acc, part) => acc?.[part], obj)[path[path.length - 1]] = value;
}
