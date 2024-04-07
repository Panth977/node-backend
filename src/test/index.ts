// const { route } = require('@panth977/node-backend');
// const { z } = require('zod');
// const fs = require('fs');
// const path = require('path');
// const createHttpError = require('http-errors');
// const express = require('express');

import { z } from 'zod';
import { functions, route } from '..';
import * as fs from 'fs';
import * as path from 'path';
import createHttpError from 'http-errors';
import express from 'express';

const passMiddleware = route.createMiddleware({
    _name: 'pass',
    options: z.object({ isValid: z.boolean() }),
    reqHeader: z.object({}),
    reqQuery: z.object({}),
    resHeaders: z.object({}),
    tags: ['NNN'],
    _static: null,
    wrappers: [
        //
        functions.wrapper.AsyncSafeParse(),
        functions.wrapper.AsyncLogTime(),
    ],
    async func(context, input) {
        context.logger.debug('input', input);
        return {
            headers: {},
            options: { isValid: true },
        };
    },
});

const defaultEndpointsFactory = route.Endpoint.build().addMiddleware(passMiddleware);
const getFileRoute = defaultEndpointsFactory.http({
    path: '/getfile/{filename}',
    method: 'get',
    reqPath: z.object({
        filename: z.string(),
    }),
    reqHeader: z.object({}),
    reqQuery: z.object({}),
    reqBody: z.any(),
    resHeaders: z.object({
        'Content-Type': z.string(),
        'Content-Disposition': z.string(),
    }),
    otherResMediaTypes: ['application/pdf'],
    tags: ['TTT'],
    resBody: z.any(),
    _static: {},
    wrappers: [
        //
        functions.wrapper.AsyncSafeParse() as never,
        functions.wrapper.AsyncMemoData({ getKey: (input) => input.path.filename, expSec: 80 }) as never,
        functions.wrapper.AsyncLogTime() as never,
    ],
    async func(context, input) {
        context.logger.debug('input', input);
        if (!context.options.isValid) throw createHttpError.NotAcceptable();
        // Assuming you have a file named 'example.pdf' in the same directory
        console.log(__dirname, input.path.filename);
        const filePath = path.join(__dirname, input.path.filename);
        const fileBuffer = fs.readFileSync(filePath);
        await new Promise((r) => setTimeout(r, 5000));
        return {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
            },
            body: fileBuffer,
        };
    },
});

const healthRoute = defaultEndpointsFactory.http({
    path: '/health',
    method: 'get',
    reqPath: z.object({}),
    reqHeader: z.object({}),
    reqQuery: z.object({}),
    reqBody: z.any(),
    resHeaders: z.object({}),
    tags: ['XXX'],
    resBody: z.any(),
    _static: {},
    async func() {
        return {
            headers: {},
            body: 'Every thing is up and running',
        };
    },
});

const routes = [getFileRoute, healthRoute] as never;

const app = express();
const router = route.handler.express.serve(routes, {
    params: {
        openapi: '3.0.1',
        info: {
            title: 'Oizom',
            description: 'Api docs',
            version: '2.0.0',
            contact: { url: 'oizom.com' },
        },
        // security: [{ type: 'header', name: 'x-access-token' }], // TODO
        servers: [{ url: 'http://localhost:8080/', description: 'local' }],
    },
    serveJsonOn: '/swagger.json',
    serveUiOn: '/swagger/',
});
app.get('/getfile', (req, res) => {
    const filePath = path.join(__dirname, 'example.pdf');
    const fileBuffer = fs.readFileSync(filePath);

    // Manually setting the Content-Type and Content-Disposition headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);

    // Sending the file buffer directly
    res.send(fileBuffer);
});
app.use(router);
app.listen(8080, () => {
    console.log('Listning to port', 8080);
});
