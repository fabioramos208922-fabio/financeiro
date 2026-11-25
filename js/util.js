/* Atalhos de DOM e formatação. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = v => brl.format(v || 0);
const fmtCampo = v => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_L = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const SEM_L = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const dBR = iso => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const dBRy = iso => dBR(iso) + "/" + iso.slice(0, 4);
const dLong = iso => diaDoMes(iso) + " de " + MESES[Number(iso.slice(5, 7)) - 1];
const mesNome = mk => MESES_L[Number(mk.slice(5, 7)) - 1];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* Data de hoje; app.js atualiza se a página ficar aberta depois da meia-noite. */
let HOJE = isoDate(new Date());
