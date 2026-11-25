/* Animações: números que contam até o valor atual e gráficos que se desenham. */
const semMovimento = () => document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches;
const desacelera = t => 1 - Math.pow(1 - t, 3);

/* Número que conta. O texto final já vai no HTML, então funciona sem animação. */
const contar = v => `<span data-n="${Number(v) || 0}">${fmt(v)}</span>`;

/* Chama passo(0..1) a cada quadro. Para sozinho quando vale() for falso. */
function quadros(ms, passo, vale) {
  let inicio = null;
  passo(0);
  const roda = agora => {
    if (!vale()) return;
    if (inicio === null) inicio = agora;
    const t = Math.min(1, (agora - inicio) / ms);
    passo(t);
    if (t < 1) requestAnimationFrame(roda);
  };
  requestAnimationFrame(roda);
}

const ultimoNumero = {};
/* completo: parte do zero. Senão, parte do valor que estava na tela. */
function animarNumeros(painel, completo) {
  painel.querySelectorAll("[data-n]").forEach((el, i) => {
    const chave = painel.id + i, alvo = Number(el.dataset.n);
    const de = completo ? 0 : ultimoNumero[chave] ?? 0;
    ultimoNumero[chave] = alvo;
    const vez = el.vez = (el.vez || 0) + 1;
    if (de === alvo || semMovimento()) { el.textContent = fmt(alvo); return; }
    quadros(completo ? 1400 : 700,
      t => { el.textContent = fmt(t === 1 ? alvo : de + (alvo - de) * desacelera(t)); },
      () => el.isConnected && el.vez === vez);
  });
}

function animar(painel, completo) {
  if (!painel || !cfg) return;
  animarNumeros(painel, completo);
  painel.querySelectorAll(".chart-box").forEach(box => {
    if (!box.desenhar) return;
    const mudou = box.assinatura !== box.ultima;
    box.ultima = box.assinatura;
    if ((completo || mudou) && !semMovimento()) box.desenhar();
  });
  if (!completo || semMovimento()) return;
  painel.classList.remove("anima");
  void painel.offsetWidth; // reinicia as animações de CSS
  painel.classList.add("anima");
  clearTimeout(painel.fimAnima);
  painel.fimAnima = setTimeout(() => painel.classList.remove("anima"), 2200);
}

const painelAtivo = () => $(".panel.on");
