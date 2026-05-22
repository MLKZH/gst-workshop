const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = Number(process.env.PORT || 3000);
const secret = process.env.GST_SECRET || crypto.randomBytes(32).toString("hex");
const dataDir = process.env.DATA_DIR || __dirname;
const publicDir = __dirname;

const users = {
  aziz: {
    name: "Азиз",
    prefix: "AZ",
    password: process.env.GST_AZIZ_PASSWORD || "aziz123",
    dataFile: "data-aziz.json"
  },
  muslim: {
    name: "Муслим",
    prefix: "MS",
    password: process.env.GST_MUSLIM_PASSWORD || "muslim123",
    dataFile: "data-muslim.json"
  },
  damir: {
    name: "Дамир",
    prefix: "DM",
    password: process.env.GST_DAMIR_PASSWORD || "damir123",
    dataFile: "data-damir.json"
  }
};

const officialClients = [
  {
    name: "ГУ Аппарат акима Талгарского района",
    phone: "+7 (72774) 2-17-72; +7 (72774) 2-50-87; +7 (727) 295-66-72",
    note: "Адрес: г. Талгар, ул. Кунаева, 65. Индекс 040116. Запись к акиму: +7 (72774) 2-10-94. E-mail: talgar_akimat@almobl.gov.kz. Аким: Айдарбеков Танат Есенкельдиевич, приемная 8-(72774)-2-50-87, t.aidarbekov@almobl.gov.kz."
  },
  {
    name: "ГУ Аппарат акима города Талгар Талгарского района",
    phone: "+7 (72774) 2-39-72; +7 (72774) 2-17-71; 872774 2-39-77",
    note: "Адрес: г. Талгар, ул. Гагарина, 76. Индекс 041600. Аким: Абилхаирұлы Арыстанбек. E-mail: akimat-2013@mail.ru."
  },
  { name: "Аппарат акима Кайнарского сельского округа", phone: "8 (727) 75036", note: "Аким: Манапбаев Нұрболат Қайбелденұлы. E-mail: n.manapbaev@almobl.gov.kz." },
  { name: "Аппарат акима Бескайнарского сельского округа", phone: "8 (72774) 41270", note: "Аким: Джабаев Арман Асылбекович. E-mail: m.adilbekov@zhetysu.gov.kz." },
  { name: "Аппарат акима Бесагашского сельского округа", phone: "8 (727) 391-52-14; 56676", note: "Аким: Жунусов Ернар Ниетбаевич. E-mail: e.zhunusov@almobl.gov.kz." },
  { name: "Аппарат акима Алатауского сельского округа", phone: "8 (72774) 48232", note: "Аким: Сейтов Азамат Серикович. E-mail: k.smagulov@almobl.gov.kz." },
  { name: "Аппарат акима Бельбулакского сельского округа", phone: "8 (727) 4-34-46", note: "Аким: Досымбаев Нурбол Инакынович. E-mail: n.dosymbaev@almobl.gov.kz." },
  { name: "Аппарат акима Нуринского сельского округа", phone: "8 (72774) 58296", note: "Аким: Оразбаев Ахмет Заетович." },
  { name: "Аппарат акима Кендалинского сельского округа", phone: "8 (72774) 4-18-78", note: "Аким: Умирзаков Алмас Нурдаулетович. E-mail: a.umirzakov@almobl.gov.kz." },
  { name: "Аппарат акима Гульдалинского сельского округа", phone: "8 (72774) 7-28-27", note: "Аким: Маханбеткалиулы Махсат. E-mail: m.mahanbetkaliyli@almobl.gov.kz." },
  { name: "Аппарат акима Панфиловского сельского округа", phone: "8 (72774) 53-6-65", note: "Аким: Даулеталиев Дулат Маратович. E-mail: d.dauletaliev@almobl.gov.kz." },
  {
    name: "Аппарат маслихата Талгарского района",
    phone: "8 (72774) 2-50-72; 8 (72774) 2-06-92",
    note: "Адрес: Алматинская область, г. Талгар, ул. Конаева 65. Председатель: Алибеков Мухит Бейсембекович, 8(727)295-65-33, m.alibekov@talgarmaslihat.gov.kz. Руководитель аппарата: Даркенбаева Умит Танжарыковна, 8(72774)2-50-72. Руководитель отдела: Амантайқызы Гауһар, 8(72774)2-06-92, g.amantaikyzy@talgarmaslihat.gov.kz."
  }
].map((client) => ({ id: crypto.randomUUID(), ...client }));

const starterData = {
  clients: [
    ...officialClients,
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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        req.destroy();
        reject(new Error("Слишком большой запрос"));
      }
    });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function dataFileForUser(username) {
  const user = users[username];
  return user ? path.join(dataDir, user.dataFile) : null;
}

function ensureDataFile(username) {
  const dataFile = dataFileForUser(username);
  if (!dataFile) throw new Error("Unknown user");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(starterData, null, 2), "utf8");
  }
}

function readData(username) {
  const dataFile = dataFileForUser(username);
  ensureDataFile(username);
  const data = ensureOfficialClients(JSON.parse(fs.readFileSync(dataFile, "utf8")));
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
  return data;
}

function ensureOfficialClients(data) {
  const existingNames = new Set((data.clients || []).map((client) => client.name));
  const missingClients = officialClients
    .filter((client) => !existingNames.has(client.name))
    .map((client) => ({ ...client, id: crypto.randomUUID() }));

  if (missingClients.length) {
    data.clients = [...missingClients, ...(data.clients || [])];
  }

  return data;
}

function orderNumber(order) {
  return `R-${String(order.number).padStart(4, "0")}`;
}

function trackingNumber(username, order) {
  return `${users[username].prefix}-${orderNumber(order)}`;
}

function findTrackedOrder(number) {
  const normalized = String(number || "").trim().toUpperCase();
  if (!normalized) return null;

  for (const username of Object.keys(users)) {
    const data = readData(username);
    const order = data.orders.find((item) => {
      return trackingNumber(username, item) === normalized || orderNumber(item) === normalized;
    });

    if (order) {
      return {
        trackingNumber: trackingNumber(username, order),
        date: order.date,
        device: order.device,
        issue: order.issue,
        status: order.status,
        amount: order.amount,
        prepay: order.prepay
      };
    }
  }

  return null;
}

function writeData(username, data) {
  const dataFile = dataFileForUser(username);
  ensureDataFile(username);
  const cleanData = {
    clients: Array.isArray(data.clients) ? ensureOfficialClients({ clients: data.clients }).clients : [],
    services: Array.isArray(data.services) ? data.services : [],
    orders: Array.isArray(data.orders) ? data.orders : []
  };
  fs.writeFileSync(dataFile, JSON.stringify(cleanData, null, 2), "utf8");
  return cleanData;
}

function sign(value) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createToken(username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function userFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.exp <= Date.now() || !users[parsed.username]) return null;
    return parsed.username;
  } catch {
    return null;
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.join(publicDir, pathname);

  if (!path.resolve(filePath).startsWith(path.resolve(publicDir))) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".png": "image/png"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        users: Object.entries(users).map(([id, user]) => ({ id, name: user.name }))
      });
      return;
    }

    if (req.url.startsWith("/api/track") && req.method === "GET") {
      const url = new URL(req.url, `http://localhost:${port}`);
      const order = findTrackedOrder(url.searchParams.get("number"));
      if (!order) {
        sendText(res, 404, "Заявка не найдена");
        return;
      }
      sendJson(res, 200, order);
      return;
    }

    if (req.url === "/api/login" && req.method === "POST") {
      const body = await readBody(req);
      const username = String(body.username || "").toLowerCase();
      const user = users[username];
      if (!user || body.password !== user.password) {
        sendText(res, 401, "Неверный пользователь или пароль");
        return;
      }
      sendJson(res, 200, { token: createToken(username), user: user.name });
      return;
    }

    if (req.url === "/api/data" && req.method === "GET") {
      const username = userFromToken(req);
      if (!username) {
        sendText(res, 401, "Нужно войти");
        return;
      }
      sendJson(res, 200, readData(username));
      return;
    }

    if (req.url === "/api/data" && req.method === "PUT") {
      const username = userFromToken(req);
      if (!username) {
        sendText(res, 401, "Нужно войти");
        return;
      }
      const body = await readBody(req);
      sendJson(res, 200, writeData(username, body));
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendText(res, 500, error.message || "Server error");
  }
});

server.listen(port, () => {
  console.log(`GST workshop is running on http://localhost:${port}`);
});
