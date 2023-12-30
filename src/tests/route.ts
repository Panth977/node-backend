import { ExpressRoute } from './setup';

export const r1 = ExpressRoute('get', '/users/{user_id}', { description: '', tag: 'Entries' });
export const r2 = ExpressRoute('head', '/users', { description: '', tag: 'Entries' });
