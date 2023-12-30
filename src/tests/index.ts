console.log('index');
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';
extendZodWithOpenApi(z);
console.log('init done');
import './route_controller';
import { server } from './server';
console.log(JSON.stringify(server.openApiJson()));
