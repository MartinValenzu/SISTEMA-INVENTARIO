// INVENTTRACK — Demostración local de inventario. No incluye backend ni base de datos.
const STORAGE_KEY = 'inventtrack-demo-v1';
const SAMPLE_PRODUCTS = [
  { id: 1, code: 'TEC-001', name: 'Portátil de oficina', category: 'Tecnología', price: 2850000, quantity: 8, minimum: 3 },
  { id: 2, code: 'ACC-002', name: 'Mouse inalámbrico', category: 'Accesorios', price: 65000, quantity: 25, minimum: 6 },
  { id: 3, code: 'TEC-003', name: 'Monitor 24 pulgadas', category: 'Tecnología', price: 720000, quantity: 4, minimum: 4 },
  { id: 4, code: 'ACC-004', name: 'Teclado mecánico', category: 'Accesorios', price: 180000, quantity: 12, minimum: 5 },
  { id: 5, code: 'CON-005', name: 'Cable HDMI 2 metros', category: 'Conectividad', price: 28000, quantity: 32, minimum: 8 },
  { id: 6, code: 'RED-006', name: 'Switch de red 8 puertos', category: 'Redes', price: 190000, quantity: 2, minimum: 4 }
];

const $ = (selector) => document.querySelector(selector);
const tableBody = $('#products-body');
const searchInput = $('#search-input');
const categorySelect = $('#category-select');
const feedback = $('#demo-feedback');
const formError = $('#form-error');
const dialog = $('#product-dialog');
const productForm = $('#product-form');
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
let products = loadProducts();
let nextId = Math.max(0, ...products.map((item) => item.id)) + 1;

function copyDefaults() {
  return SAMPLE_PRODUCTS.map((item) => ({ ...item }));
}

function validProduct(item) {
  return item && Number.isSafeInteger(item.id) && typeof item.name === 'string' &&
    typeof item.code === 'string' && typeof item.category === 'string' &&
    Number.isFinite(item.price) && Number.isSafeInteger(item.quantity) &&
    Number.isSafeInteger(item.minimum) && item.quantity >= 0 && item.minimum >= 0;
}

function loadProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return copyDefaults();
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.every(validProduct) ? parsed : copyDefaults();
  } catch (error) {
    return copyDefaults();
  }
}

function saveProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (error) {
    setFeedback('No se pudo guardar en este navegador. Los cambios podrían perderse al recargar.');
    return false;
  }
}

function setFeedback(message) {
  feedback.textContent = message;
}

function createCell(text, className = '') {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function createStatus(product) {
  const status = document.createElement('span');
  status.className = 'status-chip';
  if (product.quantity === 0) {
    status.classList.add('zero'); status.textContent = 'Sin stock';
  } else if (product.quantity <= product.minimum) {
    status.classList.add('low'); status.textContent = 'Stock bajo';
  } else {
    status.classList.add('ok'); status.textContent = 'Disponible';
  }
  return status;
}

function updateCategories() {
  const previous = categorySelect.value;
  const categories = [...new Set(products.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'es'));
  categorySelect.replaceChildren(new Option('Todas las categorías', ''));
  categories.forEach((category) => categorySelect.add(new Option(category, category)));
  categorySelect.value = categories.includes(previous) ? previous : '';
}

function render() {
  updateCategories();
  $('#total-products').textContent = products.length.toLocaleString('es-CO');
  $('#total-units').textContent = products.reduce((sum, item) => sum + item.quantity, 0).toLocaleString('es-CO');
  $('#low-stock').textContent = products.filter((item) => item.quantity <= item.minimum).length.toLocaleString('es-CO');

  const query = searchInput.value.trim().toLocaleLowerCase('es');
  const selected = categorySelect.value;
  const visible = products.filter((item) =>
    (!selected || item.category === selected) &&
    (!query || `${item.name} ${item.code}`.toLocaleLowerCase('es').includes(query))
  );

  tableBody.replaceChildren();
  visible.forEach((product) => {
    const row = document.createElement('tr');
    row.append(createCell(product.code, 'code-text'), createCell(product.name, 'product-name'),
      createCell(product.category), createCell(currency.format(product.price)));
    const stock = createCell(String(product.quantity));
    row.append(stock);
    const statusCell = document.createElement('td');
    statusCell.append(createStatus(product));
    row.append(statusCell);

    const actionCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'qty-actions';
    for (const [action, symbol, accessible] of [['decrease', '−', 'Restar una unidad de '], ['increase', '+', 'Agregar una unidad a ']]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = symbol;
      button.dataset.action = action; button.dataset.id = String(product.id);
      button.setAttribute('aria-label', accessible + product.name);
      button.disabled = action === 'decrease' ? product.quantity === 0 : product.quantity >= 999999;
      actions.append(button);
    }
    actionCell.append(actions); row.append(actionCell); tableBody.append(row);
  });
  if (visible.length === 0) {
    const row = document.createElement('tr');
    const cell = createCell('No hay productos que coincidan con la búsqueda.', 'empty-row');
    cell.colSpan = 7; row.append(cell); tableBody.append(row);
  }
  $('#table-count').textContent = `${visible.length} de ${products.length} productos`;
}

searchInput.addEventListener('input', render);
categorySelect.addEventListener('change', render);

tableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const product = products.find((item) => item.id === Number(button.dataset.id));
  if (!product) return;
  const delta = button.dataset.action === 'increase' ? 1 : -1;
  if (product.quantity + delta < 0 || product.quantity + delta > 999999) return;
  product.quantity += delta;
  setFeedback(`${product.name}: ${product.quantity} unidades disponibles (demostración).`);
  saveProducts(); render();
});

$('#add-button').addEventListener('click', () => {
  formError.textContent = '';
  productForm.reset();
  dialog.showModal();
  $('#p-name').focus();
});
$('#close-dialog').addEventListener('click', () => dialog.close());
$('#cancel-button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

productForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!productForm.reportValidity()) return;
  const name = $('#p-name').value.trim();
  const code = $('#p-code').value.trim().toUpperCase();
  const category = $('#p-category').value;
  const price = Number($('#p-price').value);
  const quantity = Number($('#p-quantity').value);
  const minimum = Number($('#p-minimum').value);
  if (!name || !code || !Number.isSafeInteger(price) || price < 0 ||
      !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999999 ||
      !Number.isSafeInteger(minimum) || minimum < 0 || minimum > 999999) {
    formError.textContent = 'Revisa el nombre, código y cantidades ingresadas.'; return;
  }
  if (products.some((item) => item.code.toLocaleLowerCase('es') === code.toLocaleLowerCase('es'))) {
    formError.textContent = 'Ese código ya está registrado en la demostración.'; return;
  }
  products.push({ id: nextId++, name, code, category, price, quantity, minimum });
  searchInput.value = ''; categorySelect.value = '';
  saveProducts(); render(); dialog.close();
  setFeedback(`${name} agregado al inventario de demostración.`);
});

$('#reset-button').addEventListener('click', () => {
  if (!window.confirm('¿Restablecer los productos de ejemplo y borrar los cambios de esta demostración?')) return;
  products = copyDefaults(); nextId = 7;
  searchInput.value = ''; categorySelect.value = '';
  saveProducts(); render(); setFeedback('Demostración restablecida.');
});

function safeCsvField(value) {
  // El prefijo evita que contenido del usuario se ejecute como fórmula al abrir el CSV en Excel.
  let text = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

$('#export-button').addEventListener('click', () => {
  const rows = [['Código', 'Producto', 'Categoría', 'Precio COP', 'Unidades', 'Mínimo'],
    ...products.map(({code,name,category,price,quantity,minimum}) => [code,name,category,price,quantity,minimum])];
  const csv = '\uFEFF' + rows.map((row) => row.map(safeCsvField).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'inventario-demostracion.csv';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setFeedback('Archivo CSV de demostración preparado para descargar.');
});

$('#year').textContent = new Date().getFullYear();
render();
