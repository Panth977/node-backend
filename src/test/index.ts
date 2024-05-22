import { route } from '..';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import { routes } from './routes';
import compression from 'compression';

const router = route.handler.express.serve(route.getEndpointsFromBundle(routes), undefined, {
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
    serveCodesOn: '/auto-gen-code',
    serveUiOn: '/swagger/',
});
// express
const app = express();
app.use(compression()); // For compressing response bodies
app.use(express.json({ limit: '10mb' })); // For JSON payload
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For URL-encoded data
app.get('/file/:filename', (req, res) => {
    const filePath = path.join(__dirname, req.params.filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Manually setting the Content-Type and Content-Disposition headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);

    // Sending the file buffer directly
    res.send(fileBuffer);
});
app.post('/echo', (req, res) => {
    console.log('body', req.body);
    res.send(req.body);
});
app.use('/v2', router);
app.listen(8081, () => {
    console.log('Listning to port', 8081);
});
