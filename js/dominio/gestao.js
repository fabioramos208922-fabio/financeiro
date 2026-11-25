/* Contatos, metas, parcelas, relatório anual e backup. Funções puras. */

/* ---------- contatos ---------- */
/* Quanto cada contato deve (receber) e quanto se deve a ele (pagar). */
function saldoContatos(itens, hoje) {
  const mapa = {};
  for (const l of itens) {
    if (!l.contatoId) continue;
    const c = mapa[l.contatoId] = mapa[l.contatoId] || { receber: 0, pagar: 0, atrasado: 0, movimentado: 0, ultimo: "" };
    if (l.status === "previsto") {
      c[l.tipo === "entrada" ? "receber" : "pagar"] += l.valor;
      if (l.tipo === "entrada" && l.data < hoje) c.atrasado += l.valor;
    } else {
      c.movimentado += l.valor;
      if (l.data > c.ultimo) c.ultimo = l.data;
    }
  }
  return mapa;
}

/* Só dígitos com o 55 do Brasil. Devolve "" se não parecer um telefone com DDD. */
function telefoneWhats(tel) {
  const n = String(tel || "").replace(/\D/g, "").replace(/^0+/, "");
  if (n.length === 10 || n.length === 11) return "55" + n;
  return /^55\d{10,11}$/.test(n) ? n : "";
}

/* ---------- parcelas e repetição ---------- */
/* Divide sem perder centavos: 100 em 3x = 33,34 + 33,33 + 33,33. */
function dividirParcelas(valor, n) {
  const total = Math.round(valor * 100), base = Math.floor(total / n), sobra = total - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < sobra ? 1 : 0)) / 100);
}

/* codigo: "1" = uma vez; "m6" = 6 meses; "s4" = 4 semanas; "p3" = parcelado em 3x. */
function gerarRepeticoes(codigo, data, valor) {
  const tipo = codigo[0], n = Number(codigo.slice(1));
  if (!"msp".includes(tipo) || !n) return [{ data, valor }];
  const valores = tipo === "p" ? dividirParcelas(valor, n) : Array(n).fill(valor);
  return valores.map((v, i) => ({
    data: tipo === "s" ? addDays(data, 7 * i) : addMonths(data, i),
    valor: v,
    parcela: tipo === "p" ? `${i + 1}/${n}` : undefined,
  })).filter(x => x.valor > 0);
}

/* Separa um previsto em parte paga e restante. */
function dividirBaixa(l, valor, hoje, novoId) {
  return {
    feito: { ...l, id: novoId, valor: arred(valor), status: "realizado", data: hoje },
    resto: { ...l, valor: arred(l.valor - valor) },
  };
}

/* ---------- metas e saúde do caixa ---------- */
function diasNoMes(mk) { return diaDoMes(endOfMonth(mk + "-01")); }

function andamentoMetas(itens, metas, hoje) {
  const mk = monthKey(hoje), r = resumoMes(itens, mk), dia = diaDoMes(hoje), dias = diasNoMes(mk);
  const prevCat = {};
  for (const l of itens) {
    if (l.status === "previsto" && l.tipo === "saida" && monthKey(l.data) === mk) {
      const k = l.cat || "variavel";
      prevCat[k] = (prevCat[k] || 0) + l.valor;
    }
  }
  const m = metas || {}, orc = m.orcamento || {};
  const fat = Number(m.faturamento) || 0;
  return {
    r,
    ritmo: r.entradas / dia * dias,
    faltaPorDia: Math.max(0, fat - r.entradas) / (dias - dia + 1),
    orcamento: Object.keys(CATS).filter(k => orc[k] > 0).map(k => {
      const gasto = r.porCat[k] || 0, previsto = prevCat[k] || 0;
      return { k, limite: orc[k], gasto, previsto, estado: gasto > orc[k] ? "bad" : gasto + previsto > orc[k] ? "warn" : "ok" };
    }),
  };
}

const CUSTO_FIXO = ["fixa", "manutencao", "financeira"];
function custoFixo(r) { return CUSTO_FIXO.reduce((a, k) => a + (r.porCat[k] || 0), 0); }

/* Quanto precisa entrar no mês para cobrir os custos fixos (sem a retirada do dono). */
function pontoEquilibrio(r) {
  if (r.entradas <= 0 || r.margem <= 0) return null;
  return custoFixo(r) / (r.margem / r.entradas);
}

/* Quantos dias o saldo aguenta pagando a média de saídas dos últimos 90 dias. */
function diasDeFolego(itens, saldo, hoje) {
  const ini = addDays(hoje, -90);
  const saidas = itens.filter(l => l.status === "realizado" && l.tipo === "saida" && l.data >= ini && l.data < hoje);
  if (!saidas.length) return null;
  const primeira = saidas.reduce((a, l) => (l.data < a ? l.data : a), hoje);
  const dias = Math.max(1, Math.round((new Date(hoje) - new Date(primeira)) / 864e5));
  return Math.max(0, Math.floor(saldo / (soma(saidas) / dias)));
}

/* ---------- relatório anual ---------- */
function resumoAno(itens, ano) {
  const meses = Array.from({ length: 12 }, (_, i) => {
    const mk = ano + "-" + pad(i + 1), r = resumoMes(itens, mk);
    return {
      mk, entradas: r.entradas, variaveis: r.custoVar, margem: r.margem, fixas: custoFixo(r),
      retirada: r.porCat.retirada || 0, saidas: r.saidas, resultado: r.resultado,
    };
  });
  const total = { mk: "total" };
  for (const k of ["entradas", "variaveis", "margem", "fixas", "retirada", "saidas", "resultado"]) {
    total[k] = arred(meses.reduce((a, m) => a + m[k], 0));
  }
  return { meses, total };
}

function campoCSV(v) {
  const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v ?? "");
  return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function montarCSV(linhas) { return linhas.map(r => r.map(campoCSV).join(";")).join("\r\n"); }

/* ---------- backup ---------- */
const ehObjeto = o => !!o && typeof o === "object" && !Array.isArray(o);
const daLista = (lista, k) => typeof k === "string" && Object.hasOwn(lista, k);
const dataValida = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && parseDateAny(d) === d;

/* Confere o arquivo e monta dados limpos. Lança erro com mensagem para a pessoa. */
function lerBackup(texto) {
  let b;
  try { b = JSON.parse(texto); } catch (e) { throw new Error("Esse arquivo não é um backup válido."); }
  if (!ehObjeto(b) || b.app !== "caixacerto" || !ehObjeto(b.cfg) || !ehObjeto(b.months)) throw new Error("Esse arquivo não é um backup do Caixa Certo.");
  if (!dataValida(b.cfg.saldoData)) throw new Error("O backup está sem a data do saldo inicial.");

  const lista = x => (Array.isArray(x) ? x.filter(ehObjeto) : []);
  const numero = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const m = ehObjeto(b.cfg.metas) ? b.cfg.metas : {}, orcamento = {};
  for (const k of Object.keys(CATS)) if (ehObjeto(m.orcamento) && numero(m.orcamento[k]) > 0) orcamento[k] = numero(m.orcamento[k]);
  const cfg = {
    nome: String(b.cfg.nome || "Meu negócio"),
    saldoInicial: numero(b.cfg.saldoInicial),
    saldoData: b.cfg.saldoData,
    projVendas: b.cfg.projVendas !== false,
    regras: lista(b.cfg.regras)
      .filter(r => typeof r.k === "string" && (r.tipo === "entrada" ? daLista(FORMAS, r.v) : r.tipo === "saida" && daLista(CATS, r.v)))
      .map(r => ({ k: r.k, tipo: r.tipo, v: r.v })),
    contatos: lista(b.cfg.contatos).filter(c => c.id && c.nome).map(c => ({
      id: String(c.id), nome: String(c.nome), tipo: c.tipo === "fornecedor" ? "fornecedor" : "cliente",
      tel: String(c.tel || ""), obs: String(c.obs || ""),
    })),
    metas: { faturamento: numero(m.faturamento), lucro: numero(m.lucro), orcamento },
  };

  const months = {}, ids = new Set();
  let total = 0, ignorados = 0;
  for (const bruto of Object.values(b.months)) {
    for (const l of Array.isArray(bruto) ? bruto : []) {
      const ok = ehObjeto(l) && l.id && !ids.has(String(l.id)) && dataValida(l.data)
        && (l.tipo === "entrada" || l.tipo === "saida") && (l.status === "realizado" || l.status === "previsto")
        && Number.isFinite(l.valor) && l.valor > 0;
      if (!ok) { ignorados++; continue; }
      const n = { id: String(l.id), tipo: l.tipo, status: l.status, data: l.data, valor: l.valor, desc: String(l.desc || ""), origem: l.origem === "extrato" ? "extrato" : "manual", criado: numero(l.criado) };
      for (const k of ["fitid", "extratoDesc", "contatoId", "grupo", "parcela"]) if (l[k]) n[k] = String(l[k]);
      if (l.tipo === "entrada") n.forma = daLista(FORMAS, l.forma) ? l.forma : "outra";
      else n.cat = daLista(CATS, l.cat) ? l.cat : "variavel";
      ids.add(n.id);
      (months[monthKey(n.data)] = months[monthKey(n.data)] || []).push(n);
      total++;
    }
  }
  return { cfg, months, total, ignorados };
}

/* ---------- demonstração ---------- */
/* Acrescenta contatos e metas aos dados fictícios. */
function enriquecerDemo(d) {
  const nomes = [["Seu João", "cliente"], ["Dona Cida", "cliente"], ["Marquinhos", "cliente"], ["Bar do Zé", "cliente"], ["Distribuidora Bom Preço", "fornecedor"], ["Hortifruti Chapada", "fornecedor"]];
  d.cfg.contatos = nomes.map(([nome, tipo], i) => ({ id: "c" + i, nome, tipo, tel: "", obs: "" }));
  for (const l of d.itens) {
    const c = d.cfg.contatos.find(x => l.desc.includes(x.nome));
    if (c) l.contatoId = c.id;
  }
  d.cfg.metas = { faturamento: 38000, lucro: 5000, orcamento: { fornecedor: 19000, fixa: 6500, variavel: 800, manutencao: 500 } };
  return d;
}
