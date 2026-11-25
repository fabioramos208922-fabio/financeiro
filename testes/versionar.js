/* Põe no index.html a versão (?v=...) de cada CSS e JS, calculada pelo conteúdo, para o
   navegador não usar arquivos velhos. Rodar antes de publicar: node testes/versionar.js */
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const raiz = path.join(__dirname, ".."), pagina = path.join(raiz, "index.html");

function versionar(html) {
  return html.replace(/(href|src)="((?:css|js)\/[^"?]+)(?:\?v=[^"]*)?"/g, (_, attr, arq) => {
    const texto = fs.readFileSync(path.join(raiz, arq), "utf8").replace(/\r\n/g, "\n");
    return `${attr}="${arq}?v=${crypto.createHash("sha256").update(texto).digest("hex").slice(0, 8)}"`;
  });
}

if (require.main === module) {
  fs.writeFileSync(pagina, versionar(fs.readFileSync(pagina, "utf8")));
  console.log("Versões atualizadas.");
}
module.exports = { versionar, pagina };
