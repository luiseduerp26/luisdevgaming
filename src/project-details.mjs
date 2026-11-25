export const technicalFields = [
  { key: 'platforms', label: 'Sistemas compatibles', max: 160, placeholder: 'Ej. Windows 11 de 64 bits y Steam Deck' },
  { key: 'controls', label: 'Controles compatibles', max: 160, placeholder: 'Ej. Teclado, ratón y mando Xbox' },
  { key: 'requirements', label: 'Requisitos mínimos', max: 800, placeholder: 'Procesador, memoria RAM, tarjeta gráfica y espacio en disco', multiline: true },
  { key: 'features', label: 'Prestaciones probadas', max: 800, placeholder: 'Ej. 4K, ultrawide 21:9 o 60 FPS', multiline: true },
];

export function currentRelease(project = {}) {
  return {
    version: project.version ?? '',
    download_url: project.download_url ?? '',
    release_date: project.release_date ?? '',
    download_size: project.download_size ?? '',
    release_notes: project.release_notes ?? '',
  };
}
