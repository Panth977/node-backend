import { z } from 'zod';
import { r1, r2 } from './route';
import { m, m1, m2 } from './middleware_controller';

const zToken = z
    .string()
    .openapi({ description: 'is Token', ref: 'token', example: '1234567890' })
    .transform((x) => x.trim());
export const c1 = r1
    .addRequest((s) => s.addHeader({ token: zToken }))
    .addResponse((s) => s)
    .setImplementation(async function (p, a, f) {
        p.header.token;
        a;
        p.params.user_id;
        f.req;
    });
export const c2 = r2
    .addRequest((s) => s.addHeader({ token: zToken }))
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
