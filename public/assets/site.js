function normalize(value) {
  return value.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

const search = document.querySelector('#search');
if (search) {
  const cards = [...document.querySelectorAll('#projects .card')];
  search.addEventListener('input', () => {
    const query = normalize(search.value.trim());
    let found = false;
    for (const card of cards) {
      card.hidden = !normalize(card.dataset.name).includes(query);
      found ||= !card.hidden;
    }
    document.querySelector('#no-results').hidden = found;
  });
}

for (const image of document.querySelectorAll('.cover img')) {
  image.addEventListener('error', () => { image.hidden = true; });
  if (image.complete && !image.naturalWidth) image.hidden = true;
}

function feedback(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle('error', error);
  element.hidden = false;
}

async function mutate(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error('No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo completar la operación.');
  }
}

const form = document.querySelector('#project-form');
if (form) {
  const submit = document.querySelector('#submit-project');
  const note = document.querySelector('#form-message');
  const url = form.elements.image_url;
  const file = form.elements.image_file;

  function updateImageMode() {
    const mode = form.elements.mode.value;
    url.disabled = mode !== 'url';
    file.disabled = mode !== 'upload';
    url.required = !url.disabled;
    file.required = !file.disabled;
    document.querySelector('#image-url-field').hidden = url.disabled;
    document.querySelector('#image-file-field').hidden = file.disabled;
  }

  form.addEventListener('change', updateImageMode);
  updateImageMode();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (file.files[0]?.size > 4 * 1024 * 1024 && !file.disabled) {
      feedback(note, 'La portada supera el máximo de 4 MB.', true);
      return;
    }
    const id = form.dataset.id;
    submit.disabled = true;
    feedback(note, id ? 'Guardando cambios…' : 'Publicando proyecto…');
    try {
      await mutate(id ? '/api/projects/' + id : '/api/projects', {
        method: id ? 'PUT' : 'POST',
        body: new FormData(form),
      });
      location.assign('/admin?estado=' + (id ? 'editado' : 'publicado'));
    } catch (error) {
      feedback(note, error.message, true);
      submit.disabled = false;
    }
  });

  const catalogNote = document.querySelector('#catalog-message');
  const state = new URLSearchParams(location.search).get('estado');
  const states = { publicado: 'Proyecto publicado.', editado: 'Cambios guardados.', eliminado: 'Proyecto eliminado.' };
  if (Object.hasOwn(states, state)) {
    feedback(catalogNote, states[state]);
    history.replaceState(null, '', '/admin');
  }

  for (const button of document.querySelectorAll('.delete')) {
    button.addEventListener('click', async () => {
      const title = button.closest('.card').dataset.name;
      if (!window.confirm('¿Eliminar «' + title + '» del catálogo?')) return;
      button.disabled = true;
      try {
        await mutate('/api/projects/' + button.dataset.id, { method: 'DELETE' });
        location.assign('/admin?estado=eliminado');
      } catch (error) {
        feedback(catalogNote, error.message, true);
        button.disabled = false;
      }
    });
  }
}
