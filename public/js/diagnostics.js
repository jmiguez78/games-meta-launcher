// Para revisar: estado de cada tienda y juegos que necesitan atención.
import { request } from './api.js';
import { notifyError } from './feedback.js';

export async function loadHealth() {
  try {
    const data = await request('/api/health');
    const summary = document.querySelector('#health-summary');
    const tiles = [
      ['Detectados', data.total, 'en tu colección'],
      ['Listos', data.ready, 'con inicio disponible'],
      ['Revisión', data.review, data.review ? 'requieren atención' : 'sin alertas'],
      ['Índice', data.generatedAt ? 'OK' : '—', data.generatedAt ? 'actualizado localmente' : 'pendiente']
    ];
    summary.innerHTML = '';
    tiles.forEach(([label, value, hint]) => {
      const tile = document.createElement('article');
      tile.className = 'stat';
      tile.innerHTML = '<span></span><strong></strong><small></small>';
      tile.querySelector('span').textContent = label;
      tile.querySelector('strong').textContent = value;
      tile.querySelector('small').textContent = hint;
      summary.append(tile);
    });
    const rows = document.querySelector('#platform-health');
    rows.innerHTML = '';
    data.platforms.forEach((platform) => {
      const row = document.createElement('tr');
      row.innerHTML =
        '<th scope="row"></th><td></td><td><div class="meter-cell"><span></span>' +
        '<span class="meter" aria-hidden="true"><span></span></span></div></td><td><span class="status-pill"></span></td>';
      row.querySelector('th').textContent = platform.platform;
      row.querySelectorAll('td')[0].textContent = platform.total;
      row.querySelector('.meter-cell span').textContent = platform.ready + ' de ' + platform.total;
      row.querySelector('.meter span').style.width =
        (platform.total ? (platform.ready / platform.total) * 100 : 0) + '%';
      const status = row.querySelector('.status-pill');
      status.textContent = platform.review ? platform.review + ' para revisar' : 'Sin alertas';
      status.classList.toggle('attention', platform.review > 0);
      rows.append(row);
    });
  } catch (error) {
    notifyError(error, loadHealth);
  }
}
