import { z } from 'zod';
import { OpenAPIObject } from 'zod-openapi/lib-types/openapi3-ts/dist/oas30';

const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;
export type Method = (typeof methods)[number];
export const optionSchema = z.object({
    routesCreated: z
        .record(z.string())
        .optional()
        .transform((x) => x ?? {}),
    dependencyCreated: z
        .record(z.string())
        .optional()
        .transform((x) => x ?? {}),
    code: z.undefined().transform(() => ''),
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
type Options = z.infer<typeof optionSchema>;

export function getAllSchemas(json: OpenAPIObject, options: Options) {
    const schemas = [];
    const createSchemaFor = options.createSchemaFor;
    const selection = createSchemaFor === undefined ? [] : createSchemaFor === '*' ? Object.keys(json.components?.schemas ?? {}) : createSchemaFor;
    for (const name of selection) {
        schemas.push({
            name,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            schema: json.components!.schemas![name]!,
        });
    }
    return schemas;
}

export function getAllRoutes(json: OpenAPIObject, options: Options) {
    const routes = [];
    const createRoutesFor = options.createRoutesFor;
    const selection =
        createRoutesFor === undefined
            ? []
            : createRoutesFor === '*'
              ? Object.keys(json.paths ?? {})
                    .map((path) => methods.map((method) => ({ path, method })))
                    .flat()
                    .filter(({ path, method }) => json.paths[path][method]?.operationId)
              : createRoutesFor instanceof Set
                ? Object.keys(json.paths ?? {})
                      .map((path) => methods.map((method) => ({ path, method })))
                      .flat()
                      .filter(({ path, method }) => createRoutesFor.has(json.paths[path][method]?.operationId as never))
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
