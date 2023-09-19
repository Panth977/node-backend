import type { Application, Response, Request } from 'express';
import HttpsResponse from '../response';
import type Server from '../server';

const express = Symbol('express');

export function getExpressVars(attachments: Record<string, unknown>): { request: Request; response: Response } {
    const { ...x } = (attachments as { [express]: { request: Request; response: Response } })[express] ?? {};
    return x;
}

export default function (app: Application, server: (typeof Server)['__general'], onError?: (error: unknown) => (typeof HttpsResponse)['__general']) {
    function createErrorResponse(error: unknown) {
        try {
            if (error instanceof HttpsResponse) return error;
            if (onError) return onError(error);
        } catch (_) {
            error = _;
        }
        console.log(error);
        return new HttpsResponse('internal', 'Something went wrong', null);
    }
    function addResponseHeaders(response: Response, headers: Record<string, unknown>) {
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
    function setResponseData(response: Response, responseData: (typeof HttpsResponse)['__general']) {
        response.status(responseData.httpErrorCode.status);
        response.send(responseData.toJSON());
    }

    for (const collection in server.routes) {
        for (const route of server.routes[collection]) {
            app[route.method](route.path, async function (request, response) {
                try {
                    const [payload, attachments] = route.init(request);
                    Object.assign(attachments, { [express]: { request, response } });
                    for (const middleware of route.middleware) {
                        const result = await middleware.execute(request, payload, attachments, route);
                        addResponseHeaders(response, result.headers);
                    }
                    const result = await route.execute(request, payload, attachments);
                    addResponseHeaders(response, result.headers);
                    setResponseData(response, result.data);
                } catch (error) {
                    setResponseData(response, createErrorResponse(error));
                }
            });
        }
    }
}
