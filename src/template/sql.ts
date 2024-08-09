// import { z } from 'zod';

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// type Builder<A extends unknown[] = any[]> = (...args: A) => string;

// interface Parser<Z extends z.ZodType> {
//     _schema: Z;
//     type: string;
//     encode(val: z.infer<Z> & (Record<never, never> | undefined)): string;
//     compile(arg: z.infer<Z>): string;
//     nullable(): Parser<Z extends z.ZodNullable<infer T> ? z.ZodNullable<T> : z.ZodNullable<Z>>;
//     unwrap(): Parser<Z extends z.ZodNullable<infer T> ? T : Z>;
// }

// const List = z.union([z.array(z.unknown()), z.set(z.unknown()).transform((x) => [...x])]);

// function ParserBuilder<D extends z.ZodType>(defaultSchema: D, type: string, encode: Parser<D>['encode']) {
//     return function <Z extends z.ZodType<z.infer<D>> = D>(_params: { _schema?: Z }) {
//         const params: Parser<Z> = {
//             _schema: _params._schema ?? (defaultSchema as never),
//             type: type,
//             encode,
//             nullable: function () {
//                 if (params._schema instanceof z.ZodNullable === true) return params;
//                 return ParserBuilder(params._schema.nullable() as never, params.type, params.encode)({});
//             } as never,
//             unwrap: function () {
//                 if (params._schema instanceof z.ZodNullable === false) return params;
//                 return ParserBuilder(params._schema.unwrap(), params.type, params.encode)({});
//             } as never,
//             compile(arg) {
//                 const val = params._schema.parse(arg);
//                 if (val === null) return `NULL`;
//                 return params.encode(val);
//             },
//         };
//         return params;
//     };
// }

// const Encode = {
//     text: (val: string) => `'${val.replace(/'/g, "''")}'`,
//     numeric: (val: number) => `${val}`,
//     boolean: (val: boolean) => (val ? 'TRUE' : 'FALSE'),
//     timestamp: (val: Date) => `'${val.toISOString()}'::TIMESTAMP`,
//     jsonb: (val: unknown) => `'${JSON.stringify(val).replace(/'/g, "''")}'::JSONB`,
// };

// export const Parsers = {
//     text: ParserBuilder(z.coerce.string(), `TEXT`, Encode.text),
//     varchar<Z extends z.ZodType<string> = z.ZodString>(_params: { len: number; _schema?: Z }) {
//         return ParserBuilder<Z>(_params._schema ?? (z.coerce.string().max(_params.len) as never), `VARCHAR(${_params.len})`, Encode.text)({});
//     },
//     numeric: ParserBuilder(z.coerce.number(), `NUMERIC`, Encode.numeric),
//     int: ParserBuilder(z.coerce.number().int(), `INT`, Encode.numeric),
//     boolean: ParserBuilder(z.coerce.boolean(), `BOOLEAN`, Encode.boolean),
//     timestamp: ParserBuilder(z.coerce.date(), `TIMESTAMP`, Encode.timestamp),
//     jsonb: ParserBuilder(z.any(), `JSONB`, Encode.jsonb),
//     list<T extends z.ZodType, Z extends z.ZodArray<T> = z.ZodArray<T>>(_params: { _schema?: Z; parser: Parser<T> }) {
//         return ParserBuilder<Z>(
//             _params._schema ?? (_params.parser._schema.array() as never),
//             `${_params.parser.type}[]`,
//             (val) => `{${val.map(_params.parser.encode).join(',')}}`
//         )({});
//     },
// } satisfies Record<string, (_params: never) => Parser<z.ZodType>>;

// export const Helpers = {
//     compile<Z extends z.ZodType>(arg: Z, parser: Parser<Z>) {
//         return parser.compile(arg);
//     },
//     jsonProp(target: string, prop: string[]) {
//         const path = [target, ...prop];
//         const lst = path.pop();
//         return `${path.map(Encode.text).join('->')} ->> ${lst}`;
//     },
//     in<T>(arr: T[], compile: Builder<[T]>) {
//         const val = List.parse(arr) as T[];
//         if (!val.length) return 'FALSE';
//         return `IN (${val.map((e) => compile(e)).join(',')})`;
//     },
//     notIn<T>(arr: T[], compile: Builder<[T]>) {
//         const val = List.parse(arr) as T[];
//         if (!val.length) return 'TRUE';
//         return `NOT IN (${val.map((e) => compile(e)).join(',')})`;
//     },
//     substring(txt: string) {
//         const val = z.string().parse(txt);
//         return `'%${val
//             .split('')
//             .map((x) => `\\${x === "'" ? "''" : x}`)
//             .join('')}%'`;
//     },
//     if<T>(
//         conditionIsTruly: T,
//         onTrue: Builder<[Exclude<T, null | undefined | 0 | false | ''>]>,
//         onFalse?: Builder<[Extract<T, null | undefined | 0 | false | ''>]>
//     ) {
//         if (conditionIsTruly) {
//             return onTrue(conditionIsTruly as never);
//         } else if (onFalse) {
//             return onFalse(conditionIsTruly as never);
//         } else {
//             return '';
//         }
//     },
//     for<T extends Record<never, never>>(obj: T, builder: Builder<[T[keyof T], T extends unknown[] ? number : string]>, separator = '') {
//         if (Array.isArray(obj)) return obj.map((v, i) => builder(v, i as never)).join(separator);
//         return (Object.keys(obj) as Extract<keyof T, string>[]).map((key) => builder(obj[key], key as never)).join(separator);
//     },
//     table<C extends Record<string, Parser<z.ZodType>>>(rows: { [k in keyof C]: z.infer<C[k]['_schema']> }[], columns: C) {
//         const names = Object.keys(columns) as Extract<keyof C, string>[];
//         if (!names.length) throw new Error('No columns found!');
//         return [
//             `SELECT ${[`CAST(NULL AS INT) AS i`, ...names.map((col) => `CAST(NULL AS ${columns[col].type}) AS "${col}"`)].join(',')} WHERE FALSE`,
//             ...rows.map((row, i) => `SELECT ${[`${i} AS i`, ...names.map((col) => `${columns[col].compile(row[col])} AS "${col}"`)].join(',')}`),
//         ].join('UNION ALL');
//     },
// } satisfies Record<string, Builder>;

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
