import { z } from 'zod';
import { functions } from '..';
import * as fs from 'fs';
import * as path from 'path';
import createHttpError from 'http-errors';
import { defaultEndpointsFactory1, defaultEndpointsFactory2 } from './factory';

const GET_File = defaultEndpointsFactory1.http({
    method: 'get',
    path: '/file/{filename}',
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
const GET_Health = defaultEndpointsFactory2.http({
    method: 'get',
    path: '/health',
    tags: ['XXX'],
    resBody: z.any(),
    async func() {
        return {
            body: 'Every thing is up and running',
        };
    },
});

export const routes = {
    GET_File,
    GET_Health,
};
