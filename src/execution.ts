import { z } from 'zod';
import RController from './route_controller';
import HttpsResponse from './response';
import Server from './server';
import { InferInput } from './schema';
import { ZodInputRecord } from './helper';

const requestParser = Symbol();
function getRequestParser(
    rController: RController
): z.ZodType<{ [k in 'header' | 'query' | 'params']: Record<string, unknown> } & { body: unknown }> {
    if (requestParser in rController === false) {
        Object.assign(rController, {
            [requestParser]: z.object({
                params: z.object(rController.info.params),
                headers: z.object(rController.request.header),
                query: z.object(rController.request.query),
                body: rController.request.body,
            }),
        });
    }
    return (rController as never as { [requestParser]: unknown })[requestParser] as never;
}
const responseParser = Symbol();
function getResponseParser(rController: RController): z.ZodType<{ headers: Record<string, unknown>; data: unknown; message: string }> {
    if (responseParser in rController === false) {
        Object.assign(rController, {
            [responseParser]: z.object({
                headers: z.object(rController.response.header),
                data: rController.response.body,
                message: z.string(),
            }),
        });
    }
    return (rController as never as { [responseParser]: unknown })[responseParser] as never;
}

export function prepare(
    rController: RController,
    request: InferInput<RController['request']> & { params: ZodInputRecord<RController['info']['params']> }
) {
    const attachments = {} as RController['requirements'];
    const parsedResult = getRequestParser(rController).safeParse(request);
    if (!parsedResult.success) throw HttpsResponse.build('invalid-argument', 'Request was found to have wrong arguments', parsedResult.error);
    const { params, ...payload } = parsedResult.data;
    return [payload, attachments, { route: rController.info, params }] as const;
}

export async function execute(
    rController: RController,
    [payload, attachments, { route, params }]: ReturnType<typeof prepare>,
    frameworkArg: unknown,
    onUnknownError: (error: unknown) => HttpsResponse
): Promise<{ headers: Record<string, unknown>; data: HttpsResponse }> {
    try {
        const responseHeaders = {};
        for (const mController of rController.middleware) {
            const result = await mController.implementation(payload, attachments, { route, params, frameworkArg });
            Object.assign(attachments, { [mController['info']['id']]: result });
            Object.assign(responseHeaders, (result as null | { header?: Record<string, unknown> })?.header ?? {});
        }
        const result = await rController.implementation(payload, attachments, { route, params, frameworkArg });
        Object.assign(responseHeaders, (result as null | { header?: Record<string, unknown> })?.header ?? {});
        const parsedObj = getResponseParser(rController).safeParse({
            headers: responseHeaders,
            message: result.message ?? 'Successful execution',
            data: result.data ?? null,
        });
        if (!parsedObj.success) throw new Error(parsedObj.error.toString());
        return {
            headers: parsedObj.data.headers,
            data: HttpsResponse.build('ok', parsedObj.data.message ?? 'Successful execution', parsedObj.data.data),
        };
    } catch (error) {
        return { headers: {}, data: error instanceof HttpsResponse ? error : onUnknownError(error) };
    }
}

export function getAllRoutes(server: Server): RController[] {
    const routes: RController[] = [];
    for (const collection in server.routes) {
        routes.push(...server.routes[collection]);
    }
    return routes;
}
