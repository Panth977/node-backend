import { z } from 'zod';
import { Setup } from '../src';
import { ExpressMiddleware } from './setup';
export const m1 = Setup(ExpressMiddleware('i1'))
    .addRequest((s) => s.addHeader({ token: z.string() }))
    .addImplementation(async function (p, a, f) {
        f.res.on('finish', function () {
            console.log('Completed');
        });
        p.header.token;
        return '';
    });
export const m2 = Setup(ExpressMiddleware('i2'))
    .addRequest((s) => s.addHeader({ ddd: z.string() }))
    .addResponse((s) => s.addHeader({ x: z.string() }))
    .addImplementation(async function (p) {
        p.header.ddd;
        return Object.assign({ 44: '', header: { x: '' } }, function () {
            //
        });
    });
export const m = Setup(ExpressMiddleware('i'))
    .addRequest((s) => s)
    .addResponse((s) => s)
    .addPreRequisite(() => m1)
    .addPreRequisite(() => m2)
    .addImplementation(async function (p, a) {
        p.header.token;
        p.header.ddd;
        a.i2[44];
        a.i1;
        a.i2();
        return { aa: '' };
    });
