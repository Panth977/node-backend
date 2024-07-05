import { ROUTES } from '..';
import { middlewares } from './middleware';

export const endpointFactory = {
    Factory1: ROUTES.Endpoint.build().addMiddleware(middlewares.pass).addTags('aa'),
    Factory2: ROUTES.Endpoint.build(),
};
