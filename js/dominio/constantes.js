/* Formas de recebimento, categorias de despesa e suas cores. */
const FORMAS = {
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  pix: "Pix",
  transferencia: "Transferência",
  fiado: "Recebimento anterior (fiado)",
  outra: "Outra entrada",
};
const CATS = {
  fixa: "Despesa fixa",
  variavel: "Despesa variável",
  fornecedor: "Materiais / fornecedor",
  imposto: "Imposto",
  manutencao: "Manutenção",
  financeira: "Despesa financeira",
  retirada: "Retirada do dono",
};
/* Categorias descontadas para chegar à margem de contribuição. */
const CUSTO_VAR = ["variavel", "fornecedor", "imposto"];
/* Formas que entram na média de vendas da projeção. */
const FORMAS_A_VISTA = ["dinheiro", "pix", "debito"];

const COR_NEUTRA = "#7b8794";
const COR_CAT = {
  fixa: "#5a6ff0", variavel: "#e39a2d", fornecedor: "#9b5de5", imposto: "#a0674b",
  manutencao: "#1f9e9a", financeira: "#d9534f", retirada: COR_NEUTRA,
};
const COR_FORMA = {
  dinheiro: "#2e9e63", pix: "#17b3a3", debito: "#3d7be0", credito: "#6a5ae0",
  transferencia: "#5b8c3a", fiado: "#d08a1e", outra: COR_NEUTRA,
};
