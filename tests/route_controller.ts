import { z } from 'zod';
import { Schema, Setup } from '../src';
import { r1, r2 } from './route';
import { m, m1, m2 } from './middleware_controller';

export const c1 = Setup(r1)
    .addRequest(Schema().addHeader({ token: z.string() }))
    .addResponse(Schema())
    .setImplementation(async function (p, a, c) {
        p.header.token;
        a;
        c.params.user_id;
        c.frameworkArg.req;
        return { message: 'S' };
    });
export const c2 = Setup(r2)
    .addRequest(Schema().addHeader({ token: z.string() }))
    .addResponse(Schema())
    .addMiddleware(m1)
    .addMiddleware(m2)
    .addMiddleware(m)
    .setImplementation(async function (p, a, c) {
        p.header.token;
        a.i.aa;
        a.i2();
        c.frameworkArg.req;
        return { message: 'S' };
    });
c2.response.header.x
