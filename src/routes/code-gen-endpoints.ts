import { Endpoint } from './endpoint';
import * as code from './code';
import { HttpEndpoint } from './http';
import { Middleware } from './middleware';
import { defaultOptionsSchema } from './code/_helper';
import { OpenAPIObject } from '../type/zod-openapi';
type code = typeof code;

export function generateCodeHttpFactory(middlewares: Middleware.Build[], json: OpenAPIObject) {
    let endpoint = Endpoint.build();
    for (const mid of middlewares) {
        endpoint = endpoint.addMiddleware(mid);
    }
    const endpoints: {
        [k in keyof code]: HttpEndpoint.Build<
            undefined,
            undefined,
            undefined,
            code[k]['optionsSchema'],
            undefined,
            code[k]['optionsSchema'],
            undefined
        >;
    } = {} as never;
    for (const type in code) {
        // eslint-disable-next-line import/namespace
        const gen = code[type as keyof typeof code];
        const typePath = '/' + type;
        endpoints[type as keyof typeof endpoints] = endpoint.http('post', typePath, {
            name: type,
            namespace: 'CodeGen',
            _local: gen.exe,
            reqHeader: undefined,
            reqMediaTypes: undefined,
            reqPath: undefined,
            reqQuery: undefined,
            resHeaders: undefined,
            resMediaTypes: undefined,
            reqBody: (gen.optionsSchema as typeof defaultOptionsSchema).omit({
                code: true,
            }),
            resBody: defaultOptionsSchema.omit({ createSchemaFor: true, createRoutesFor: true }),
            async func(context, { body }) {
                return { body: gen.exe(json, body as never) };
            },
        }) as never;
    }
    return endpoints;
}
