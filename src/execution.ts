import { z } from 'zod';
import { GeneralType, Types, schema } from './helper';
import Route from './route';
import HttpsResponse from './response';
import Server from './server';

const requestParser = Symbol();
function getRequestParser(
    route: (typeof Route)[GeneralType]
): z.ZodType<{ params: Record<string, unknown>; headers: Record<string, unknown>; query: Record<string, unknown>; body: unknown }> {
    if (requestParser in route === false) {
        const { bodySchema, headerSchema, paramsSchema, querySchema } = route[schema];
        Object.assign(route, {
            [requestParser]: z.object({
                params: z.object(paramsSchema),
                headers: z.object(headerSchema),
                query: z.object(querySchema),
                body: bodySchema,
            }),
        });
    }
    return (route as never as { [requestParser]: unknown })[requestParser] as never;
}
const responseParser = Symbol();
function getResponseParser(route: (typeof Route)[GeneralType]): z.ZodType<{ headers: Record<string, unknown>; data: unknown; message: string }> {
    if (responseParser in route === false) {
        const { responseDataSchema, responseHeadersSchema } = route[schema];
        Object.assign(route, {
            [responseParser]: z.object({
                headers: z.object(responseHeadersSchema),
                data: responseDataSchema,
                message: z.string(),
            }),
        });
    }
    return (route as never as { [responseParser]: unknown })[responseParser] as never;
}

export function setup(
    route: (typeof Route)[GeneralType],
    request: (typeof Route)[Types]['Request']
): [(typeof Route)[Types]['Payload'], (typeof Route)[Types]['Attachments']] {
    const attachments = {} as Record<string, unknown>;
    const parsedResult = getRequestParser(route).safeParse(request);
    if (!parsedResult.success) throw new HttpsResponse('invalid-argument', 'Request was found to have wrong arguments', parsedResult.error);
    return [parsedResult.data, attachments];
}

export async function execute(
    route: (typeof Route)[GeneralType],
    payload: { headers: Record<string, unknown>; query: Record<string, unknown>; body: unknown; params: Record<string, unknown> },
    attachments: Record<string, unknown>,
    onUnknownError: (error: unknown) => (typeof HttpsResponse)[GeneralType]
): Promise<{ headers: Record<string, unknown>; data: (typeof HttpsResponse)[GeneralType] }> {
    try {
        const { implementation } = route[schema];
        const responseHeaders = {};
        for (const middleware of route.middleware) {
            const { implementation } = middleware[schema];
            const result = await implementation(payload as never, attachments as never, route);
            Object.assign(attachments, { [middleware.id]: result });
            Object.assign(responseHeaders, result.headers ?? {});
        }
        const result = await implementation(payload, attachments, route);
        Object.assign(responseHeaders, result.headers ?? {});
        const parsedObj = getResponseParser(route).safeParse({
            headers: responseHeaders,
            message: result.message ?? 'Successful execution',
            data: result.data ?? null,
        });
        if (!parsedObj.success) throw new Error(parsedObj.error.toString());
        return {
            headers: parsedObj.data.headers,
            data: new HttpsResponse('ok', parsedObj.data.message ?? 'Successful execution', parsedObj.data.data),
        };
    } catch (error) {
        return { headers: {}, data: error instanceof HttpsResponse ? error : onUnknownError(error) };
    }
}

export function getAllRoutes(server: (typeof Server)[GeneralType]): (typeof Route)[GeneralType][] {
    const routes: (typeof Route)[GeneralType][] = [];
    for (const collection in server.routes) {
        routes.push(...server.routes[collection]);
    }
    return routes;
}
