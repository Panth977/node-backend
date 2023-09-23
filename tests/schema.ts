import { z } from 'zod';
import { Schema } from '../src';

export const s1 = Schema().addQuery({ z: z.string() }).addQuery({ p: z.string() });
export const s2 = Schema().addQuery({ z2: z.string() }).addHeader({ p2: z.string() }).addBody(z.string());
const s = s1.merge(s2);
const a = z.object(s.query).parse('');
