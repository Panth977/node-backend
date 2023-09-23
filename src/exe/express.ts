import type { Application, Response, Request } from 'express';
import HttpsResponse from '../response';
import type Server from '../server';
import { GeneralType } from '../helper';
import { execute, getAllRoutes, setup } from '../execution';
import type Route from '../route';

const express = Symbol('express');

export function getExpressVars(attachments: Record<string, unknown>): { request: Request; response: Response } {
    const { ...x } = (attachments as { [express]: { request: Request; response: Response } })[express] ?? {};
    return x;
}

function createErrorResponse(error: unknown) {
    console.log(error);
    return new HttpsResponse('internal', 'Something went wrong', null);
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
function setResponseData(response: Response, responseData: (typeof HttpsResponse)[GeneralType]) {
    response.status(responseData.httpErrorCode.status);
    response.send(responseData.toJSON());
}
const AllowedMethods = new Set(['all', 'get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const);
function getMethod(route: (typeof Route)[GeneralType]): 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' {
    if (AllowedMethods.has(route.method)) return route.method;
    throw new Error('Unknown method found');
}

function exe(app: Application, server: (typeof Server)[GeneralType]) {
    const AllowedMethods = server.AllowedMethods.join(',');
    const AllowedHeaders = server.AllowedHeaders.join(',');
    app.use((_, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', AllowedMethods);
        res.header('Access-Control-Allow-Headers', AllowedHeaders);
        next();
    });
    for (const route of getAllRoutes(server)) {
        app[getMethod(route)](route.path, async function (request, response) {
            const [payload, attachments] = setup(route, request);
            Object.assign(attachments, { [express]: { request, response } });
            const result = await execute(route, payload, attachments, createErrorResponse);
            setResponseHeaders(response, result.headers);
            setResponseData(response, result.data);
        });
    }
}

export default exe;
