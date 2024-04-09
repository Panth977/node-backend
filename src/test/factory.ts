import { route } from '..';
import { middlewares } from './middleware';

export const defaultEndpointsFactory1 = route.Endpoint.build().addMiddleware(middlewares.pass).addTags('aa');
export const defaultEndpointsFactory2 = route.Endpoint.build();
