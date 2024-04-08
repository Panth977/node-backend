import { z } from 'zod';
import { functions, route } from '..';
import * as fs from 'fs';
import * as path from 'path';
import createHttpError from 'http-errors';
import express from 'express';

const passMiddleware = route.createMiddleware('pass', {
    options: z.object({ isValid: z.boolean() }),
    reqHeader: z.object({}),
    reqQuery: z.object({}),
    resHeaders: z.object({}),
    tags: ['NNN'],
    wrappers: (params) => [
        //
        functions.wrapper.SafeParse(params),
        functions.wrapper.Debug(params),
    ],
    async func(context, input) {
        context.logger.debug('input', input);
        return {
            headers: {},
            options: { isValid: true },
        };
    },
});

const endpoints = new route.BundleEndpoints();
const defaultEndpointsFactory = route.Endpoint.build().addMiddleware(passMiddleware);
endpoints.ready = defaultEndpointsFactory.http('get', '/file/{filename}', {
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
    wrappers: (params) => [
        //
        functions.wrapper.SafeParse(params),
        functions.wrapper.MemoData(params, { getKey: (input) => input.path.filename, expSec: 80 }),
        functions.wrapper.Debug(params),
    ],
    async func(context, input) {
        context.logger.debug('input', input);
        if (!context.options.isValid) throw createHttpError.NotAcceptable();
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

endpoints.ready = defaultEndpointsFactory.http('get', '/health', {
    reqPath: z.object({}),
    reqHeader: z.object({}),
    reqQuery: z.object({}),
    reqBody: z.any(),
    resHeaders: z.object({}),
    tags: ['XXX'],
    resBody: z.any(),
    async func() {
        return {
            headers: {},
            body: 'Every thing is up and running',
        };
    },
});

const router = route.handler.express.serve(endpoints, {
    params: {
        openapi: '3.0.1',
        info: {
            title: 'Oizom',
            description: 'Api docs',
            version: '2.0.0',
            contact: { url: 'oizom.com' },
        },
        // security: [{ type: 'header', name: 'x-access-token' }], // TODO
        servers: [{ url: 'http://localhost:8080/v2', description: 'local' }],
    },
    serveJsonOn: '/swagger.json',
    serveUiOn: '/swagger/',
});
// express
const app = express();
app.get('/file/:filename', (req, res) => {
    const filePath = path.join(__dirname, req.params.filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Manually setting the Content-Type and Content-Disposition headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);

    // Sending the file buffer directly
    res.send(fileBuffer);
});
app.use('/v2', router);
app.listen(8080, () => {
    console.log('Listning to port', 8080);
});
