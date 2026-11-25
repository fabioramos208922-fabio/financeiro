/* Dados fictícios usados no modo demonstração. */
function gerarDemo(hoje){
  let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
  const r2=v=>Math.round(v*100)/100;
  const [hy,hm]=hoje.split("-").map(Number);
  const ini=isoDate(new Date(hy,hm-3,1));
  const fimProj=addDays(hoje,45);
  const itens=[]; let n=0;
  const add=(o)=>itens.push({id:"demo"+(n++),origem:o.origem||"manual",criado:0,...o,valor:r2(o.valor)});
  const st=d=>d<hoje?"realizado":"previsto";
  const porDiaSemana=[520,980,900,1020,1180,1480,1690]; // dom..sáb
  const fiados=["Seu João","Dona Cida","Marquinhos","Bar do Zé"];
  let vendasMesAnt={}, semana=0, credAcum=0;
  for(let d=ini; d<=fimProj; d=addDays(d,1)){
    const dt=new Date(d+"T12:00:00"), wd=dt.getDay(), dia=dt.getDate(), mk=d.slice(0,7);
    // vendas (só passado e hoje)
    if(d<hoje){
      const base=porDiaSemana[wd]*(0.85+rnd()*0.3)*(dia<=10?1.12:1);
      vendasMesAnt[mk]=(vendasMesAnt[mk]||0)+base;
      add({tipo:"entrada",status:"realizado",data:d,valor:base*0.27,forma:"dinheiro",desc:"Vendas balcão (dinheiro)"});
      add({tipo:"entrada",status:"realizado",data:d,valor:base*0.36,forma:"pix",desc:"Vendas Pix"});
      add({tipo:"entrada",status:"realizado",data:d,valor:base*0.17,forma:"debito",desc:"Maquininha débito",origem:"extrato"});
      credAcum+=base*0.20;
      if(rnd()<0.12) add({tipo:"entrada",status:"realizado",data:d,valor:60+rnd()*220,forma:"fiado",desc:"Recebido fiado: "+fiados[Math.floor(rnd()*4)]});
    }
    // repasse do crédito toda segunda (o que vendeu na semana anterior)
    if(wd===1){
      const v=d<hoje?(credAcum||1500):1650+rnd()*400; credAcum=d<hoje?0:credAcum;
      add({tipo:"entrada",status:st(d),data:d,valor:v,forma:"credito",desc:"Repasse maquininha (crédito)",origem:d<hoje?"extrato":"manual"});
    }
    // fornecedores: terça e sexta
    if(wd===2) add({tipo:"saida",status:st(d),data:d,valor:2900+rnd()*600,cat:"fornecedor",desc:"Distribuidora Bom Preço",origem:d<hoje?"extrato":"manual"});
    if(wd===5) add({tipo:"saida",status:st(d),data:d,valor:1050+rnd()*350,cat:"fornecedor",desc:"Hortifruti Chapada"});
    if(wd===3) add({tipo:"saida",status:st(d),data:d,valor:70+rnd()*60,cat:"variavel",desc:"Frete e entregas"});
    // contas do mês
    const mensal=[[1,"financeira",59.9,"Tarifa pacote bancário"],[5,"fixa",1800,"Aluguel do ponto"],[5,"fixa",2600,"Salários (2 funcionários)"],[8,"variavel",230,"Sacolas e embalagens"],[10,"fixa",0,"Energia (Coelba)"],[12,"fixa",128,"Água (Embasa)"],[15,"fixa",109.9,"Internet"],[10,"fixa",380,"Contador"],[20,"fixa",1100,"Adiantamento funcionários"],[20,"imposto",0,"DAS Simples Nacional"],[28,"retirada",4500,"Retirada do dono"]];
    for(const [dd,cat,v,desc] of mensal){
      if(dia!==dd) continue;
      let val=v;
      if(desc.startsWith("Energia")) val=560+rnd()*120;
      if(desc.startsWith("DAS")){ const pm=isoDate(new Date(dt.getFullYear(),dt.getMonth()-1,1)).slice(0,7); val=(vendasMesAnt[pm]||30000)*0.06; }
      add({tipo:"saida",status:st(d),data:d,valor:val,cat,desc,origem:(cat==="financeira"&&d<hoje)?"extrato":"manual"});
    }
    if(dia===17 && d<hoje) add({tipo:"saida",status:"realizado",data:d,valor:150+rnd()*300,cat:"manutencao",desc:["Conserto do freezer","Troca de lâmpadas","Manutenção da balança"][Math.floor(rnd()*3)]});
  }
  const prox=isoDate(new Date(hy,hm,1));
  add({tipo:"saida",status:"previsto",data:addDays(prox,2),valor:10500,cat:"fornecedor",desc:"Estoque de fim de ano (Atacadão)"});
  add({tipo:"saida",status:"previsto",data:addDays(prox,17),valor:2600,cat:"fixa",desc:"13º salário (2ª parcela)"});
  add({tipo:"entrada",status:"previsto",data:addDays(hoje,4),valor:480,forma:"fiado",desc:"Bar do Zé (fiado do mês)"});
  add({tipo:"entrada",status:"previsto",data:addDays(hoje,-2),valor:180,forma:"fiado",desc:"Dona Cida (fiado)"});
  const regras=[{k:"PIX RECEBIDO",tipo:"entrada",v:"pix"},{k:"DISTRIBUIDORA BOM PRECO",tipo:"saida",v:"fornecedor"},{k:"HORTIFRUTI CHAPADA",tipo:"saida",v:"fornecedor"}];
  return {cfg:{nome:"Mercadinho Chapada",saldoInicial:2500,saldoData:ini,regras},itens};
}

