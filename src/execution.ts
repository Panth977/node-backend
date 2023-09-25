import { z } from 'zod';
import RouteController from './route_controller';
import HttpsResponse from './response';
import { InferInput } from './schema';
import { ZodInputRecord } from './helper';

const requestParser = Symbol();
function getRequestParser(route: RouteController): z.ZodType<{ [k in 'header' | 'query' | 'params']: Record<string, unknown> } & { body: unknown }> {
    if (requestParser in route === false) {
        Object.assign(route, {
            [requestParser]: z.object({
                params: z.object(route.info.params),
                headers: z.object(route.request.header),
                query: z.object(route.request.query),
                body: route.request.body,
            }),
        });
    }
    return (route as never as { [requestParser]: unknown })[requestParser] as never;
}
const responseParser = Symbol();
function getResponseParser(route: RouteController): z.ZodType<{ headers: Record<string, unknown>; data: unknown; message: string }> {
    if (responseParser in route === false) {
        Object.assign(route, {
            [responseParser]: z.object({
                headers: z.object(route.response.header),
                data: route.response.body,
                message: z.string(),
            }),
        });
    }
    return (route as never as { [responseParser]: unknown })[responseParser] as never;
}

export function prepare(
    route: RouteController,
    request: InferInput<RouteController['request']> & { params: ZodInputRecord<RouteController['info']['params']> }
) {
    const parsedResult = getRequestParser(route).safeParse(request);
    if (!parsedResult.success) throw HttpsResponse.build('invalid-argument', 'Request was found to have wrong arguments', parsedResult.error.errors);
    return parsedResult.data;
}

export async function execute(
    route: RouteController,
    payload: ReturnType<typeof prepare>,
    frameworkArg: unknown
): Promise<{ headers: Record<string, unknown>; data: HttpsResponse }> {
    const attachments = {};
    const responseHeaders = {};
    for (const middleware of route.middleware) {
        const result = await middleware.implementation(payload, attachments, frameworkArg, route.info);
        Object.assign(attachments, { [middleware.info.id]: result });
        Object.assign(responseHeaders, (result as null | { header?: Record<string, unknown> })?.header ?? {});
    }
    const result = await route.implementation(payload, attachments, frameworkArg, route.info);
    Object.assign(responseHeaders, result?.header ?? {});
    const parsedObj = getResponseParser(route).safeParse({
        headers: responseHeaders,
        message: result?.message ?? 'Successful execution',
        data: result?.data ?? null,
    });
    if (!parsedObj.success) throw new Error(parsedObj.error.toString());
    return {
        headers: parsedObj.data.headers,
        data: HttpsResponse.build('ok', parsedObj.data.message ?? 'Successful execution', parsedObj.data.data),
    };
}
