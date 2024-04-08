import { z } from 'zod';
import { functions, route } from '..';
import * as fs from 'fs';
import * as path from 'path';
import createHttpError from 'http-errors';
import express from 'express';

const passMiddleware = route.createMiddleware('pass', {
    options: z.object({ isValid: z.boolean() }),
    tags: ['NNN'],
    reqHeader: z.object({}).passthrough(),
    wrappers: (params) => [
        //
        functions.wrapper.SafeParse(params),
        functions.wrapper.Debug(params),
    ],
    async func(context, input) {
        context.logger.debug('input-middleware', input);
        return {
            options: { isValid: true },
        };
    },
});

const endpoints = new route.BundleEndpoints();
const defaultEndpointsFactory1 = route.Endpoint.build().addMiddleware(passMiddleware).addTags('aa');
const defaultEndpointsFactory2 = route.Endpoint.build();
const getFile = defaultEndpointsFactory1.http('get', '/file/{filename}', {
    reqPath: z.object({
        filename: z.string(),
    }),
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
        context.logger.debug('input-endpoint', input);
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
endpoints.ready = getFile;
endpoints.ready = defaultEndpointsFactory2.http('get', '/health', {
    tags: ['XXX'],
    resBody: z.any(),
    async func() {
        return {
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
