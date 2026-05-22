const storageKey = "gst-workshop-ledger";
const tokenKey = "gst-workshop-token";

const starterData = {
  clients: [
    { id: crypto.randomUUID(), name: "Алексей Смирнов", phone: "+7 777 123 45 67", note: "Ноутбук для работы" },
    { id: crypto.randomUUID(), name: "ТОО Альфа", phone: "+7 701 555 22 11", note: "Безналичный расчет" }
  ],
  services: [
    { id: crypto.randomUUID(), name: "Диагностика", price: 3000, description: "Проверка неисправности и оценка ремонта" },
    { id: crypto.randomUUID(), name: "Чистка от пыли", price: 7000, description: "Профилактика системы охлаждения" },
    { id: crypto.randomUUID(), name: "Установка Windows", price: 9000, description: "Установка ОС, драйверов и базовых программ" }
  ],
  orders: []
};

let state = loadLocalState();
let printType = "short";
let apiMode = false;
let authToken = localStorage.getItem(tokenKey) || "";

const receiptTerms = [
  "Гарантия на товары GST - 1 год, если для конкретного товара не указан другой срок.",
  "Гарантия на работу сервиса - 14 дней с даты выдачи устройства.",
  "После уведомления клиента о готовности или отказе от ремонта хранение платное: 100 ₸ за каждый день.",
  "Ремонт выполняется после диагностики и согласования стоимости с клиентом.",
  "Клиент отвечает за резервную копию личных данных до передачи устройства в сервис."
];

const els = {
  loginScreen: document.querySelector("#loginScreen"),
  loginForm: document.querySelector("#loginForm"),
  userSelect: document.querySelector("#userSelect"),
  passwordInput: document.querySelector("#passwordInput"),
  loginError: document.querySelector("#loginError"),
  logoutButton: document.querySelector("#logoutButton"),
  syncStatus: document.querySelector("#syncStatus"),
  viewTitle: document.querySelector("#viewTitle"),
  navButtons: document.querySelectorAll(".nav-button"),
  views: document.querySelectorAll(".view"),
  quickOrderButton: document.querySelector("#quickOrderButton"),
  openCount: document.querySelector("#openCount"),
  todayTotal: document.querySelector("#todayTotal"),
  orderForm: document.querySelector("#orderForm"),
  orderId: document.querySelector("#orderId"),
  orderClient: document.querySelector("#orderClient"),
  device: document.querySelector("#device"),
  issue: document.querySelector("#issue"),
  status: document.querySelector("#status"),
  servicePicker: document.querySelector("#servicePicker"),
  workNotes: document.querySelector("#workNotes"),
  amount: document.querySelector("#amount"),
  prepay: document.querySelector("#prepay"),
  clearOrderForm: document.querySelector("#clearOrderForm"),
  orderSearch: document.querySelector("#orderSearch"),
  statusFilter: document.querySelector("#statusFilter"),
  ordersTable: document.querySelector("#ordersTable"),
  clientForm: document.querySelector("#clientForm"),
  clientId: document.querySelector("#clientId"),
  clientName: document.querySelector("#clientName"),
  clientPhone: document.querySelector("#clientPhone"),
  clientNote: document.querySelector("#clientNote"),
  clearClientForm: document.querySelector("#clearClientForm"),
  clientsList: document.querySelector("#clientsList"),
  serviceForm: document.querySelector("#serviceForm"),
  serviceId: document.querySelector("#serviceId"),
  serviceName: document.querySelector("#serviceName"),
  servicePrice: document.querySelector("#servicePrice"),
  serviceDescription: document.querySelector("#serviceDescription"),
  clearServiceForm: document.querySelector("#clearServiceForm"),
  servicesList: document.querySelector("#servicesList"),
  printOrder: document.querySelector("#printOrder"),
  printButton: document.querySelector("#printButton"),
  receiptPreview: document.querySelector("#receiptPreview")
};

function loadLocalState() {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : structuredClone(starterData);
}

function saveLocalState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    localStorage.removeItem(tokenKey);
    authToken = "";
    showLogin();
    throw new Error("Нужно войти заново");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Ошибка сервера");
  }

  return response.json();
}

async function detectApi() {
  if (location.protocol === "file:") {
    apiMode = false;
    els.syncStatus.textContent = "Локально";
    return;
  }

  try {
    const result = await fetch("/api/health", { cache: "no-store" });
    apiMode = result.ok;
  } catch {
    apiMode = false;
  }

  els.syncStatus.textContent = apiMode ? "Общая база" : "Локально";
  els.logoutButton.hidden = !apiMode;
}

async function loadRemoteState() {
  if (!apiMode) return;
  if (!authToken) {
    showLogin();
    return;
  }

  try {
    state = await apiRequest("/data");
    hideLogin();
  } catch (error) {
    els.loginError.textContent = error.message;
  }
}

async function persistState() {
  saveLocalState();
  if (!apiMode || !authToken) return;

  try {
    state = await apiRequest("/data", {
      method: "PUT",
      body: JSON.stringify(state)
    });
  } catch (error) {
    alert(error.message);
  }
}

function showLogin() {
  els.loginScreen.hidden = false;
  els.passwordInput.focus();
}

function hideLogin() {
  els.loginScreen.hidden = true;
  els.loginError.textContent = "";
}

function money(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₸`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function orderNumber(order) {
  return `R-${String(order.number).padStart(4, "0")}`;
}

function nextOrderNumber() {
  return state.orders.reduce((max, order) => Math.max(max, order.number || 0), 0) + 1;
}

function clientById(id) {
  return state.clients.find((client) => client.id === id);
}

function switchView(viewName) {
  const titles = { orders: "Заказы", clients: "Клиенты", services: "Услуги", receipts: "Печать" };
  els.viewTitle.textContent = titles[viewName];
  els.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
}

async function render({ skipSave = false } = {}) {
  renderSelectors();
  renderOrders();
  renderClients();
  renderServices();
  renderReceipt();
  renderSummary();
  if (!skipSave) await persistState();
}

function renderSelectors() {
  els.orderClient.innerHTML = state.clients
    .map((client) => `<option value="${client.id}">${client.name} - ${client.phone}</option>`)
    .join("");

  els.servicePicker.innerHTML = `<option value="">Добавить услугу в заказ</option>` + state.services
    .map((service) => `<option value="${service.id}">${service.name} - ${money(service.price)}</option>`)
    .join("");

  els.printOrder.innerHTML = state.orders
    .map((order) => {
      const client = clientById(order.clientId);
      return `<option value="${order.id}">${orderNumber(order)} - ${client?.name || "Клиент удален"} - ${order.device}</option>`;
    })
    .join("");
}

function renderOrders() {
  const search = els.orderSearch.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const orders = state.orders.filter((order) => {
    const client = clientById(order.clientId);
    const haystack = `${orderNumber(order)} ${client?.name || ""} ${client?.phone || ""} ${order.device} ${order.issue}`.toLowerCase();
    return (!status || order.status === status) && (!search || haystack.includes(search));
  });

  if (!orders.length) {
    els.ordersTable.innerHTML = `<tr><td colspan="6" class="empty">Пока нет заказов по выбранным условиям.</td></tr>`;
    return;
  }

  els.ordersTable.innerHTML = orders
    .map((order) => {
      const client = clientById(order.clientId);
      return `
        <tr>
          <td><strong>${orderNumber(order)}</strong><br><span>${order.date}</span></td>
          <td>${client?.name || "Клиент удален"}<br><span>${client?.phone || ""}</span></td>
          <td>${order.device}<br><span>${order.issue}</span></td>
          <td>${order.status}</td>
          <td>${money(order.amount)}<br><span>остаток ${money(order.amount - order.prepay)}</span></td>
          <td>
            <div class="row-actions">
              <button class="mini-button" data-edit-order="${order.id}">Изм.</button>
              <button class="mini-button" data-print-order="${order.id}">Печать</button>
              <button class="mini-button danger" data-delete-order="${order.id}">Удалить</button>
            </div>
          </td>
        </tr>`;
    })
    .join("");
}

function renderClients() {
  if (!state.clients.length) {
    els.clientsList.innerHTML = `<div class="empty">Добавьте первого клиента.</div>`;
    return;
  }

  els.clientsList.innerHTML = state.clients
    .map((client) => `
      <article class="card">
        <h3>${client.name}</h3>
        <p>${client.phone}</p>
        <p>${client.note || "Без заметки"}</p>
        <div class="row-actions">
          <button class="mini-button" data-edit-client="${client.id}">Изм.</button>
          <button class="mini-button danger" data-delete-client="${client.id}">Удалить</button>
        </div>
      </article>`)
    .join("");
}

function renderServices() {
  if (!state.services.length) {
    els.servicesList.innerHTML = `<div class="empty">Добавьте услуги для быстрого заполнения заказов.</div>`;
    return;
  }

  els.servicesList.innerHTML = state.services
    .map((service) => `
      <article class="card">
        <h3>${service.name}</h3>
        <strong>${money(service.price)}</strong>
        <p>${service.description || "Без описания"}</p>
        <div class="row-actions">
          <button class="mini-button" data-edit-service="${service.id}">Изм.</button>
          <button class="mini-button danger" data-delete-service="${service.id}">Удалить</button>
        </div>
      </article>`)
    .join("");
}

function renderReceipt() {
  const order = state.orders.find((item) => item.id === els.printOrder.value) || state.orders[0];
  if (!order) {
    els.receiptPreview.innerHTML = `<p class="empty">Создайте заказ, чтобы распечатать чек или квитанцию.</p>`;
    return;
  }

  els.printOrder.value = order.id;
  const client = clientById(order.clientId);
  const balance = order.amount - order.prepay;

  if (printType === "short") {
    els.receiptPreview.innerHTML = `
      <h3>Короткий чек ${orderNumber(order)}</h3>
      <div class="receipt-meta">
        <span>Дата: ${order.date}</span>
        <span>Клиент: ${client?.name || "Клиент удален"}</span>
        <span>Телефон: ${client?.phone || ""}</span>
        <span>Устройство: ${order.device}</span>
        <span>Статус: ${order.status}</span>
      </div>
      <p>${order.workNotes || order.issue}</p>
      <div class="receipt-line"><strong>Итого</strong><strong>${money(order.amount)}</strong></div>
      <div class="receipt-line"><span>Оплачено</span><span>${money(order.prepay)}</span></div>
      <div class="receipt-line"><strong>К оплате</strong><strong>${money(balance)}</strong></div>`;
    return;
  }

  els.receiptPreview.innerHTML = `
    <h3>Квитанция о приеме в ремонт</h3>
    <div class="receipt-meta">
      <span>Номер: ${orderNumber(order)}</span>
      <span>Дата приема: ${order.date}</span>
      <span>Клиент: ${client?.name || "Клиент удален"}</span>
      <span>Телефон: ${client?.phone || ""}</span>
      <span>Устройство: ${order.device}</span>
      <span>Заявленная неисправность: ${order.issue}</span>
      <span>Работы: ${order.workNotes || "Диагностика и согласованные работы"}</span>
    </div>
    <div class="receipt-line"><span>Предварительная стоимость</span><strong>${money(order.amount)}</strong></div>
    <div class="receipt-line"><span>Предоплата</span><strong>${money(order.prepay)}</strong></div>
    <div class="receipt-line"><span>Остаток</span><strong>${money(balance)}</strong></div>
    <div class="receipt-terms">
      <strong>Условия GST</strong>
      <ul>
        ${receiptTerms.map((term) => `<li>${term}</li>`).join("")}
      </ul>
    </div>
    <p style="margin-top: 28px;">Подпись клиента: ____________________ &nbsp;&nbsp; Подпись мастера: ____________________</p>`;
}

function renderSummary() {
  const openStatuses = ["Принят", "В диагностике", "В ремонте", "Готов"];
  els.openCount.textContent = state.orders.filter((order) => openStatuses.includes(order.status)).length;
  els.todayTotal.textContent = money(state.orders.filter((order) => order.date === todayIso()).reduce((sum, order) => sum + Number(order.amount || 0), 0));
}

function resetOrderForm() {
  els.orderForm.reset();
  els.orderId.value = "";
  els.amount.value = 0;
  els.prepay.value = 0;
}

function resetClientForm() {
  els.clientForm.reset();
  els.clientId.value = "";
}

function resetServiceForm() {
  els.serviceForm.reset();
  els.serviceId.value = "";
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.loginError.textContent = "";

  try {
    const result = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({ username: els.userSelect.value, password: els.passwordInput.value })
    });
    authToken = result.token;
    localStorage.setItem(tokenKey, authToken);
    els.passwordInput.value = "";
    await loadRemoteState();
    await render({ skipSave: true });
  } catch {
    els.loginError.textContent = "Неверный пароль";
  }
});

els.logoutButton.addEventListener("click", () => {
  authToken = "";
  localStorage.removeItem(tokenKey);
  showLogin();
});

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

els.quickOrderButton.addEventListener("click", () => {
  switchView("orders");
  resetOrderForm();
  els.device.focus();
});

els.servicePicker.addEventListener("change", () => {
  const service = state.services.find((item) => item.id === els.servicePicker.value);
  if (!service) return;
  const description = service.description || service.name;
  els.workNotes.value = els.workNotes.value ? `${els.workNotes.value}\n${description}` : description;
  els.amount.value = Number(els.amount.value || 0) + Number(service.price || 0);
  els.servicePicker.value = "";
});

els.orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = els.orderId.value || crypto.randomUUID();
  const existing = state.orders.find((order) => order.id === id);
  const order = {
    id,
    number: existing?.number || nextOrderNumber(),
    date: existing?.date || todayIso(),
    clientId: els.orderClient.value,
    device: els.device.value.trim(),
    issue: els.issue.value.trim(),
    status: els.status.value,
    workNotes: els.workNotes.value.trim(),
    amount: Number(els.amount.value || 0),
    prepay: Number(els.prepay.value || 0)
  };

  state.orders = existing ? state.orders.map((item) => (item.id === id ? order : item)) : [order, ...state.orders];
  resetOrderForm();
  await render();
});

els.clientForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = els.clientId.value || crypto.randomUUID();
  const client = {
    id,
    name: els.clientName.value.trim(),
    phone: els.clientPhone.value.trim(),
    note: els.clientNote.value.trim()
  };
  state.clients = state.clients.some((item) => item.id === id)
    ? state.clients.map((item) => (item.id === id ? client : item))
    : [client, ...state.clients];
  resetClientForm();
  await render();
});

els.serviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = els.serviceId.value || crypto.randomUUID();
  const service = {
    id,
    name: els.serviceName.value.trim(),
    price: Number(els.servicePrice.value || 0),
    description: els.serviceDescription.value.trim()
  };
  state.services = state.services.some((item) => item.id === id)
    ? state.services.map((item) => (item.id === id ? service : item))
    : [service, ...state.services];
  resetServiceForm();
  await render();
});

document.addEventListener("click", async (event) => {
  const target = event.target;

  if (target.matches("[data-edit-order]")) {
    const order = state.orders.find((item) => item.id === target.dataset.editOrder);
    if (!order) return;
    els.orderId.value = order.id;
    els.orderClient.value = order.clientId;
    els.device.value = order.device;
    els.issue.value = order.issue;
    els.status.value = order.status;
    els.workNotes.value = order.workNotes;
    els.amount.value = order.amount;
    els.prepay.value = order.prepay;
    switchView("orders");
  }

  if (target.matches("[data-print-order]")) {
    els.printOrder.value = target.dataset.printOrder;
    switchView("receipts");
    renderReceipt();
  }

  if (target.matches("[data-delete-order]")) {
    state.orders = state.orders.filter((item) => item.id !== target.dataset.deleteOrder);
    await render();
  }

  if (target.matches("[data-edit-client]")) {
    const client = state.clients.find((item) => item.id === target.dataset.editClient);
    if (!client) return;
    els.clientId.value = client.id;
    els.clientName.value = client.name;
    els.clientPhone.value = client.phone;
    els.clientNote.value = client.note;
  }

  if (target.matches("[data-delete-client]")) {
    state.clients = state.clients.filter((item) => item.id !== target.dataset.deleteClient);
    await render();
  }

  if (target.matches("[data-edit-service]")) {
    const service = state.services.find((item) => item.id === target.dataset.editService);
    if (!service) return;
    els.serviceId.value = service.id;
    els.serviceName.value = service.name;
    els.servicePrice.value = service.price;
    els.serviceDescription.value = service.description;
  }

  if (target.matches("[data-delete-service]")) {
    state.services = state.services.filter((item) => item.id !== target.dataset.deleteService);
    await render();
  }

  if (target.matches("[data-print-type]")) {
    printType = target.dataset.printType;
    document.querySelectorAll("[data-print-type]").forEach((button) => button.classList.toggle("active", button === target));
    renderReceipt();
  }
});

els.clearOrderForm.addEventListener("click", resetOrderForm);
els.clearClientForm.addEventListener("click", resetClientForm);
els.clearServiceForm.addEventListener("click", resetServiceForm);
els.orderSearch.addEventListener("input", renderOrders);
els.statusFilter.addEventListener("change", renderOrders);
els.printOrder.addEventListener("change", renderReceipt);
els.printButton.addEventListener("click", () => window.print());

async function boot() {
  await detectApi();
  await loadRemoteState();
  await render({ skipSave: true });
}

boot();
