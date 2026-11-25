import { currentRelease, technicalFields } from './project-details.mjs';

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

const logoPath = '/assets/luisdevgaming-logo.webp';
const discordInvite = 'https://discord.gg/YZQjqdtsK';
const brand = `<a href="/" class="brand" aria-label="LuisDevGaming, inicio">
  <img class="brand-icon" src="${logoPath}" width="48" height="48" alt="">
  <span>LuisDev<b>Gaming</b></span></a>`;

function layout(title, body, active) {
  return `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="LuisDevGaming. Catálogo independiente de ports no oficiales para PC.">
<meta name="theme-color" content="#090f1d">
<link rel="icon" href="${logoPath}" type="image/webp">
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

function cover(project, lazy = true) {
  const image = project.image_key ? '/portadas/' + escape(project.image_key) : escape(project.image_url);
  return `<div class="cover">${icon('game')}${image ? `<img src="${image}" alt="" decoding="async"${lazy ? ' loading="lazy"' : ''}>` : ''}</div>`;
}

function downloadButton(url, label, secondary = false) {
  return `<a class="button ${secondary ? 'secondary' : 'primary'}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${icon('download')} ${label}</a>`;
}

const formatReleaseDate = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' });

function releaseMeta(release) {
  const date = release.release_date;
  const published = date ? `<time datetime="${escape(date)}">${formatReleaseDate.format(new Date(date + 'T00:00:00Z'))}</time>` : '';
  return [published, escape(release.download_size)].filter(Boolean).join(' · ');
}

function releaseHistory(history) {
  if (!history.length) return '';
  return `<section class="pane release-history" aria-labelledby="release-history-title">
  <h2 id="release-history-title">Historial de versiones</h2>
  <ol class="release-list">${history.map((release) => `<li class="release-entry">
    <div class="release-entry-heading"><div><h3>${escape(release.version || 'Versión anterior')}</h3>
    ${releaseMeta(release) ? `<p class="quiet">${releaseMeta(release)}</p>` : ''}</div>
    ${downloadButton(release.download_url, 'Descargar', true)}</div>
    ${release.release_notes ? `<p class="release-notes">${escape(release.release_notes)}</p>` : ''}
  </li>`).join('')}</ol></section>`;
}

function technicalDetails(project) {
  const fields = technicalFields.filter(({ key }) => project.technical?.[key]);
  if (!fields.length) return '';
  return `<section class="pane" aria-labelledby="technical-title"><h2 id="technical-title">Ficha técnica</h2>
  <dl class="technical-list">${fields.map(({ key, label }) => `<div><dt>${label}</dt><dd>${escape(project.technical[key])}</dd></div>`).join('')}</dl></section>`;
}

function card(project, admin = false) {
  const id = escape(project.id);
  const download = downloadButton(project.download_url, 'Descargar para PC');
  const actions = admin
    ? `<div class="actions"><a class="button secondary" href="/admin?editar=${id}#editor">Editar</a><button class="button danger delete" data-id="${id}" type="button">Eliminar</button></div>`
    : `<div class="actions">${download}<a class="button secondary" href="/proyectos/${id}">Ver ficha</a></div>`;
  return `<article class="card" data-name="${escape(project.title)}">
  ${cover(project)}
  <div class="card-body">
  <span class="version">PC${project.version ? ' · ' + escape(project.version) : ''}</span>
  <h3>${escape(project.title)}</h3>${project.description ? `<p>${escape(project.description)}</p>` : ''}${actions}
  </div></article>`;
}

export function publicPage(projects, loaded = true) {
  return layout('LuisDevGaming · Ports no oficiales para PC', `<div class="wrap">
<section class="hero" aria-labelledby="titulo"><div class="hero-art"></div><div class="hero-shade"></div>
<div class="hero-content">
<div class="kicker">${icon('monitor')} Catálogo independiente</div>
<h1 id="titulo">Ports no oficiales.<span>Para PC.</span></h1>
<p>Explora mis proyectos terminados y descarga cada port desde su servidor de alojamiento.</p>
<div class="actions">
  <a class="button primary" href="#catalogo">${icon('grid')} Explorar catálogo</a>
  <a class="button discord-button" href="${discordInvite}" target="_blank" rel="noopener noreferrer">${icon('link')} Únete a Discord</a>
</div>
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
  const release = currentRelease(project);
  const meta = releaseMeta(release);
  return layout(project.title + ' · LuisDevGaming', `<section class="wrap admin project-detail">
  <div class="sectionbar"><div><h1>${escape(project.title)}</h1><p>Port no oficial para PC</p></div>
  <a class="button secondary" href="/#catalogo">${icon('grid')} Volver al catálogo</a></div>
  <div class="project-detail-grid">
    <div class="project-detail-column">
      <div class="card">${cover(project, false)}
      ${project.description ? `<div class="card-body"><p class="project-description">${escape(project.description)}</p></div>` : ''}</div>
      ${technicalDetails(project)}
    </div>
    <div class="project-detail-column">
      <section class="pane latest-release" aria-labelledby="latest-release-title">
        <h2 id="latest-release-title">Última versión${release.version ? ' · ' + escape(release.version) : ''}</h2>
        ${meta ? `<p class="quiet">${meta}</p>` : ''}
        ${release.release_notes ? `<p class="release-notes">${escape(release.release_notes)}</p>` : ''}
        ${downloadButton(release.download_url, release.version ? 'Descargar última versión' : 'Descargar para PC')}
      </section>
      ${releaseHistory(project.release_history ?? [])}
    </div>
  </div></section>`);
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

function formField({ name, label, value, max, placeholder = '', type = 'text', multiline = false, required = false }) {
  const id = name.replaceAll('_', '-');
  const attributes = `id="${id}" name="${name}" class="input"${max ? ` maxlength="${max}"` : ''}${placeholder ? ` placeholder="${escape(placeholder)}"` : ''}${required ? ' required' : ''}`;
  const control = multiline ? `<textarea ${attributes}>${escape(value)}</textarea>` : `<input ${attributes} type="${type}" value="${escape(value)}">`;
  return `<div class="field"><label for="${id}">${label}</label>${control}</div>`;
}

function releaseFields(release = {}, prefix = '') {
  return [
    { key: 'version', label: 'Versión', max: 40, placeholder: 'Ej. 1.2.0' },
    { key: 'download_url', label: 'URL de descarga', max: 2048, type: 'url', placeholder: 'https://…', required: !prefix },
    { key: 'release_date', label: 'Fecha de publicación', type: 'date' },
    { key: 'download_size', label: 'Tamaño de descarga', max: 40, placeholder: 'Ej. 850 MB' },
    { key: 'release_notes', label: 'Novedades de la versión', max: 1800, multiline: true },
  ].map(({ key, ...field }) => formField({ ...field, name: prefix + key, value: release[key] })).join('');
}

export function adminPage(projects, project) {
  const mode = project ? 'keep' : 'url';
  return layout('Administrador · LuisDevGaming', `<section class="wrap admin">
  <div class="sectionbar"><div><h1>Administrador</h1><p>Publica y edita los proyectos del catálogo.</p></div>
  <form method="post" action="/admin/logout"><button class="button secondary" type="submit">Cerrar sesión</button></form></div>
  <div class="admin-layout"><section class="pane" id="editor"><h2>${project ? 'Editar proyecto' : 'Publicar proyecto'}</h2>
  <form class="form" id="project-form" data-id="${escape(project?.id)}">
  ${project ? `<input type="hidden" name="revision" value="${escape(project.revision)}">` : ''}
  <div class="field"><label for="title">Nombre del juego</label><input id="title" name="title" class="input" maxlength="120" required value="${escape(project?.title)}"></div>
  <div class="field"><label for="description">Descripción</label><textarea id="description" name="description" maxlength="1200" placeholder="Cuenta de qué trata el port.">${escape(project?.description)}</textarea></div>
  <fieldset class="options"><legend>${project ? 'Versión actual' : 'Primera versión'}</legend>
    ${releaseFields(project)}
  </fieldset>
  ${project ? `<details class="editor-details"><summary>Publicar una nueva versión</summary>
    <div class="form"><p class="quiet">Completa versión, fecha y URL, y pulsa Guardar cambios. La descarga actual pasará al historial.</p>
    ${releaseFields({}, 'new_')}</div></details>` : ''}
  <details class="editor-details"><summary>Ficha técnica (opcional)</summary>
    <div class="form">${technicalFields.map(({ key, ...field }) => formField({ ...field, name: key, value: project?.technical?.[key] })).join('')}</div>
  </details>
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
