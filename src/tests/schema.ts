import { z } from 'zod';
import { Schema } from '..';

const zParam = z.string().openapi({ example: '98765432', ref: 'zParam' });
export const s1 = Schema().addQuery({ z: zParam }).addQuery({ p: z.string() });
export const s2 = Schema().addQuery({ z2: zParam }).addHeader({ p2: z.string() }).addBody(z.string());
const s = s1.merge(s2);
export const a = z.object(s.query).parse('');
