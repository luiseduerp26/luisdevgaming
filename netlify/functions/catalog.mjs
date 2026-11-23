import { getStore } from '@netlify/blobs';
import { handle } from '../../src/app.mjs';

export const config = {
  path: ['/', '/admin', '/admin/', '/admin/login', '/admin/logout', '/proyectos/:id',
    '/portadas/:key', '/api/projects', '/api/projects/:id'],
};

export default function catalog(request, context) {
  return handle(request, {
    store: () => getStore({ name: 'luisdevgaming', consistency: 'strong' }),
    password: process.env.ADMIN_PASSWORD,
    ip: context.ip || 'unknown',
  });
}
