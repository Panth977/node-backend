import { route } from '..';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { routes } from './routes';

const router = route.handler.express.serve(route.getEndpointsFromBundle(routes), {
    params: {
        openapi: '3.0.1',
        info: {
            title: 'Oizom',
            description: 'Api docs',
            version: '2.0.0',
            contact: { url: 'oizom.com' },
        },
        // security: [{ type: 'header', name: 'x-access-token' }], // TODO
        servers: [{ url: 'http://localhost:8080/v2', description: 'local' }],
    },
    serveJsonOn: '/swagger.json',
    serveUiOn: '/swagger/',
});
// express
const app = express();
app.get('/file/:filename', (req, res) => {
    const filePath = path.join(__dirname, req.params.filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Manually setting the Content-Type and Content-Disposition headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);

    // Sending the file buffer directly
    res.send(fileBuffer);
});
app.use('/v2', router);
app.listen(8080, () => {
    console.log('Listning to port', 8080);
});
