import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Builder<A extends unknown[] = any[]> = (...args: A) => string;

export type Parser<Z extends z.ZodType> = Omit<Z, 'sqlType' | 'encode' | 'compile' | 'orNull' | 'notNull'> & {
    sqlType: string;
    update<N extends z.ZodType<z.infer<Z>>>(update: (old: Z) => N, type?: string, encode?: Parser<N>['encode']): Parser<N>;
    encode(val: z.infer<Z> & (Record<never, never> | undefined)): string;
    compile(arg: z.infer<Z>): string;
    orNull(): Parser<Z extends z.ZodNullable<infer T> ? z.ZodNullable<T> : z.ZodNullable<Z>>;
    notNull(): Parser<Z extends z.ZodNullable<infer T> ? T : Z>;
};

const List = z.union([z.array(z.unknown()), z.set(z.unknown()).transform((x) => [...x])]);

function ParserBuilder<D extends z.ZodType>(defaultSchema: () => D, type: string, encode: Parser<D>['encode']) {
    return function <Z extends z.ZodType<z.infer<D>> = D>(_params: { _schema?: Z }) {
        const schema: Z = _params._schema ?? (defaultSchema() as never);
        const params: Parser<Z> = Object.assign(schema, {
            sqlType: type,
            encode,
            update: function <N extends z.ZodType<z.infer<Z>>>(update: (old: Z) => N, newType?: string, newEncode?: Parser<N>['encode']) {
                const newSchema = update(schema);
                return ParserBuilder<N>(() => newSchema, newType ?? type, newEncode ?? (encode as never));
            } as never,
            orNull: function () {
                if (schema instanceof z.ZodNullable === true) return params;
                const nullableSchema = schema.nullable();
                return ParserBuilder(() => nullableSchema, params.sqlType, encode)({});
            } as never,
            notNull: function () {
                if (schema instanceof z.ZodNullable === false) return params;
                const notNullSchema = (schema as never as z.ZodNullable<z.ZodType>).unwrap();
                return ParserBuilder(() => notNullSchema, params.sqlType, encode)({});
            } as never,
            compile(arg: unknown) {
                const val = schema.parse(arg);
                if (val === null) return `NULL`;
                return params.encode(val);
            },
        });
        return params;
    };
}

export const Encode = {
    text: (val: string) => `'${val.replace(/'/g, "''")}'`,
    numeric: (val: number) => `${val}`,
    boolean: (val: boolean) => (val ? 'TRUE' : 'FALSE'),
    timestamp: (val: Date) => `'${val.toISOString()}'::TIMESTAMP`,
    jsonb: (val: unknown) => `'${JSON.stringify(val).replace(/'/g, "''")}'::JSONB`,
};

export const Parsers = {
    text: ParserBuilder(() => z.coerce.string().nullable(), `TEXT`, Encode.text),
    varchar<Z extends z.ZodType<string> = z.ZodString>(_params: { len: number; _schema?: Z }) {
        return ParserBuilder<z.ZodNullable<Z>>(
            () => (_params._schema ?? (z.coerce.string().max(_params.len) as never)).nullable(),
            `VARCHAR(${_params.len})`,
            Encode.text
        )({});
    },
    numeric: ParserBuilder(() => z.coerce.number().nullable(), `NUMERIC`, Encode.numeric),
    int: ParserBuilder(() => z.coerce.number().int().nullable(), `INT`, Encode.numeric),
    boolean: ParserBuilder(() => z.coerce.boolean().nullable(), `BOOLEAN`, Encode.boolean),
    timestamp: ParserBuilder(() => z.coerce.date().nullable(), `TIMESTAMP`, Encode.timestamp),
    jsonb: ParserBuilder(() => z.any(), `JSONB`, Encode.jsonb),
    list<T extends z.ZodType, Z extends z.ZodArray<T> = z.ZodArray<T>>(_params: { _schema?: Z; parser: Parser<T> }) {
        return ParserBuilder<z.ZodNullable<Z>>(
            () => (_params._schema ?? (_params.parser.array() as never)).nullable(),
            `${_params.parser.sqlType}[]`,
            (val) => `{${val.map(_params.parser.encode).join(',')}}`
        )({});
    },
} satisfies Record<string, (_params: never) => Parser<z.ZodType>>;

export const Helpers = {
    compile<Z extends z.ZodType>(arg: z.infer<Z>, parser: Parser<Z>) {
        return parser.compile(arg);
    },
    jsonProp(target: string, prop: string[]) {
        const path = [target, ...prop];
        const lst = path.pop();
        return `${path.map(Encode.text).join('->')} ->> ${lst}`;
    },
    in<T>(arr: T[], compile: Builder<[T]>) {
        const val = List.parse(arr) as T[];
        if (!val.length) return 'FALSE';
        return `IN (${val.map((e) => compile(e)).join(',')})`;
    },
    notIn<T>(arr: T[], compile: Builder<[T]>) {
        const val = List.parse(arr) as T[];
        if (!val.length) return 'TRUE';
        return `NOT IN (${val.map((e) => compile(e)).join(',')})`;
    },
    substring(txt: string) {
        const val = z.string().parse(txt);
        return `'%${val
            .split('')
            .map((x) => `\\${x === "'" ? "''" : x}`)
            .join('')}%'`;
    },
    if<T>(
        conditionIsTruly: T,
        onTrue: Builder<[Exclude<T, null | undefined | 0 | false | ''>]>,
        onFalse?: Builder<[Extract<T, null | undefined | 0 | false | ''>]>
    ) {
        if (conditionIsTruly) {
            return onTrue(conditionIsTruly as never);
        } else if (onFalse) {
            return onFalse(conditionIsTruly as never);
        } else {
            return '';
        }
    },
    for<T extends Record<never, never>>(obj: T, builder: Builder<[T[keyof T], T extends unknown[] ? number : string]>, separator = '') {
        if (Array.isArray(obj)) return obj.map((v, i) => builder(v, i as never)).join(separator);
        return (Object.keys(obj) as Extract<keyof T, string>[]).map((key) => builder(obj[key], key as never)).join(separator);
    },
    table<C extends Record<string, Parser<z.ZodType>>>(rows: { [k in keyof C]: z.infer<C[k]> }[], columns: C) {
        const names = Object.keys(columns) as Extract<keyof C, string>[];
        if (!names.length) throw new Error('No columns found!');
        return [
            `SELECT ${[`CAST(NULL AS INT) AS i`, ...names.map((col) => `CAST(NULL AS ${columns[col].sqlType}) AS "${col}"`)].join(',')} WHERE FALSE`,
            ...rows.map((row, i) => `SELECT ${[`${i} AS i`, ...names.map((col) => `${columns[col].compile(row[col])} AS "${col}"`)].join(',')}`),
        ].join('UNION ALL');
    },
} satisfies Record<string, Builder>;

// export function compile(customSql: string) {
//     const withClauses = [];
//     const returnClauses = [];
//     for (let part of (customSql + ';').split(';')) {
//         part = part.trim();
//         if (/^([a-zA-Z_][a-zA-Z_0-9]*|"[a-zA-Z_][a-zA-Z_0-9]*")::/.test(part)) {
//             const splitChar = '::';
//             const splitIndex = part.indexOf(splitChar);
//             const variableName = part.substring(0, splitIndex);
//             const query = part.substring(splitIndex + splitChar.length);
//             withClauses.push(`${variableName} AS (${query.trim()})`);
//         } else if (/^([a-zA-Z_][a-zA-Z_0-9]*|"[a-zA-Z_][a-zA-Z_0-9]*")>>/.test(part)) {
//             const splitChar = '>>';
//             const splitIndex = part.indexOf(splitChar);
//             const variableName = part.substring(0, splitIndex);
//             const query = part.substring(splitIndex + splitChar.length);
//             returnClauses.push(`(${query.trim()}) AS ${variableName}`);
//         } else if (part) {
//             throw new Error('Unimplemented!');
//         }
//     }
//     let query = '';
//     if (withClauses.length) query += `WITH ${withClauses.join(',\n')} `;
//     query += `SELECT ${returnClauses.join(',')};`;
//     return query;
// }
