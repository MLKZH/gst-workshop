const form = document.querySelector("#trackForm");
const input = document.querySelector("#trackNumber");
const result = document.querySelector("#trackResult");

const statusSteps = ["Принят", "В диагностике", "В ремонте", "Готов", "Выдан"];

function money(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₸`;
}

function renderStatus(order) {
  const activeIndex = Math.max(0, statusSteps.indexOf(order.status));
  result.innerHTML = `
    <div class="status-card">
      <div>
        <span class="track-label">Номер заявки</span>
        <h3>${order.trackingNumber}</h3>
      </div>
      <div class="track-grid">
        <div>
          <span class="track-label">Статус</span>
          <strong>${order.status}</strong>
        </div>
        <div>
          <span class="track-label">Дата приема</span>
          <strong>${order.date}</strong>
        </div>
        <div>
          <span class="track-label">Устройство</span>
          <strong>${order.device}</strong>
        </div>
        <div>
          <span class="track-label">Предварительная стоимость</span>
          <strong>${money(order.amount)}</strong>
        </div>
      </div>
      <div class="status-steps">
        ${statusSteps.map((step, index) => `
          <div class="status-step ${index <= activeIndex ? "done" : ""}">
            <span></span>
            <p>${step}</p>
          </div>
        `).join("")}
      </div>
      <p class="track-note">Если статус долго не меняется, свяжитесь с сервисом GST и назовите номер заявки.</p>
    </div>
  `;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const number = input.value.trim().toUpperCase();
  result.innerHTML = `<p class="empty">Проверяем заявку...</p>`;

  try {
    const response = await fetch(`/api/track?number=${encodeURIComponent(number)}`, { cache: "no-store" });
    if (response.status === 404) {
      result.innerHTML = `<p class="empty">Заявка не найдена. Проверьте номер в квитанции.</p>`;
      return;
    }
    if (!response.ok) {
      result.innerHTML = `<p class="empty">Не удалось проверить статус. Попробуйте позже.</p>`;
      return;
    }
    renderStatus(await response.json());
  } catch {
    result.innerHTML = `<p class="empty">Страница проверки работает только на опубликованном сайте или через сервер.</p>`;
  }
});
