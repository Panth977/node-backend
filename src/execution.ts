import { z } from 'zod';
import RController from './route_controller';
import HttpsResponse from './response';
import { InferInput } from './schema';
import { ZodInputRecord } from './helper';

const requestParser = Symbol();
function getRequestParser(route: RController): z.ZodType<{ [k in 'header' | 'query' | 'params']: Record<string, unknown> } & { body: unknown }> {
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
function getResponseParser(route: RController): z.ZodType<{ headers: Record<string, unknown>; data: unknown; message: string }> {
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

export function prepare(route: RController, request: InferInput<RController['request']> & { params: ZodInputRecord<RController['info']['params']> }) {
    const parsedResult = getRequestParser(route).safeParse(request);
    if (!parsedResult.success) throw HttpsResponse.build('invalid-argument', 'Request was found to have wrong arguments', parsedResult.error);
    return parsedResult.data;
}

export async function execute(
    route: RController,
    { params, ...payload }: ReturnType<typeof prepare>,
    frameworkArg: unknown,
    onUnknownError: (error: unknown) => HttpsResponse
): Promise<{ headers: Record<string, unknown>; data: HttpsResponse }> {
    try {
        const attachments = {};
        const responseHeaders = {};
        for (const mController of route.middleware) {
            const result = await mController.implementation(payload, attachments, { route: route.info, params, frameworkArg });
            Object.assign(attachments, { [mController['info']['id']]: result });
            Object.assign(responseHeaders, (result as null | { header?: Record<string, unknown> })?.header ?? {});
        }
        const result = await route.implementation(payload, attachments, { route: route.info, params, frameworkArg });
        Object.assign(responseHeaders, (result as null | { header?: Record<string, unknown> })?.header ?? {});
        const parsedObj = getResponseParser(route).safeParse({
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
