import { z } from 'zod';
import { ExpressRoute } from './setup';

export const r1 = ExpressRoute('get', 'users/:user_id').addParams({ user_id: z.string() });
export const r2 = ExpressRoute('all', 'users').addConfigs({ log: true });
