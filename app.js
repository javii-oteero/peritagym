"use strict";
// AURA Gym: demo sin backend, sin cobros y sin hardware. Todos los datos son ficticios.
const KEY = "aura-gym-demo-v1",
  CAPACITY = 12;
const PLANS = {
  monthly: { name: "Mensual", price: 50, months: 1 },
  quarterly: { name: "Trimestral", price: 130, months: 3 },
  annual: { name: "Anual", price: 480, months: 12 },
};
const PLAN_IDS = Object.keys(PLANS);
const $ = (id) => document.getElementById(id);
const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const now = () => new Date();
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};
const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.toISOString();
};
const fmt = (date) =>
  new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const clock = (date) =>
  new Date(date).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
function initial() {
  const t = now();
  return {
    mode: "tablet",
    prices: { monthly: 50, quarterly: 130, annual: 480 },
    promos: [],
    clientMemberId: "m1",
    members: [
      {
        id: "m1",
        name: "Laura Gómez",
        plan: "monthly",
        expires: addDays(t, 24),
        inside: false,
        price: 50,
      },
      {
        id: "m2",
        name: "Marc Soler",
        plan: "quarterly",
        expires: addDays(t, 55),
        inside: true,
        price: 130,
      },
      {
        id: "m3",
        name: "David Navarro",
        plan: "monthly",
        expires: addDays(t, 8),
        inside: true,
        price: 50,
      },
      {
        id: "m4",
        name: "Elena Rostova",
        plan: "annual",
        expires: addDays(t, 180),
        inside: false,
        price: 480,
      },
      {
        id: "m5",
        name: "Sophie Laurent",
        plan: "monthly",
        expires: addDays(t, -3),
        inside: false,
        price: 50,
      },
    ],
    guests: [
      {
        id: "g1",
        name: "Habitación 304",
        expires: addDays(t, 2),
        inside: true,
      },
      {
        id: "g2",
        name: "Pase huésped 002",
        expires: addDays(t, 1),
        inside: true,
      },
      {
        id: "g3",
        name: "Habitación 212",
        expires: addDays(t, 4),
        inside: true,
      },
    ],
    logs: [
      {
        name: "Habitación 212",
        kind: "guest",
        action: "entrada",
        at: t.toISOString(),
      },
      {
        name: "Marc Soler",
        kind: "member",
        action: "entrada",
        at: t.toISOString(),
      },
    ],
  };
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (
      raw &&
      Array.isArray(raw.members) &&
      Array.isArray(raw.guests) &&
      Array.isArray(raw.logs)
    )
      return raw;
  } catch (e) {}
  return initial();
}
let state = load(),
  page = "dashboard",
  guestListLimit = 50;
state.prices = {
  monthly: 50,
  quarterly: 130,
  annual: 480,
  ...(state.prices || {}),
};
state.promos = Array.isArray(state.promos) ? state.promos : [];
state.clientMemberId = state.clientMemberId || "m1";
state.members.forEach((member) => {
  if (typeof member.price !== "number")
    member.price = PLANS[member.plan].price;
});
state.mode = state.mode === "turnstile" ? "turnstile" : "tablet";
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error("No se pudieron guardar los datos de la demo.", e);
  }
  notify("No se pudieron guardar los cambios. El almacenamiento del navegador puede estar lleno.");
  return false;
}
function isActive(p) {
  return new Date(p.expires).getTime() > Date.now();
}
function planPrice(plan) {
  return state.prices[plan];
}
function money(amount) {
  return `${Number(amount).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} €`;
}
function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
function currentPromo(code, plan) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;
  const today = localDate();
  return state.promos.find(
    (promo) =>
      promo.code.toUpperCase() === normalizedCode &&
      promo.active !== false &&
      today >= promo.startsAt &&
      today <= promo.endsAt &&
      (promo.plan === "all" || promo.plan === plan),
  );
}
function promoPrice(plan, promo) {
  return Math.round(planPrice(plan) * (1 - promo.percent / 100) * 100) / 100;
}
function uniqueId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}${Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}
function createMember(name, plan, promoCode = "", makeCurrentClient = false) {
  if (!PLANS[plan]) return { ok: false, message: "Selecciona un plan válido." };
  const promo = currentPromo(promoCode, plan);
  if (promoCode.trim() && !promo)
    return {
      ok: false,
      message: "El código promocional no es válido para este plan o no está vigente.",
    };
  const price = promo ? promoPrice(plan, promo) : planPrice(plan);
  const member = {
    id: uniqueId("m"),
    name,
    plan,
    expires: addMonths(now(), PLANS[plan].months),
    inside: false,
    price,
    promoCode: promo ? promo.code : "",
  };
  state.members.push(member);
  const previousClientId = state.clientMemberId;
  if (makeCurrentClient) state.clientMemberId = member.id;
  if (!persist()) {
    state.members.pop();
    state.clientMemberId = previousClientId;
    return { ok: false, message: "No se pudo guardar el alta." };
  }
  return { ok: true, member, promo };
}
function people() {
  return [
    ...state.members.map((x) => ({ ...x, kind: "member" })),
    ...state.guests.map((x) => ({ ...x, kind: "guest" })),
  ];
}
function inside() {
  return people().filter((x) => x.inside);
}
function notify(msg) {
  $("toast").textContent = msg;
  $("toast").classList.remove("hidden");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => $("toast").classList.add("hidden"),
    3200,
  );
}
function record(person, action) {
  state.logs.unshift({
    name: person.name,
    kind: person.kind,
    action,
    at: now().toISOString(),
  });
  state.logs = state.logs.slice(0, 50);
}
function qrSvg(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > 32) throw new RangeError("El contenido del QR es demasiado largo.");

  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));
  const setFunction = (x, y, value) => {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      matrix[y][x] = value;
      reserved[y][x] = true;
    }
  };
  const finder = (cx, cy) => {
    for (let dy = -1; dy <= 7; dy++)
      for (let dx = -1; dx <= 7; dx++) {
        const distance = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        setFunction(cx + dx, cy + dy, distance !== 2 && distance !== 4);
      }
  };
  finder(0, 0);
  finder(size - 7, 0);
  finder(0, size - 7);
  for (let i = 8; i < size - 8; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      setFunction(18 + dx, 18 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);

  const firstFormat = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7],
    [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const secondFormat = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
    [size - 5, 8], [size - 6, 8], [size - 7, 8], [size - 8, 8],
    [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4],
    [8, size - 3], [8, size - 2], [8, size - 1],
  ];
  [...firstFormat, ...secondFormat, [8, size - 8]].forEach(([x, y]) =>
    setFunction(x, y, false),
  );

  const bits = [];
  const appendBits = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  appendBits(4, 4);
  appendBits(bytes.length, 8);
  bytes.forEach((byte) => appendBits(byte, 8));
  appendBits(0, Math.min(4, 272 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8)
    data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
  for (let pad = 0; data.length < 34; pad++)
    data.push(pad % 2 === 0 ? 0xec : 0x11);

  const multiply = (x, y) => {
    let product = 0;
    for (let i = 7; i >= 0; i--) {
      product = (product << 1) ^ ((product >>> 7) * 0x11d);
      product ^= ((y >>> i) & 1) * x;
    }
    return product;
  };
  let generator = [1];
  let root = 1;
  for (let i = 0; i < 10; i++) {
    const next = Array(generator.length + 1).fill(0);
    generator.forEach((coefficient, j) => {
      next[j] ^= coefficient;
      next[j + 1] ^= multiply(coefficient, root);
    });
    generator = next;
    root = multiply(root, 2);
  }
  const remainder = [...data, ...Array(10).fill(0)];
  data.forEach((_, i) => {
    const factor = remainder[i];
    generator.forEach(
      (coefficient, j) => (remainder[i + j] ^= multiply(coefficient, factor)),
    );
  });
  const codewords = [...data, ...remainder.slice(data.length)];
  const codeBits = codewords.flatMap((byte) =>
    Array.from({ length: 8 }, (_, i) => (byte >>> (7 - i)) & 1),
  );
  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (!reserved[y][x]) {
          const bit = codeBits[bitIndex++] || 0;
          matrix[y][x] = Boolean(bit ^ ((x + y) % 2 === 0 ? 1 : 0));
        }
      }
    }
  }

  let format = 0x08;
  for (let i = 0; i < 10; i++)
    format = (format << 1) ^ (((format >>> 9) & 1) * 0x537);
  const formatBits = ((0x08 << 10) | format) ^ 0x5412;
  for (let i = 0; i < 15; i++) {
    const value = ((formatBits >>> i) & 1) !== 0;
    setFunction(firstFormat[i][0], firstFormat[i][1], value);
    setFunction(secondFormat[i][0], secondFormat[i][1], value);
  }
  setFunction(8, size - 8, true);

  const path = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (matrix[y][x]) path.push(`M${x + 4},${y + 4}h1v1h-1z`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" role="img" aria-label="QR: ${escapeHTML(text)}"><path fill="#fff" d="M0 0h33v33H0z"/><path fill="#14171a" d="${path.join("")}"/></svg>`;
}
function nextGuestId() {
  let id;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    id = `g${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  } while (state.guests.some((guest) => guest.id === id));
  return id;
}
function printGuestPass(id) {
  const guest = state.guests.find((person) => person.id === id);
  if (!guest) {
    notify("No se ha encontrado ese pase de huésped.");
    return;
  }
  try {
    $("ticketName").textContent = guest.name;
    $("ticketQr").innerHTML = qrSvg(`PERITA:G:${guest.id}`);
    $("ticketExpiry").textContent = fmt(guest.expires);
    $("ticketCode").textContent = `Código ${guest.id}`;
    window.print();
  } catch (error) {
    console.error("No se pudo preparar el QR del pase.", error);
    notify("No se pudo generar el QR para imprimir este pase.");
  }
}
function access(id, action) {
  const p = people().find((x) => x.id === id);
  if (!p) return { ok: false, msg: "Selecciona una credencial válida." };
  const actual = (p.kind === "member" ? state.members : state.guests).find(
    (x) => x.id === id,
  );
  if (action === "entrada") {
    if (actual.inside)
      return {
        ok: false,
        msg: "Acceso duplicado: esta persona ya figura dentro.",
      };
    if (!isActive(actual))
      return {
        ok: false,
        msg: "Acceso denegado: pase o suscripción caducados.",
      };
    if (inside().length >= CAPACITY)
      return {
        ok: false,
        msg: "Aforo completo. No se admiten nuevas entradas.",
      };
    actual.inside = true;
  } else {
    if (!actual.inside)
      return { ok: false, msg: "Esta persona no figura dentro." };
    actual.inside = false;
  }
  record(p, action);
  persist();
  render();
  return {
    ok: true,
    msg: `${action === "entrada" ? "Entrada" : "Salida"} registrada: ${p.name}. Aforo: ${inside().length}/${CAPACITY}.`,
  };
}
function render() {
  const list = inside(),
    n = list.length,
    guests = list.filter((p) => p.kind === "guest").length,
    members = n - guests,
    active = state.members.filter(isActive).length;
  $("metricTotal").textContent = n;
  $("metricGuests").textContent = guests;
  $("metricMembers").textContent = members;
  $("metricActive").textContent = active;
  $("metricStatus").textContent =
    n === CAPACITY ? "Aforo completo" : `${CAPACITY - n} plazas disponibles`;
  $("progressBar").style.width = `${(n / CAPACITY) * 100}%`;
  $("progressBar").style.background =
    n === CAPACITY ? "#b64c4c" : "var(--accent)";
  $("donut").style.background =
    `conic-gradient(var(--accent) ${(members / CAPACITY) * 360}deg,#303842 ${(n / CAPACITY) * 360}deg,#f1eee7 0deg)`;
  $("donutValue").textContent = n;
  $("spaceText").textContent =
    n === CAPACITY ? "Aforo completo" : "Espacio disponible";
  $("legendMembers").textContent = members;
  $("legendGuests").textContent = guests;
  $("doorCount").textContent = n;
  $("insideCount").textContent = `${n} PERSONAS`;
  $("clientTotal").textContent = n;
  $("clientSpaces").textContent =
    n === CAPACITY ? "Aforo completo" : `${CAPACITY - n} plazas disponibles`;
  $("recentLogs").innerHTML = state.logs.length
    ? state.logs
        .slice(0, 7)
        .map(
          (l) =>
            `<div class="log"><div><b>${escapeHTML(l.name)}</b><small>${l.kind === "guest" ? "Huésped" : "Socio"} · ${clock(l.at)}</small></div><span class="tag ${l.action === "salida" ? "exit" : ""}">${l.action === "entrada" ? "ENTRADA" : "SALIDA"}</span></div>`,
        )
        .join("")
    : '<p class="hint">No hay actividad registrada.</p>';
  $("insideList").innerHTML = list.length
    ? list
        .map(
          (p) =>
            `<div class="item"><div><b>${escapeHTML(p.name)}</b><small>${p.kind === "guest" ? "Huésped" : "Socio"} · Hasta ${fmt(p.expires)}</small></div><div class="actions"><span class="tag">DENTRO</span><button data-exit="${p.id}">Registrar salida</button></div></div>`,
        )
        .join("")
    : '<p class="hint">No hay personas dentro del gimnasio.</p>';
  $("memberCount").textContent = `${state.members.length} REGISTROS`;
  $("guestCount").textContent = `${state.guests.length} PASES`;
  const term = $("memberSearch").value.toLowerCase();
  $("memberList").innerHTML =
    state.members
      .filter((m) =>
        (m.name + " " + PLANS[m.plan].name).toLowerCase().includes(term),
      )
      .map(
        (m) =>
          `<div class="item"><div><b>${escapeHTML(m.name)}</b><small>${PLANS[m.plan].name} · ${money(m.price)}${m.promoCode ? ` · Promo ${escapeHTML(m.promoCode)}` : ""} · Vence ${fmt(m.expires)}</small><small>${m.inside ? "Dentro del gimnasio · " : ""}${isActive(m) ? "Cuota vigente" : "Cuota caducada"}</small></div><div class="actions"><span class="tag ${isActive(m) ? "" : "exit"}">${isActive(m) ? "ACTIVA" : "CADUCADA"}</span><button data-renew="${m.id}">Renovar</button></div></div>`,
      )
      .join("") || '<p class="hint">No se encontraron socios.</p>';
  $("planCards").innerHTML = PLAN_IDS.map((plan, index) => {
    const config = PLANS[plan];
    const monthlyPrice = planPrice(plan) / config.months;
    const savings = plan === "monthly"
      ? ""
      : Math.round((planPrice("monthly") * config.months - planPrice(plan)) * 100) / 100;
    const detail = savings > 0
      ? `Ahorra ${money(savings)} frente al pago mensual`
      : `${money(monthlyPrice)} / mes`;
    return `<article class="${index === 1 ? "featured" : ""}"><small>${config.name.toUpperCase()}</small><div><b>${money(planPrice(plan))}</b><span>/ ${config.months === 1 ? "mes" : `${config.months} meses`}</span></div><p>${detail}</p></article>`;
  }).join("");
  ["newMemberPlan", "clientSignupPlan"].forEach((id) => {
    const select = $(id);
    const selected = select.value;
    select.innerHTML = PLAN_IDS.map(
      (plan) =>
        `<option value="${plan}">${PLANS[plan].name} · ${money(planPrice(plan))}</option>`,
    ).join("");
    if (PLAN_IDS.includes(selected)) select.value = selected;
  });
  PLAN_IDS.forEach((plan) => {
    $(`price${plan[0].toUpperCase()}${plan.slice(1)}`).value = state.prices[plan];
  });
  $("promoList").innerHTML = state.promos.length
    ? state.promos
        .map(
          (promo) =>
            `<div class="promo-row"><div><b>${escapeHTML(promo.name)} · ${escapeHTML(promo.code)}</b><small>${promo.percent}% · ${promo.plan === "all" ? "Todos los planes" : PLANS[promo.plan].name} · ${fmt(`${promo.startsAt}T12:00:00`)} – ${fmt(`${promo.endsAt}T12:00:00`)}${promo.active === false ? " · Inactiva" : ""}</small></div><button data-delete-promo="${escapeHTML(promo.id)}">Eliminar</button></div>`,
        )
        .join("")
    : '<p class="hint">Todavía no hay promociones.</p>';
  const recentGuests = state.guests.slice(-guestListLimit).reverse();
  $("guestList").innerHTML =
    (state.guests.length > guestListLimit
      ? `<p class="hint">Mostrando los ${guestListLimit} pases más recientes de ${state.guests.length}.</p>`
      : "") +
    (recentGuests
      .map(
        (g) =>
          `<div class="item"><div><b>${escapeHTML(g.name)}</b><small>ID ${escapeHTML(g.id)} · Válido hasta ${fmt(g.expires)}</small><small>${g.inside ? "Dentro del gimnasio" : isActive(g) ? "Pase vigente" : "Pase caducado"}</small></div><div class="actions"><span class="tag ${isActive(g) ? "" : "exit"}">${isActive(g) ? "VIGENTE" : "CADUCADO"}</span><button data-print-pass="${escapeHTML(g.id)}">Imprimir QR</button></div></div>`,
      )
      .join("") || '<p class="hint">Todavía no hay pases.</p>') +
    (state.guests.length > guestListLimit
      ? '<button class="outline full" data-show-more-guests>Mostrar 50 pases anteriores</button>'
      : "");
  const visibleGuests = state.guests.slice(-50);
  const selectableGuests = state.guests.filter(
    (guest, index) =>
      guest.inside || index >= state.guests.length - visibleGuests.length,
  );
  const options = [
    ...state.members.map((person) => ({ ...person, kind: "member" })),
    ...selectableGuests.map((person) => ({ ...person, kind: "guest" })),
  ]
    .map(
      (p) =>
        `<option value="${p.id}">${escapeHTML(p.name)} · ${p.kind === "guest" ? "Huésped · QR o tarjeta del hotel" : "Socio · QR o tarjeta del gimnasio"}${!isActive(p) ? " (caducado)" : ""}${p.inside ? " (dentro)" : ""}</option>`,
    )
    .join("");
  const previous = $("accessPerson").value;
  $("accessPerson").innerHTML = options;
  if (
    state.members.some((person) => person.id === previous) ||
    selectableGuests.some((person) => person.id === previous)
  )
    $("accessPerson").value = previous;
  const client =
    state.members.find((member) => member.id === state.clientMemberId) ||
    state.members.find((member) => member.id === "m1");
  $("clientName").textContent = `Hola, ${client.name.split(" ")[0]}`;
  $("clientPlan").textContent = `Plan ${PLANS[client.plan].name.toLowerCase()}`;
  $("clientPrice").textContent = money(client.price);
  $("clientQr").innerHTML = qrSvg(`PERITA:M:${client.id}`);
  $("clientExpiry").textContent = `Válida hasta ${fmt(client.expires)}`;
  $("clientStatus").textContent = isActive(client)
    ? "SOCIO ACTIVO"
    : "CUOTA CADUCADA";
  $("clientEnter").disabled = client.inside || !isActive(client) || n >= CAPACITY;
  $("clientLeave").disabled = !client.inside;
  $("clientSignupPanel").classList.toggle("hidden", client.id !== "m1");
  updateMode();
}
const modes = {
  turnstile: [
    "Torno o puerta · lector de QR y tarjetas",
    "El torno o la puerta controla el paso. La app valida el QR del socio o huésped y las tarjetas del gimnasio o del hotel; el lector debe ser compatible.",
  ],
  tablet: [
    "Tablet en la puerta · escáner QR",
    "La tablet puede escanear los QR de socios y huéspedes. Para usar tarjetas del gimnasio o del hotel, necesitaría un lector de tarjetas compatible.",
  ],
};
function updateMode() {
  const mode = modes[state.mode] || modes.tablet;
  $("doorTitle").textContent =
    state.mode === "turnstile" ? "TORNO O PUERTA" : "TABLET EN LA PUERTA";
  $("doorMode").textContent = mode[0];
  $("modeNote").textContent = mode[1];
  document
    .querySelectorAll("input[name=mode]")
    .forEach((r) => (r.checked = r.value === state.mode));
}
const pages = {
  dashboard: [
    "OPERACIONES / RESUMEN",
    "Panel de control",
    "Ocupación y accesos del gimnasio en tiempo real (simulado).",
  ],
  access: [
    "OPERACIONES / ACCESO",
    "Control de acceso",
    "Elige el equipo y simula entradas y salidas con QR o tarjetas.",
  ],
  members: [
    "GESTIÓN / SOCIOS",
    "Suscripciones",
    "Precios, promociones y altas desde el panel o la app del socio.",
  ],
  guest: [
    "HOTEL / HUÉSPEDES",
    "Pases de huéspedes",
    "Acceso temporal sin obligar al huésped a registrarse.",
  ],
  client: [
    "EXPERIENCIA / SOCIO",
    "Vista del socio",
    "Así vería el cliente su aforo, suscripción y acceso.",
  ],
};
function navigate(target) {
  page = target;
  document
    .querySelectorAll(".page")
    .forEach((x) => x.classList.toggle("hidden", x.id !== target));
  document
    .querySelectorAll(".nav")
    .forEach((x) => x.classList.toggle("active", x.dataset.page === target));
  $("crumb").textContent = pages[target][0];
  $("pageTitle").textContent = pages[target][1];
  $("pageDesc").textContent = pages[target][2];
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-page]");
  if (nav) navigate(nav.dataset.page);
  const go = e.target.closest("[data-goto]");
  if (go) navigate(go.dataset.goto);
  const exit = e.target.closest("[data-exit]");
  if (exit) notify(access(exit.dataset.exit, "salida").msg);
  const printPass = e.target.closest("[data-print-pass]");
  if (printPass) printGuestPass(printPass.dataset.printPass);
  const showMoreGuests = e.target.closest("[data-show-more-guests]");
  if (showMoreGuests) {
    guestListLimit += 50;
    render();
  }
  const renew = e.target.closest("[data-renew]");
  if (renew) {
    const m = state.members.find((m) => m.id === renew.dataset.renew);
    const base = isActive(m) ? m.expires : now();
    const previous = { expires: m.expires, price: m.price, promoCode: m.promoCode };
    m.expires = addMonths(base, PLANS[m.plan].months);
    m.price = planPrice(m.plan);
    m.promoCode = "";
    if (!persist()) {
      Object.assign(m, previous);
      return;
    }
    render();
    notify(`Renovación simulada: ${m.name}, ${money(m.price)} hasta ${fmt(m.expires)}.`);
  }
  const deletePromo = e.target.closest("[data-delete-promo]");
  if (deletePromo) {
    const index = state.promos.findIndex((promo) => promo.id === deletePromo.dataset.deletePromo);
    if (index >= 0) {
      const [removed] = state.promos.splice(index, 1);
      if (!persist()) state.promos.splice(index, 0, removed);
      else render();
    }
  }
});
document.querySelectorAll("input[name=mode]").forEach((r) =>
  r.addEventListener("change", (e) => {
    state.mode = e.target.value;
    persist();
    updateMode();
  }),
);
$("enter").onclick = () => {
  $("accessFeedback").textContent = access(
    $("accessPerson").value,
    "entrada",
  ).msg;
};
$("leave").onclick = () => {
  $("accessFeedback").textContent = access(
    $("accessPerson").value,
    "salida",
  ).msg;
};
$("clientEnter").onclick = () =>
  notify(access(state.clientMemberId, "entrada").msg);
$("clientLeave").onclick = () =>
  notify(access(state.clientMemberId, "salida").msg);
$("memberSearch").addEventListener("input", render);
$("memberForm").onsubmit = (e) => {
  e.preventDefault();
  const name = $("newMemberName").value.trim();
  if (!name) return;
  const plan = $("newMemberPlan").value;
  const result = createMember(name, plan, $("staffPromoCode").value);
  if (!result.ok) {
    notify(result.message);
    return;
  }
  $("memberForm").reset();
  render();
  notify(`Socio creado: ${name}. ${PLANS[plan].name} · ${money(result.member.price)}.`);
};
$("clientSignupForm").onsubmit = (e) => {
  e.preventDefault();
  const name = $("clientSignupName").value.trim();
  if (!name) return;
  const plan = $("clientSignupPlan").value;
  const result = createMember(
    name,
    plan,
    $("clientPromoCode").value,
    true,
  );
  const feedback = $("signupFeedback");
  if (!result.ok) {
    feedback.textContent = result.message;
    feedback.classList.remove("hidden");
    return;
  }
  $("clientSignupForm").reset();
  feedback.classList.add("hidden");
  render();
  notify(`¡Bienvenido/a, ${name}! Tu alta está activa · ${money(result.member.price)}.`);
};
$("pricingForm").onsubmit = (e) => {
  e.preventDefault();
  const updatedPrices = Object.fromEntries(
    PLAN_IDS.map((plan) => [
      plan,
      Number($(`price${plan[0].toUpperCase()}${plan.slice(1)}`).value),
    ]),
  );
  if (PLAN_IDS.some((plan) => !Number.isFinite(updatedPrices[plan]) || updatedPrices[plan] <= 0)) {
    notify("Introduce un precio válido mayor que cero para cada plan.");
    return;
  }
  const previous = state.prices;
  state.prices = updatedPrices;
  if (!persist()) {
    state.prices = previous;
    render();
    return;
  }
  render();
  notify("Precios actualizados para nuevas altas y renovaciones.");
};
$("promoForm").onsubmit = (e) => {
  e.preventDefault();
  const name = $("promoName").value.trim();
  const code = $("promoCode").value.trim().toUpperCase();
  const percent = Number($("promoPercent").value);
  const plan = $("promoPlan").value;
  const startsAt = $("promoStart").value;
  const endsAt = $("promoEnd").value;
  if (!name || !code || !Number.isInteger(percent) || percent < 1 || percent > 90) {
    notify("Revisa el nombre, el código y el descuento (del 1 al 90%).");
    return;
  }
  if (!PLANS[plan] && plan !== "all") {
    notify("Selecciona un plan válido para la promoción.");
    return;
  }
  if (!startsAt || !endsAt || endsAt < startsAt) {
    notify("La fecha final debe ser igual o posterior a la fecha inicial.");
    return;
  }
  if (state.promos.some((promo) => promo.code.toUpperCase() === code)) {
    notify("Ya existe una promoción con ese código.");
    return;
  }
  const promo = {
    id: uniqueId("p"),
    name,
    code,
    percent,
    plan,
    startsAt,
    endsAt,
    active: true,
  };
  state.promos.push(promo);
  if (!persist()) {
    state.promos.pop();
    render();
    return;
  }
  $("promoForm").reset();
  $("promoPercent").value = 10;
  setPromoDateDefaults();
  render();
  notify(`Promoción ${code} creada.`);
};
$("priceMonthly").value = state.prices.monthly;
$("priceQuarterly").value = state.prices.quarterly;
$("priceAnnual").value = state.prices.annual;
function setPromoDateDefaults() {
  const today = new Date();
  $("promoStart").value = localDate(today);
  today.setDate(today.getDate() + 30);
  $("promoEnd").value = localDate(today);
}
setPromoDateDefaults();
$("guestForm").onsubmit = (e) => {
  e.preventDefault();
  const label =
    $("guestLabel").value.trim() ||
    `Pase huésped ${String(state.guests.length + 1).padStart(3, "0")}`;
  const days = Number($("guestDuration").value);
  state.guests.push({
    id: nextGuestId(),
    name: label,
    expires: addDays(now(), days),
    inside: false,
  });
  if (!persist()) {
    state.guests.pop();
    render();
    return;
  }
  $("guestForm").reset();
  render();
  notify(`Pase temporal generado: ${label} (${days} día/s). Ya puedes imprimir su QR.`);
};
$("reset").onclick = () => {
  if (confirm("¿Restablecer todos los datos ficticios de la demo?")) {
    state = initial();
    guestListLimit = 50;
    persist();
    $("memberSearch").value = "";
    render();
    navigate("dashboard");
    notify("Demo restablecida.");
  }
};
render();
navigate("dashboard");
