/* Leitura de extratos OFX e CSV. Cada linha vira {data, desc, valor, fitid}. */
function decodeEntidades(s) {
  return s.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
}

function parseOFX(text) {
  const out = [];
  for (const bloco of text.split(/<STMTTRN>/i).slice(1)) {
    const corpo = bloco.split(/<\/STMTTRN>/i)[0];
    const tag = t => {
      const m = corpo.match(new RegExp("<" + t + ">([^<\\r\\n]*)", "i"));
      return m ? decodeEntidades(m[1]).trim() : "";
    };
    const data = parseDateAny(tag("DTPOSTED"));
    const bruto = tag("TRNAMT");
    // No padrão OFX o ponto é decimal; com vírgula é formato brasileiro.
    const valor = bruto.includes(",") ? parseBR(bruto) : parseFloat(bruto);
    const textos = [tag("NAME"), tag("MEMO")].filter(Boolean);
    const desc = [...new Set(textos)].join(" — ") || tag("TRNTYPE");
    if (data && !isNaN(valor) && valor !== 0) out.push({ data, desc, valor, fitid: tag("FITID") || null });
  }
  return out;
}

function splitCSVLine(line, sep) {
  const out = [];
  let cur = "", aspas = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (aspas) {
      if (c !== '"') cur += c;
      else if (line[i + 1] === '"') { cur += '"'; i++; }
      else aspas = false;
    } else if (c === '"') aspas = true;
    else if (c === sep) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function detectaSeparador(linhas) {
  const amostra = linhas.slice(0, 10).join("\n");
  return [";", ",", "\t"]
    .map(sep => ({ sep, n: amostra.split(sep).length }))
    .sort((a, b) => b.n - a.n)[0].sep;
}

/* Descobre em que coluna está cada informação. */
function detectaColunas(linhas) {
  const ehValor = c => /^(VALOR|CREDITO|DEBITO|ENTRADA|SAIDA)/.test(c);
  const cab = linhas.map(r => r.map(norm))
    .findIndex(r => r.some(c => /^DATA/.test(c)) && r.some(ehValor));
  if (cab >= 0) {
    const h = linhas[cab].map(norm);
    const acha = re => h.findIndex(c => re.test(c));
    return {
      cab,
      data: acha(/^DATA/),
      // "Data Lançamento" não é descrição
      desc: h.findIndex(c => !/^DATA/.test(c) && !ehValor(c)
        && /(DESCRI|HISTOR|LANCAMENTO|DETALHE|MEMO|TITULO|ESTABELEC)/.test(c)),
      valor: acha(/^VALOR/),
      credito: acha(/^(CREDITO|ENTRADA)/),
      debito: acha(/^(DEBITO|SAIDA)/),
      sinal: acha(/^(TIPO|NATUREZA|D\/C|C\/D|DC)\b/),
    };
  }
  // Sem cabeçalho: adivinha pela primeira linha que tem data e valor.
  for (let i = 0; i < linhas.length; i++) {
    const s = linhas[i];
    const data = s.findIndex(c => parseDateAny(c));
    if (data < 0) continue;
    let valor = -1;
    for (let j = s.length - 1; j >= 0 && valor < 0; j--) {
      if (j !== data && /\d/.test(s[j]) && !isNaN(parseBR(s[j]))) valor = j;
    }
    if (valor < 0) continue;
    const desc = s.findIndex((c, j) => j !== data && j !== valor && /[A-Za-z]/.test(c));
    return { cab: i - 1, data, desc, valor, credito: -1, debito: -1, sinal: -1 };
  }
  return null;
}

function valorDaLinha(r, col) {
  if (col.valor >= 0 && r[col.valor]) {
    const v = parseBR(r[col.valor]);
    const negativo = col.sinal >= 0 && /^(D|DEBITO|SAIDA)$/.test(norm(r[col.sinal]).trim());
    return negativo ? -Math.abs(v) : v;
  }
  const parte = i => (i >= 0 ? Math.abs(parseBR(r[i])) || 0 : 0);
  return parte(col.credito) - parte(col.debito);
}

function parseCSV(text) {
  const linhas = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.trim());
  if (!linhas.length) return { rows: [], erro: "Arquivo vazio." };
  const sep = detectaSeparador(linhas);
  const tabela = linhas.map(l => splitCSVLine(l, sep));
  const col = detectaColunas(tabela);
  if (!col) return { rows: [], erro: "Não encontrei as colunas de data e valor neste CSV." };
  const rows = [];
  for (const r of tabela.slice(col.cab + 1)) {
    const data = parseDateAny(r[col.data]);
    if (!data) continue;
    const valor = valorDaLinha(r, col);
    if (isNaN(valor) || valor === 0) continue;
    const desc = col.desc >= 0 ? r[col.desc] : r.filter((c, i) => i !== col.data && i !== col.valor).join(" ");
    if (/^SALDO/.test(norm(desc))) continue;
    rows.push({ data, desc: desc || "(sem descrição)", valor, fitid: null });
  }
  return { rows, erro: rows.length ? null : "Nenhuma movimentação encontrada no CSV." };
}
