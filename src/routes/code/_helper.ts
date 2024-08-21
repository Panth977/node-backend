import { z } from 'zod';
import { OpenAPIObject } from '../../type/zod-openapi';

const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;
export type Method = (typeof methods)[number];
export const defaultOptionsSchema = z.object({
    routesCreated: z
        .record(z.string())
        .optional()
        .default(() => ({})),
    dependencyCreated: z
        .record(z.string())
        .optional()
        .default(() => ({})),
    code: z.string().default(() => ''),
    //
    createSchemaFor: z.union([z.literal('*'), z.string().array()]).optional(),
    createRoutesFor: z
        .union([
            z.literal('*'),
            z
                .string()
                .array()
                .transform((x) => new Set(x)),
            z.object({ method: z.enum(methods), path: z.string() }).array(),
        ])
        .optional(),
});
type Options = z.infer<typeof defaultOptionsSchema>;

export function getAllSchemas(json: OpenAPIObject, options: Options) {
    const schemas = [];
    const createSchemaFor = options.createSchemaFor;
    const selection = createSchemaFor === undefined ? [] : createSchemaFor === '*' ? Object.keys(json.components?.schemas ?? {}) : createSchemaFor;
    for (const name of selection) {
        schemas.push({
            name: `#/components/schemas/${name}`,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            schema: json.components!.schemas![name]!,
        });
    }
    return schemas;
}

export function getAllRoutes(json: OpenAPIObject, options: Options) {
    const routes = [];
    const createRoutesFor = options.createRoutesFor;
    const paths = json.paths ?? {};
    const selection =
        createRoutesFor === undefined
            ? []
            : createRoutesFor === '*'
              ? Object.keys(paths)
                    .map((path) => methods.map((method) => ({ path, method })))
                    .flat()
                    .filter(({ path, method }) => paths[path][method]?.operationId)
              : createRoutesFor instanceof Set
                ? Object.keys(paths)
                      .map((path) => methods.map((method) => ({ path, method })))
                      .flat()
                      .filter(({ path, method }) => createRoutesFor.has(paths[path][method]?.operationId as never))
                : createRoutesFor;
    for (const { method, path } of selection) {
        routes.push({
            method,
            path,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            schema: json.paths![path]![method]!,
        });
    }
    return routes;
}
