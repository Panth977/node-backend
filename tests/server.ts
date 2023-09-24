import { Server, HttpsResponse, execute, prepare } from '../src';
import type { Application, Response } from 'express';
import { c1, c2 } from './route_controller';
import { z } from 'zod';
import { ExpressRoute } from './setup';

const server = new Server('1.0.0', 'Test Company', '').addRoute(c1).addRoute(c2);

function createErrorResponse(error: unknown) {
    console.log(error);
    return HttpsResponse('internal', 'Something went wrong', null);
}
function setResponseHeaders(response: Response, headers: Record<string, unknown>) {
    let exposedHeaders = response.getHeader('Access-Control-Expose-Headers') ?? new Set<string>();
    if (typeof exposedHeaders === 'number') exposedHeaders = exposedHeaders.toString();
    if (typeof exposedHeaders === 'string') exposedHeaders = exposedHeaders.split(',').map((x) => x.trim());
    exposedHeaders = new Set([...exposedHeaders, ...Object.keys(headers)]);
    response.setHeader('Access-Control-Expose-Headers', [...exposedHeaders]);
    for (const key in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, key)) {
            response.setHeader(key, headers[key] as never);
        }
    }
}
function setResponseData(response: Response, responseData: HttpsResponse) {
    response.status(responseData.httpErrorCode.status);
    response.send(responseData.toJSON());
}

function shouldLog(configs: unknown) {
    return z.object({ log: z.literal(true) }).safeParse(configs).success;
}

function exe(app: Application) {
    const AllowedMethods = server.AllowedMethods.join(',');
    const AllowedHeaders = server.AllowedHeaders.join(',');
    app.use((_, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', AllowedMethods);
        res.header('Access-Control-Allow-Headers', AllowedHeaders);
        next();
    });
    for (const route of server.routes) {
        const log = shouldLog(route.info.configs); 
        const routeInfo = ExpressRoute.getExpressRoute(route.info);
        app[routeInfo.method](routeInfo.path, async function (request, response) {
            if (log) console.log('Developer asked me to be logged', request.url);
            const args = prepare(route, {
                body: request.body,
                header: request.headers,
                params: request.params,
                query: request.query,
            });
            const result = await execute(route, args, { req: request, res: response }, createErrorResponse);
            setResponseHeaders(response, result.headers);
            setResponseData(response, result.data);
        });
    }
}

export default exe;
