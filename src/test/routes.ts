import { z } from 'zod';
import { functions } from '..';
import * as fs from 'fs';
import * as path from 'path';
import createHttpError from 'http-errors';
import { endpointFactory } from './factory';

const GET_File = endpointFactory.Factory1.http('get', '/file/{filename}', {
    reqPath: z.object({
        filename: z.string(),
    }),
    resHeaders: z.object({
        'Content-Type': z.string(),
        'Content-Disposition': z.string(),
    }),
    resMediaTypes: 'application/pdf',
    tags: ['TTT'],
    resBody: z.any(),
    wrappers: (params) => [
        //
        functions.wrapper.SafeParse(params),
        functions.wrapper.MemoData(params, { getKey: (input) => input.path.filename, expSec: 80 }),
        functions.wrapper.Debug(params),
    ],
    async func(context, input) {
        context.logger('input-endpoint', input);
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
const GET_Health = endpointFactory.Factory2.http('get', '/health', {
    tags: ['XXX'],
    resBody: z.any(),
    async func(context) {
        context;
        return {
            body: 'Every thing is up and running',
        };
    },
});
const POST_Echo = endpointFactory.Factory2.http('post', '/echo', {
    tags: ['XXX'],
    reqBody: z.any(),
    resBody: z.any(),
    async func(context, { body }) {
        context;
        return { body };
    },
});

export const routes = {
    GET_File,
    GET_Health,
    POST_Echo,
};
for (const key in routes) {
    routes[key as keyof typeof routes].setName(key);
}
