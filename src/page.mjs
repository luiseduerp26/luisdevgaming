const paths = {
  game: '<path d="M6.2 6h11.6a4 4 0 0 1 3.9 3.4l1 5.5a3.2 3.2 0 0 1-5.4 2.8L15.4 16H8.6l-1.9 1.7a3.2 3.2 0 0 1-5.4-2.8l1-5.5A4 4 0 0 1 6.2 6Z"/><path d="M8 9v5m-2.5-2.5h5m5.7-1h.01m2.9 2h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4m-4 4v2"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4 4"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
  link: '<path d="M10 13a4 4 0 0 0 6 .5l4-4a4 4 0 0 0-5.7-5.7L12 6m0 12-2.3 2.2A4 4 0 0 1 4 14.5l4-4a4 4 0 0 1 6 .5"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
};

function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
}

export function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

const brand = '<a href="/" class="brand" aria-label="LuisDevGaming, inicio"><span class="brand-icon">' + icon('game') + '</span><span>LuisDev<b>Gaming</b></span></a>';

function layout(title, body, active) {
  return `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="LuisDevGaming. Catálogo independiente de ports no oficiales para PC.">
<meta name="theme-color" content="#090f1d">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css"><script defer src="/assets/site.js"></script>
</head><body>
<header class="top"><div class="wrap top-inner">${brand}
<nav class="navigation" aria-label="Navegación principal">
<a href="/#catalogo"${active === 'catalog' ? ' aria-current="page"' : ''}>${icon('grid')} Catálogo</a>
<a href="/admin"${active === 'admin' ? ' aria-current="page"' : ''}>${icon('lock')} Administrador</a>
</nav></div></header>
<main>${body}</main>
<footer class="footer"><div class="wrap footer-inner">${brand}<p>Catálogo independiente de ports para PC</p></div></footer>
</body></html>`;
}

function empty(title, text, id = '') {
  return `<div class="empty"${id ? ' id="' + id + '" hidden' : ''}><div>
  <span class="empty-icon">${icon('grid')}</span><h3>${title}</h3><p>${text}</p>
  </div></div>`;
}

function card(project, admin = false, detail = false) {
  const id = escape(project.id);
  const image = project.image_key ? '/portadas/' + escape(project.image_key) : escape(project.image_url);
  const download = `<a class="button primary" href="${escape(project.download_url)}" target="_blank" rel="noopener noreferrer">${icon('download')} Descargar para PC</a>`;
  const actions = admin
    ? `<div class="actions"><a class="button secondary" href="/admin?editar=${id}#editor">Editar</a><button class="button danger delete" data-id="${id}" type="button">Eliminar</button></div>`
    : detail ? download : `<div class="actions">${download}<a class="button secondary" href="/proyectos/${id}">Ver ficha</a></div>`;
  return `<article class="card" data-name="${escape(project.title)}">
  <div class="cover">${icon('game')}${image ? `<img src="${image}" alt="" decoding="async" ${detail ? '' : 'loading="lazy"'}>` : ''}</div>
  <div class="card-body">
  <span class="version">PC${project.version ? ' · ' + escape(project.version) : ''}</span>
  ${detail ? '' : `<h3>${escape(project.title)}</h3>`}${project.description ? `<p>${escape(project.description)}</p>` : ''}${actions}
  </div></article>`;
}

export function publicPage(projects, loaded = true) {
  return layout('LuisDevGaming · Ports no oficiales para PC', `<div class="wrap">
<section class="hero" aria-labelledby="titulo"><div class="hero-art"></div><div class="hero-shade"></div>
<div class="hero-content">
<div class="kicker">${icon('monitor')} Catálogo independiente</div>
<h1 id="titulo">Ports no oficiales.<span>Para PC.</span></h1>
<p>Explora mis proyectos terminados y descarga cada port desde su servidor de alojamiento.</p>
<a class="button primary" href="#catalogo">${icon('grid')} Explorar catálogo</a>
</div></section>
<section class="catalog" id="catalogo" aria-labelledby="catalog-title">
<div class="sectionbar"><div><h2 id="catalog-title">Catálogo de proyectos</h2>
<p>${projects.length === 1 ? '1 port publicado' : projects.length > 1 ? projects.length + ' ports publicados' : 'Ports para PC'}</p></div>
${projects.length ? `<div class="searchbox">${icon('search')}<label class="visually-hidden" for="search">Buscar por nombre</label><input id="search" class="input" type="search" placeholder="Buscar un port…" autocomplete="off"></div>` : ''}
</div>
${projects.length ? `<div class="grid" id="projects">${projects.map((project) => card(project)).join('')}</div>
${empty('Sin coincidencias', 'Prueba con otro nombre.', 'no-results')}`
: loaded ? empty('Aún no hay ports publicados', 'Aquí aparecerán las fichas y descargas de los proyectos terminados.')
: empty('Catálogo temporalmente inaccesible', 'Recarga la página en unos minutos.')}
</section></div>`, 'catalog');
}

export function detailPage(project) {
  return layout(project.title + ' · LuisDevGaming', `<section class="wrap admin">
  <div class="sectionbar"><div><h1>${escape(project.title)}</h1><p>Port no oficial para PC</p></div>
  <a class="button secondary" href="/#catalogo">${icon('grid')} Volver al catálogo</a></div>
  <div class="detail-card">${card(project, false, true)}</div></section>`);
}

export function messagePage(title, text, statusType) {
  let link = '<a class="button secondary" href="/">Volver al catálogo</a>';
  if (statusType === 'signin') {
    link = '<form class="form" action="/admin/login" method="post">' +
      '<div class="field"><label for="password">Clave de administrador</label>' +
      '<input type="password" class="input" id="password" name="password" autocomplete="current-password" maxlength="512" required></div>' +
      '<div class="actions"><button class="button primary" type="submit">Iniciar sesión</button></div></form>';
  }
  return layout(title + ' · LuisDevGaming', `<div class="wrap admin"><section class="pane auth-card">
  <div class="empty-icon">${icon(statusType ? 'lock' : 'grid')}</div>
  <h1>${title}</h1><p class="quiet">${text}</p>${link}</section></div>`, statusType ? 'admin' : '');
}

export function adminPage(projects, project) {
  const mode = project ? 'keep' : 'url';
  return layout('Administrador · LuisDevGaming', `<section class="wrap admin">
  <div class="sectionbar"><div><h1>Administrador</h1><p>Publica y edita los proyectos del catálogo.</p></div>
  <form method="post" action="/admin/logout"><button class="button secondary" type="submit">Cerrar sesión</button></form></div>
  <div class="admin-layout"><section class="pane" id="editor"><h2>${project ? 'Editar proyecto' : 'Publicar proyecto'}</h2>
  <form class="form" id="project-form" data-id="${escape(project?.id)}">
  <div class="field"><label for="title">Nombre del juego</label><input id="title" name="title" class="input" maxlength="120" required value="${escape(project?.title)}"></div>
  <div class="field"><label for="description">Descripción</label><textarea id="description" name="description" maxlength="1200" placeholder="Cuenta de qué trata el port.">${escape(project?.description)}</textarea></div>
  <div class="field"><label for="version">Versión <small>(opcional)</small></label><input id="version" name="version" class="input" maxlength="40" placeholder="Ej. 1.0" value="${escape(project?.version)}"></div>
  <div class="field"><label for="download-url">URL de descarga</label><input id="download-url" name="download_url" type="url" class="input" maxlength="2048" placeholder="https://…" required value="${escape(project?.download_url)}"></div>
  <fieldset class="options"><legend>Portada</legend><div class="choices">
  ${project ? '<label><input type="radio" name="mode" value="keep" checked> Conservar</label>' : ''}
  <label><input type="radio" name="mode" value="url"${mode === 'url' ? ' checked' : ''}> URL de imagen</label>
  <label><input type="radio" name="mode" value="upload"> Subir JPG o PNG</label>
  </div>
  <div class="field" id="image-url-field"${mode !== 'url' ? ' hidden' : ''}><label class="visually-hidden" for="image-url">URL de imagen</label><input class="input" id="image-url" name="image_url" type="url" maxlength="2048" placeholder="https://…" value="${escape(project?.image_url)}"></div>
  <div class="field" id="image-file-field" hidden><label class="visually-hidden" for="image-file">Archivo de imagen</label><input class="input" id="image-file" name="image_file" type="file" accept="image/jpeg,image/png" aria-describedby="file-help"><small id="file-help">Tamaño máximo de 4 MB.</small></div>
  </fieldset>
  <p id="form-message" class="message" role="status" hidden></p>
  <div class="actions"><button class="button primary" id="submit-project" type="submit">${icon('add')} ${project ? 'Guardar cambios' : 'Publicar proyecto'}</button>
  ${project ? '<a class="button secondary" href="/admin#editor">Cancelar</a>' : ''}</div></form></section>
  <section class="pane"><h2>Proyectos publicados (${projects.length})</h2>
  <p class="message" id="catalog-message" role="status" hidden></p>
  ${projects.length ? `<div class="grid">${projects.map((entry) => card(entry, true)).join('')}</div>` : empty('Todavía no hay proyectos', 'Completa el formulario para publicar el primero.')}
  </section></div></section>`, 'admin');
}
