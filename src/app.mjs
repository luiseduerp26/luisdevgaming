import { publicPage, adminPage, detailPage, messagePage } from './page.mjs';
import { authorized, checkPassword, clearCookie, configured, sessionCookie } from './auth.mjs';
import { getCatalog, putCatalog, removeImage } from './storage.mjs';

const limit = 4 * 1024 * 1024;
const idFormat = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const projectRoute = new RegExp('^/proyectos/(' + idFormat + ')$');
const uploadRoute = new RegExp('^/portadas/(' + idFormat + ')\\.(jpg|png)$');
const apiRoute = new RegExp('^/api/projects(?:/(' + idFormat + '))?$');
const policies = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { ...policies, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { ...policies, 'Cache-Control': 'no-store' } });
}

function asset(body, type) {
  return new Response(body, {
    headers: {
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function redirect(location, cookie) {
  return new Response(null, { status: 303, headers: {
    Location: location, 'Set-Cookie': cookie, 'Cache-Control': 'no-store',
  } });
}

function sameOrigin(request, url) {
  return request.headers.get('origin') === url.origin;
}

function signIn(message, status = 200) {
  return html(messagePage('Acceso de administrador', message, 'signin'), status);
}

async function authenticate(request, env, url) {
  if (!sameOrigin(request, url)) return signIn('Abre el panel desde LuisDevGaming e inténtalo de nuevo.', 403);
  if (!configured(env.password)) return html(messagePage('Panel pendiente de configuración',
    'Configura ADMIN_PASSWORD en Netlify con una clave de al menos 32 caracteres y vuelve a desplegar.'), 503);
  if (url.pathname === '/admin/logout') return redirect('/', clearCookie());
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) {
    return signIn('Usa el formulario del panel para iniciar sesión.', 400);
  }
  const content = await request.text();
  if (content.length > 4096) return signIn('La clave supera el tamaño permitido.', 413);
  const candidate = new URLSearchParams(content).get('password');
  const result = await checkPassword(env.store(), env.ip, env.password, candidate);
  if (result === 'rate') return signIn('Demasiados intentos. Vuelve a intentarlo en unos minutos.', 429);
  if (result !== 'ok') return signIn('La clave es incorrecta.', 401);
  return redirect('/admin', sessionCookie(env.password));
}

function stringField(data, field, max, label, required = false) {
  const value = data.get(field);
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > max || (required && !text)) {
    throw new InputError(label + ' debe contener ' + (required ? 'entre 1 y ' : 'hasta ') + max + ' caracteres.');
  }
  return text;
}

function webUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {
    // The same message covers malformed and disallowed URLs.
  }
  throw new InputError(label + ' debe empezar con https:// y ser válida.');
}

async function readForm(request) {
  const type = request.headers.get('content-type');
  if (!type?.startsWith('multipart/form-data;') || !request.body) {
    throw new InputError('Envía el formulario del panel.');
  }
  const maxBody = limit + 32 * 1024;
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) {
        await reader.cancel();
        throw new InputError('La portada supera el máximo de 4 MB.', 413);
      }
      chunks.push(value);
    }
    return await new Response(new Blob(chunks), { headers: { 'Content-Type': type } }).formData();
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError('No se pudo leer el formulario.');
  } finally {
    reader.releaseLock();
  }
}

async function readImage(file) {
  if (!(file instanceof File) || !file.size) throw new InputError('Selecciona un archivo JPG o PNG.');
  if (file.size > limit) throw new InputError('La portada supera el máximo de 4 MB.', 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82];
  const isPng = bytes.length >= 33 && pngHeader.every((byte, index) => bytes[index] === byte);
  const isJpeg = bytes.length >= 10 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!isPng && !isJpeg) throw new InputError('La portada debe ser un archivo JPG o PNG válido.');
  return {
    bytes,
    key: crypto.randomUUID() + (isPng ? '.png' : '.jpg'),
    type: isPng ? 'image/png' : 'image/jpeg',
  };
}

async function saveProject(request, store, snapshot, id) {
  const { projects } = snapshot;
  const previous = id ? projects.find((project) => project.id === id) : null;
  if (id && !previous) throw new InputError('El proyecto ya no existe.', 404);
  const form = await readForm(request);
  const title = stringField(form, 'title', 120, 'El nombre', true);
  const description = stringField(form, 'description', 1200, 'La descripción');
  const version = stringField(form, 'version', 40, 'La versión');
  const download = webUrl(stringField(form, 'download_url', 2048, 'La URL de descarga', true), 'La URL de descarga');

  let imageUrl = '';
  let imageKey = '';
  const mode = form.get('mode');
  if (mode === 'keep' && previous) {
    imageUrl = previous.image_url;
    imageKey = previous.image_key;
  } else if (mode === 'url') {
    imageUrl = webUrl(stringField(form, 'image_url', 2048, 'La URL de imagen', true), 'La URL de imagen');
  } else if (mode === 'upload') {
    const image = await readImage(form.get('image_file'));
    await store.set('covers/' + image.key, new Blob([image.bytes], { type: image.type }));
    imageKey = image.key;
  } else {
    throw new InputError('Elige una forma de agregar la portada.');
  }

  const projectId = id || crypto.randomUUID();
  const updated = {
    id: projectId,
    title,
    description,
    version,
    image_url: imageUrl,
    image_key: imageKey,
    download_url: download,
    created_at: previous?.created_at ?? Date.now(),
  };
  const next = previous ? projects.map((project) => project.id === id ? updated : project) : [updated, ...projects];
  if (!await putCatalog(store, snapshot, next)) {
    if (imageKey !== previous?.image_key) await removeImage(store, imageKey);
    throw new InputError('El catálogo cambió mientras editabas. Recarga el panel e inténtalo de nuevo.', 409);
  }
  if (imageKey !== previous?.image_key) await removeImage(store, previous?.image_key);
  return json({ id: projectId }, previous ? 200 : 201);
}

async function projectApi(request, env, url, id) {
  if (!authorized(request, env.password)) throw new InputError('Inicia sesión para continuar.', 403);
  if (!sameOrigin(request, url)) throw new InputError('Abre el panel desde LuisDevGaming e inténtalo de nuevo.', 403);
  const store = env.store();
  const snapshot = await getCatalog(store, true);
  if ((!id && request.method === 'POST') || (id && request.method === 'PUT')) {
    return saveProject(request, store, snapshot, id);
  }
  if (id && request.method === 'DELETE') {
    const project = snapshot.projects.find((entry) => entry.id === id);
    if (!project) throw new InputError('El proyecto ya no existe.', 404);
    const remaining = snapshot.projects.filter((entry) => entry.id !== id);
    if (!await putCatalog(store, snapshot, remaining)) {
      throw new InputError('El catálogo cambió. Recarga el panel e inténtalo de nuevo.', 409);
    }
    await removeImage(store, project.image_key);
    return json({ deleted: true });
  }
  throw new InputError('Operación no disponible.', 405);
}

export async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path.startsWith('/api/')) {
    try {
      const route = path.match(apiRoute);
      if (!route) return json({ error: 'Ruta no disponible.' }, 404);
      return await projectApi(request, env, url, route[1]);
    } catch (error) {
      if (error instanceof InputError) return json({ error: error.message }, error.status);
      console.error(error);
      return json({ error: 'Ocurrió un error al guardar el proyecto. Inténtalo de nuevo.' }, 503);
    }
  }

  try {
    if (path === '/admin/login' || path === '/admin/logout') {
      if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
      return await authenticate(request, env, url);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    if (path === '/') {
      const { projects } = await getCatalog(env.store());
      return html(publicPage(projects));
    }
    if (path === '/admin' || path === '/admin/') {
      if (!configured(env.password)) return html(messagePage('Panel pendiente de configuración',
        'Configura ADMIN_PASSWORD en Netlify con una clave de al menos 32 caracteres y vuelve a desplegar.'), 503);
      if (!authorized(request, env.password)) return signIn('Ingresa tu clave privada para publicar y editar los ports.');
      const { projects } = await getCatalog(env.store());
      const edit = url.searchParams.get('editar');
      const project = edit ? projects.find((entry) => entry.id === edit) : null;
      if (edit && !project) return html(messagePage('Proyecto no encontrado', 'Este proyecto ya no está disponible.'), 404);
      return html(adminPage(projects, project));
    }

    const project = path.match(projectRoute);
    if (project) {
      const { projects } = await getCatalog(env.store());
      const entry = projects.find((item) => item.id === project[1]);
      if (entry) return html(detailPage(entry));
    }

    const upload = path.match(uploadRoute);
    if (upload) {
      const key = path.slice('/portadas/'.length);
      const object = await env.store().get('covers/' + key, { type: 'arrayBuffer' });
      if (!object) return new Response(null, { status: 404 });
      return asset(object, upload[2] === 'png' ? 'image/png' : 'image/jpeg');
    }

    return html(messagePage('Página no encontrada', 'La dirección que abriste no está disponible.'), 404);
  } catch (error) {
    console.error(error);
    if (path === '/') return html(publicPage([], false), 503);
    return html(messagePage('No se pudo cargar la página', 'Vuelve a intentarlo en unos minutos.'), 503);
  }
}
