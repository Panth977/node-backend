import { z } from 'zod';
import { OpenAPIObject, OperationObject, ReferenceObject, SchemaObject } from 'zod-openapi/lib-types/openapi3-ts/dist/oas30';

const contextSchema = z.object({
    lang: z.enum(['ts', 'js']),
    schemaName: z.string(),
    baseUrlName: z.string(),
    routesName: z.string(),
});
type Context = z.infer<typeof contextSchema>;
type Method = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

function createSchemaCode(context: Context, schema: SchemaObject | ReferenceObject | null | undefined): { decorator: string; code: string } {
    if (!schema || !Object.keys(schema).length) {
        return { code: `z.any()`, decorator: '' };
    }
    if ('$ref' in schema) {
        return { code: `${context.schemaName}.${schema.$ref.substring(schema.$ref.lastIndexOf('/') + 1)}`, decorator: '' };
    }
    if (Array.isArray(schema.type)) throw new Error('unimplemented!');
    let outputCode: string;
    if (schema.anyOf) {
        let code = '';
        for (const possibleSchema of schema.anyOf) {
            const possibleSchemaCode = createSchemaCode(context, possibleSchema);
            code += `${possibleSchemaCode.code} ${possibleSchemaCode.decorator},`;
        }
        outputCode = `z.union([${code}])`;
    } else if (schema.type === 'array') {
        const itemSchemaCode = createSchemaCode(context, schema.items);
        const code = `${itemSchemaCode.code} ${itemSchemaCode.decorator}`;
        outputCode = `z.array(${code})`;
    } else if (schema.discriminator) {
        let code = '';
        for (const caseName in schema.discriminator.mapping) {
            const caseSchemaCode = createSchemaCode(context, { $ref: schema.discriminator.mapping[caseName] });
            code += `${caseSchemaCode.code} ${caseSchemaCode.decorator},`;
        }
        if (!code.length) {
            outputCode = `z.any()`;
        } else {
            outputCode = `z.discriminatedUnion(${schema.discriminator.propertyName}, [${code}])`;
        }
    } else if (schema.type === 'object' && typeof schema.additionalProperties === 'object') {
        const valueSchemaCode = createSchemaCode(context, schema.additionalProperties);
        const code = `${valueSchemaCode.decorator} ${valueSchemaCode.code}`;
        outputCode = `z.record(${code})`;
    } else if (schema.type === 'object') {
        let code = '';
        for (const propName in schema.properties) {
            const propSchemaCode = createSchemaCode(context, schema.properties[propName]);
            if (!schema.required?.includes(propName)) propSchemaCode.code = `z.optional(${code})`;
            code += `${propSchemaCode.decorator}${JSON.stringify(propName)}: ${propSchemaCode.code},`;
        }
        code = `z.object({${code}})`;
        if (schema.additionalProperties === false) {
            code += `.strict()`;
        } else if (schema.additionalProperties === true) {
            code += `.passthrough()`;
        } else {
            code += `.strip()`;
        }
        outputCode = code;
    } else if (schema.type === 'string' && schema.enum) {
        if (!schema.enum.length) {
            outputCode = `z.any()`;
        } else if (schema.enum.length === 1) {
            outputCode = `z.literal(${JSON.stringify(schema.enum[0])})`;
        } else {
            let code = ``;
            for (const element of schema.enum) {
                code += `z.literal(${JSON.stringify(element)}),`;
            }
            outputCode = `z.union([${code}])`;
        }
    } else {
        outputCode =
            {
                string: 'z.coerce.string()',
                number: 'z.coerce.number()',
                boolean: 'z.coerce.boolean()',
                date: 'z.coerce.date()',
                integer: 'z.coerce.number().int()',
                null: 'z.null()',
                any: 'z.any()',
            }[schema.type || 'any'] || 'z.any()';
    }
    if (schema.nullable) outputCode = `z.nullable(${outputCode})`;
    const decoratorObj: Record<string, unknown> = {};
    if (!schema) {
        Object.assign(decoratorObj, {
            //
        });
    } else if ('$ref' in schema) {
        Object.assign(decoratorObj, {
            //
        });
    } else {
        Object.assign(decoratorObj, {
            nullable: schema.nullable,
            readOnly: schema.readOnly,
            writeOnly: schema.writeOnly,
            xml: schema.xml,
            externalDocs: schema.externalDocs,
            example: schema.example,
            examples: schema.examples,
            deprecated: schema.deprecated,
            format: schema.format,
            not: schema.not,
            description: schema.description,
            default: schema.default,
            title: schema.title,
            multipleOf: schema.multipleOf,
            maximum: schema.maximum,
            exclusiveMaximum: schema.exclusiveMaximum,
            minimum: schema.minimum,
            exclusiveMinimum: schema.exclusiveMinimum,
            maxLength: schema.maxLength,
            minLength: schema.minLength,
            pattern: schema.pattern,
            maxItems: schema.maxItems,
            minItems: schema.minItems,
            uniqueItems: schema.uniqueItems,
            maxProperties: schema.maxProperties,
            minProperties: schema.minProperties,
        });
    }
    const decoratorCodeLines = [];
    for (const key in decoratorObj) {
        if (decoratorObj[key] !== undefined) {
            decoratorCodeLines.push(`@${key} "${JSON.stringify(decoratorObj[key])}"`);
        }
    }
    const decoratorCode = !decoratorCodeLines.length ? '' : `/**\n${decoratorCodeLines.map((x) => ` * ${x}`).join('\n')}\n */`;
    return { code: outputCode, decorator: decoratorCode };
}

function createRouteCode(
    context: Context,
    path: string,
    method: Method,
    route?: OperationObject
): { tags: string[]; decorator: string; code: string; name: string } {
    if (!route) throw new Error('Unimplemented!');
    const parameters =
        route.parameters?.map(function (x) {
            if ('$ref' in x) throw new Error('Unimplemented!');
            return x;
        }) ?? [];
    const reqBody = (function (): SchemaObject | ReferenceObject {
        if (!route.requestBody) return {};
        if ('$ref' in route.requestBody || !route.requestBody.content) throw new Error('Unimplemented!');
        const schemas = Object.values(route.requestBody.content);
        if (schemas.length > 1) return { oneOf: schemas.map((x) => x.schema ?? {}) };
        return schemas[0]?.schema ?? {};
    })();
    const resBody = (function (): SchemaObject | ReferenceObject {
        if (!route.responses.default) return {};
        if ('$ref' in route.responses.default || !route.responses.default.content) throw new Error('Unimplemented!');
        const schemas = Object.values(route.responses.default.content);
        if (schemas.length > 1) return { oneOf: schemas.map((x) => x.schema ?? {}) };
        return schemas[0]?.schema ?? {};
    })();
    const requestSchemaCode = createSchemaCode(context, {
        type: 'object',
        required: ['params', 'query', 'headers', 'body'],
        properties: {
            params: {
                type: 'object',
                required: parameters.filter((x) => x.required && x.in === 'path').map((x) => x.name),
                properties: Object.fromEntries(parameters.filter((x) => x.in === 'path').map((x) => [x.name, x.schema ?? {}] as const)),
                additionalProperties: false,
            },
            query: {
                type: 'object',
                required: parameters.filter((x) => x.required && x.in === 'query').map((x) => x.name),
                properties: Object.fromEntries(parameters.filter((x) => x.in === 'query').map((x) => [x.name, x.schema ?? {}] as const)),
                additionalProperties: true,
            },
            headers: {
                type: 'object',
                required: parameters.filter((x) => x.required && x.in === 'header').map((x) => x.name),
                properties: Object.fromEntries(parameters.filter((x) => x.in === 'header').map((x) => [x.name, x.schema ?? {}] as const)),
                additionalProperties: true,
            },
            body: reqBody,
        },
        additionalProperties: false,
    }).code;
    const responseSchemaCode = createSchemaCode(context, {
        type: 'object',
        required: ['headers', 'body'],
        properties: {
            headers: {
                type: 'object',
                required: parameters.filter((x) => x.required && x.in === 'header').map((x) => x.name),
                properties: Object.fromEntries(parameters.filter((x) => x.in === 'header').map((x) => [x.name, x.schema ?? {}] as const)),
                additionalProperties: true,
            },
            body: resBody,
        },
        additionalProperties: false,
    }).code;
    let props = '';
    props += `name: ${JSON.stringify(route.operationId)},`;
    props += `path: ${JSON.stringify(path)},`;
    props += `method: ${JSON.stringify(method)},`;
    props += `request: ${requestSchemaCode},`;
    props += `response: ${responseSchemaCode},`;
    const code = `Object.freeze({${props}})`;
    const decoratorObj: Record<string, unknown> = {
        tags: route.tags,
        summary: route.summary,
        externalDocs: route.externalDocs,
        description: route.description,
        operationId: route.operationId,
        deprecated: route.deprecated,
        security: route.security,
        servers: route.servers,
    };
    const decoratorCodeLines = [];
    for (const key in decoratorObj) {
        if (decoratorObj[key] !== undefined) {
            decoratorCodeLines.push(`@${key} "${JSON.stringify(decoratorObj[key])}"`);
        }
    }
    const decoratorCode = !decoratorCodeLines.length ? '' : `/**\n${decoratorCodeLines.map((x) => ` * ${x}`).join('\n')}\n */`;
    if (!route.operationId) throw new Error('No bundling name or endpoint name could be resolved!');
    return { tags: route.tags ?? [], name: route.operationId, decorator: decoratorCode, code };
}

const genVarName = (function () {
    let count = 1;
    return () => `var${count++}`;
})();

export function javascript(context: Context, json: OpenAPIObject) {
    context = contextSchema.parse(context);
    let code = context.lang === 'ts' ? tsDefaultCode : jsDefaultCode;
    if (json.servers?.length !== 1) throw new Error('Unimplemented!');
    code += (function () {
        return `const ${context.baseUrlName} = ${JSON.stringify(json.servers[0].url)};`;
    })();
    code += (function () {
        let code = '';
        for (const schemaName in json.components?.schemas) {
            const schema = createSchemaCode(context, json.components?.schemas[schemaName]);
            code += `${schema.decorator} get "${JSON.stringify(schemaName)}"() {return ${schema.code}},`;
        }
        return `const ${context.schemaName} = {${code}};`;
    })();
    code += (function () {
        let routesCode = '';
        const bundleCodes: Record<string, string> = { default: '' };
        for (const path in json.paths) {
            for (const method in json.paths[path]) {
                if (
                    method == 'get' ||
                    method == 'put' ||
                    method == 'post' ||
                    method == 'delete' ||
                    method == 'options' ||
                    method == 'head' ||
                    method == 'patch' ||
                    method == 'trace'
                ) {
                    const route = createRouteCode(context, path, method, json.paths[path][method]);
                    const routeName = genVarName();
                    routesCode += `${route.decorator} const ${routeName} = ${route.code};`;
                    bundleCodes.default += `${JSON.stringify(route.name)}: ${routeName},`;
                    for (const tag of route.tags) {
                        bundleCodes[tag] ??= '';
                        bundleCodes[tag] += `${JSON.stringify(route.name)}: ${routeName},`;
                    }
                }
            }
        }
        let code = '';
        for (const tag in bundleCodes) {
            code += `${JSON.stringify(tag)}: {${bundleCodes[tag]}},`;
        }
        return `${routesCode}; const ${context.routesName} = {${code}}`;
    })();
    return code;
}

const tsDefaultCode = `
type Endpoint = {
    path: string;
    method: string;
    request: z.ZodType;
    response: z.ZodType;
};
function buildApiCallHandler(server: string, func: <E extends Endpoint>(server: string, endpoint: E, payload: E['request']['_input']) => Promise<E['response']['_output']>): <E extends Endpoint>(endpoint: E, payload: E['request']['_input']) => Promise<E['response']['_output']> {
    return (endpoint, payload) => func(server, endpoint, payload);
}
`;
const jsDefaultCode = `
/** @typedef {{
 * path: string; 
 * method: string; 
 * request: z.ZodType; 
 * response: z.ZodType;
 * } Endpoint} */
/** 
 * @template {Endpoint} E
 * @typedef {(server: string, endpoint: E, payload: E['request']['_input']) => Promise<E['response']['_output']> Handler}
 * */
/** 
 * @template {Endpoint} E
 * @typedef {(endpoint: E, payload: E['request']['_input']) => Promise<E['response']['_output']> Invoke}
 * */
/**
 * @params {string} server
 * @params {Handler} func
 * @returns {Invoke}
 * */
function buildApiCallHandler(server, func) {
    return (endpoint, payload) => func(server, endpoint, payload);
}
`;
