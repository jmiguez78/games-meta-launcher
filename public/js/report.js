// Errores de la interfaz al registro de diagnóstico de la aplicación (sin datos personales: mensaje y lugar).
// Se envían como mucho veinte por sesión, para que un error repetido no llene el registro.
let sent = 0;
const seen = new Set();

export function report(level, message, detail) {
  const text = String(message || 'Error sin mensaje').slice(0, 500);
  if (sent >= 20 || seen.has(text)) return;
  seen.add(text);
  sent += 1;
  fetch('/api/log', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ level, message: text, detail: detail ? String(detail).slice(0, 2000) : undefined }),
    keepalive: true
  }).catch(() => {});
}

export function setup() {
  window.addEventListener('error', (event) => {
    const where = event.filename ? `${event.filename.replace(location.origin, '')}:${event.lineno}:${event.colno}` : '';
    report('error', event.message, [where, event.error?.stack].filter(Boolean).join(' '));
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    report('error', 'Promesa rechazada: ' + (reason?.message ?? reason), reason?.stack);
  });
}
