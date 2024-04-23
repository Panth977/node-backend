import { route } from '..';
import { middlewares } from './middleware';

export const endpointFactory = {
    Factory1: route.Endpoint.build().addMiddleware(middlewares.pass).addTags('aa'),
    Factory2: route.Endpoint.build(),
};
