import { z } from 'zod';
import { functions, route } from '..';
import * as fs from 'fs';
import * as path from 'path';
import createHttpError from 'http-errors';
import { defaultEndpointsFactory1, defaultEndpointsFactory2 } from './factory';

const v1 = defaultEndpointsFactory1.http({
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
const v2 = defaultEndpointsFactory2.http({
    tags: ['XXX'],
    resBody: z.any(),
    async func() {
        return {
            body: 'Every thing is up and running',
        };
    },
});

export const routes = {
    [route.Endpoint.loc('get', '/file/{filename}')]: v1,
    [route.Endpoint.loc('get', '/health')]: v2,
};
