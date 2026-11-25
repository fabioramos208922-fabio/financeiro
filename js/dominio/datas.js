/* Datas são sempre texto ISO (AAAA-MM-DD), o que permite comparar com < e >. */
function pad(n) { return String(n).padStart(2, "0"); }

function isoDate(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function partes(iso) { return iso.split("-").map(Number); }

function addDays(iso, n) {
  const [y, m, d] = partes(iso);
  return isoDate(new Date(y, m - 1, d + n));
}

/* Soma meses; dia 31 vira o último dia quando o mês é mais curto. */
function addMonths(iso, n) {
  const [y, m, d] = partes(iso);
  const ultimoDia = new Date(y, m + n, 0).getDate();
  return isoDate(new Date(y, m - 1 + n, Math.min(d, ultimoDia)));
}

function monthKey(iso) { return iso.slice(0, 7); }

function mesAnt(mk) {
  const [y, m] = partes(mk);
  return monthKey(isoDate(new Date(y, m - 2, 1)));
}

function endOfMonth(iso) {
  const [y, m] = partes(iso);
  return isoDate(new Date(y, m, 0));
}

function diaDoMes(iso) { return Number(iso.slice(8, 10)); }

/* Dia da semana: 0 = domingo. Meio-dia evita problemas de fuso. */
function wd(iso) { return new Date(iso + "T12:00:00").getDay(); }

/* Aceita 20260131, 2026-01-31, 31/01/2026 e 31/01/26. Devolve null se a data não existir. */
function parseDateAny(texto) {
  const s = String(texto || "").trim();
  let y, m, d;
  let r = s.match(/^(\d{4})(\d{2})(\d{2})/) || s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (r) {
    [, y, m, d] = r;
  } else {
    r = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}|\d{2})(?!\d)/);
    if (!r) return null;
    [, d, m, y] = r;
    if (y.length === 2) y = "20" + y;
  }
  const iso = y + "-" + pad(Number(m)) + "-" + pad(Number(d));
  return isoDate(new Date(Number(y), Number(m) - 1, Number(d))) === iso ? iso : null;
}
