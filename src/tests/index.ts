console.log('index');
import { initZodForDocumentation } from '../index';
initZodForDocumentation();
console.log('init done');
import './route_controller';
import { server } from './server';
console.log(JSON.stringify(server.toJson()));
