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

export function ParserBuilder<D extends z.ZodType>(defaultSchema: () => D, type: string, encode: Parser<D>['encode']) {
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
    varchar<Z extends z.ZodType<string> = z.ZodString>(_params: { len: number; _schema?: Z }): Parser<z.ZodNullable<Z>> {
        return ParserBuilder(
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
    list<T extends z.ZodType, Z extends z.ZodArray<T> = z.ZodArray<T>>(_params: { _schema?: Z; parser: Parser<T> }): Parser<z.ZodNullable<Z>> {
        const sqlType = `${_params.parser.sqlType}[]`;
        return ParserBuilder(
            () => (_params._schema ?? (_params.parser.array() as never)).nullable(),
            sqlType,
            (val) => `ARRAY[${val.map(_params.parser.encode).join(',')}]::${sqlType}`
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
    contains(txt: string) {
        const val = z.string().parse(txt);
        return `LIKE '%${val
            .split('')
            .map((x) => `\\${x === "'" ? "''" : x}`)
            .join('')}%'`;
    },
    select<C extends Record<string, Parser<z.ZodType>>>(columns: C | z.ZodObject<C>, row?: { [k in keyof C]: z.infer<C[k]> }) {
        if (columns instanceof z.ZodObject) columns = columns.shape;
        const names = Object.keys(columns) as Extract<keyof C, string>[];
        if (!names.length) throw new Error('No columns found!');
        if (!row) return `SELECT ${names.map((col) => `CAST(NULL AS ${(columns as C)[col].sqlType}) AS "${col}"`).join(',')} WHERE FALSE`;
        return `SELECT ${names.map((col) => `${(columns as C)[col].compile(row[col])} AS "${col}"`).join(',')}`;
    },
    table<C extends Record<string, Parser<z.ZodType>>>(columns: C | z.ZodObject<C>, rows: { [k in keyof C]: z.infer<C[k]> }[]): string {
        if (columns instanceof z.ZodObject) columns = columns.shape;
        const names = Object.keys(columns) as Extract<keyof C, string>[];
        if (!names.length) throw new Error('No columns found!');
        return [Helpers.select(columns), ...rows.map((row) => Helpers.select(columns as C, row))].join('UNION ALL');
    },
    set<C extends Record<string, Parser<z.ZodType>>>(
        columns: C | z.ZodObject<{ [k in keyof C]: z.ZodOptional<C[k]> | C[k] }>,
        row: { [k in keyof C]?: z.infer<C[k]> }
    ) {
        if (columns instanceof z.ZodObject) {
            const shape = columns.shape;
            columns = Object.fromEntries(
                Object.keys(shape).map((key) => {
                    const val = shape[key];
                    if (val instanceof z.ZodOptional) return [key, val.unwrap()];
                    return [key, val];
                })
            ) as never;
        }
        const names = Object.keys(columns) as Extract<keyof C, string>[];
        const rowNames = Object.keys(row).filter((name) => names.includes(name as never)) as Extract<keyof C, string>[];
        if (!rowNames.length) throw new Error('No columns found!');
        return `SET ${rowNames.map((col) => `"${col}" = ${(columns as C)[col].compile(row[col])}`).join(',')}`;
    },
} satisfies Record<string, Builder>;
