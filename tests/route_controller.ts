import { z } from 'zod';
import { Setup } from '../src';
import { r1, r2 } from './route';
import { m, m1, m2 } from './middleware_controller';

export const c1 = Setup(r1)
    .addRequest((s) => s.addHeader({ token: z.string() }))
    .addResponse((s) => s)
    .setImplementation(async function (p, a, f) {
        p.header.token;
        a;
        p.params.user_id;
        f.req;
    });
export const c2 = Setup(r2)
    .addRequest((s) => s.addHeader({ token: z.string() }))
    .addResponse((s) => s.addBody(z.string()))
    .addMiddleware(m1)
    .addMiddleware(m2)
    .addMiddleware(m)
    .setImplementation(async function (p, a, f, r) {
        p.header.token;
        a.i.aa;
        a.i2();
        f.req;
        r.configs;
        return { message: 'S', data: '' };
    });
