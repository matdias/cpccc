async function carregarCsv(caminho) {
  const resp = await fetch(caminho);
  if (!resp.ok) throw new Error(`Erro ao carregar ${caminho}: ${resp.status}`);
  const texto = await resp.text();

  const linhas = texto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (!linhas.length) return [];

  const cabecalho = linhas[0].split(";");
  return linhas.slice(1).map(linha => {
    const partes = linha.split(";");
    const obj = {};
    cabecalho.forEach((col, i) => {
      obj[col] = partes[i] ?? "";
    });
    return obj;
  });
}

function obterAnosUnicos(dados) {
  const anos = new Set();
  dados.forEach(l => {
    if (l.Ano) anos.add(Number(l.Ano));
  });
  return Array.from(anos).sort((a, b) => b - a); // mais recente primeiro
}

function filtrarPorAnoESegmento(dados, ano, segmento) {
  return dados.filter(l => {
    const okAno = String(l.Ano) === String(ano);
    const okSeg = segmento ? l.Segmento === segmento : true;
    return okAno && okSeg;
  });
}

function ordenarPorPontuacaoDesc(dados) {
  return [...dados].sort((a, b) => {
    const pa = parseFloat(a.Pontuacao || "0");
    const pb = parseFloat(b.Pontuacao || "0");
    return pb - pa;
  });
}

function criarTabelaSimples(container, dados) {
  container.innerHTML = "";

  if (!dados.length) {
    container.textContent = "Nenhum dado disponível para este filtro.";
    return;
  }

  const tabela = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const trHead = document.createElement("tr");
  ["Posição", "Pessoa cervejeira", "Pontuação"].forEach(titulo => {
    const th = document.createElement("th");
    th.textContent = titulo;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  dados.forEach((linha, idx) => {
    const tr = document.createElement("tr");

    const tdPos = document.createElement("td");
    const pos = idx + 1;
    if (pos <= 3) {
      const medal = document.createElement("span");
      medal.className = "rank-medal";
      const bolinha = document.createElement("span");
      const label = document.createElement("span");
      if (pos === 1) {
        bolinha.className = "gold";
        label.textContent = "1º";
      } else if (pos === 2) {
        bolinha.className = "silver";
        label.textContent = "2º";
      } else {
        bolinha.className = "bronze";
        label.textContent = "3º";
      }
      medal.appendChild(bolinha);
      medal.appendChild(label);
      tdPos.appendChild(medal);
    } else {
      tdPos.textContent = `${pos}º`;
    }

    const tdPessoa = document.createElement("td");
    tdPessoa.textContent = linha.Pessoa || "";

    const tdPontos = document.createElement("td");
    const valor = parseFloat(linha.Pontuacao || "0");
    tdPontos.textContent = isNaN(valor) ? "" : valor.toFixed(2);

    tr.appendChild(tdPos);
    tr.appendChild(tdPessoa);
    tr.appendChild(tdPontos);
    tbody.appendChild(tr);
  });

  tabela.appendChild(thead);
  tabela.appendChild(tbody);
  container.appendChild(tabela);
}

/* Página: ranking geral */

async function inicializarRankingGeral() {
  const selectAno = document.getElementById("select-ano-geral");
  const containerTabela = document.getElementById("tabela-geral");
  const msg = document.getElementById("mensagem-geral");

  try {
    const dados = await carregarCsv("data/ranking.csv");
    if (!dados.length) {
      msg.textContent = "Ainda não há dados cadastrados para o circuito.";
      return;
    }

    const anos = obterAnosUnicos(dados);
    if (!anos.length) {
      msg.textContent = "Não foi possível identificar os anos no arquivo.";
      return;
    }

    anos.forEach(ano => {
      const opt = document.createElement("option");
      opt.value = String(ano);
      opt.textContent = String(ano);
      selectAno.appendChild(opt);
    });

    const anoPadrao = String(anos[0]);
    selectAno.value = anoPadrao;

    function atualizar() {
      const anoSel = selectAno.value;
      const filtrados = filtrarPorAnoESegmento(dados, anoSel, "Geral");
      const ordenados = ordenarPorPontuacaoDesc(filtrados);
      criarTabelaSimples(containerTabela, ordenados);
      msg.textContent = `Ranking geral do ano de ${anoSel}.`;
    }

    selectAno.addEventListener("change", atualizar);
    atualizar();
  } catch (err) {
    console.error(err);
    msg.textContent = "Erro ao carregar o ranking. Verifique o arquivo data/ranking.csv.";
  }
}

/* Página: mestres por estilo */

const SEGMENTOS_MESTRES = [
  "Mestre das Alemãs",
  "Mestre das Americanas",
  "Mestre das Belgas",
  "Mestre das Inglesas",
  "Mestre das Cervejas de Especialidade"
];

async function inicializarMestres() {
  const selectAno = document.getElementById("select-ano-mestres");
  const msg = document.getElementById("mensagem-mestres");

  try {
    const dados = await carregarCsv("data/ranking.csv");
    if (!dados.length) {
      msg.textContent = "Ainda não há dados cadastrados para o circuito.";
      return;
    }

    const anos = obterAnosUnicos(dados);
    if (!anos.length) {
      msg.textContent = "Não foi possível identificar os anos no arquivo.";
      return;
    }

    anos.forEach(ano => {
      const opt = document.createElement("option");
      opt.value = String(ano);
      opt.textContent = String(ano);
      selectAno.appendChild(opt);
    });

    const anoPadrao = String(anos[0]);
    selectAno.value = anoPadrao;

    function atualizar() {
      const anoSel = selectAno.value;
      SEGMENTOS_MESTRES.forEach(segmento => {
        const container = document.querySelector(
          `.tabela-mestre[data-segmento="${segmento}"]`
        );
        if (!container) return;
        const filtrados = filtrarPorAnoESegmento(dados, anoSel, segmento);
        const ordenados = ordenarPorPontuacaoDesc(filtrados);
        criarTabelaSimples(container, ordenados);
      });
      msg.textContent = `Mestres por estilo · ano ${anoSel}.`;
    }

    selectAno.addEventListener("change", atualizar);
    atualizar();
  } catch (err) {
    console.error(err);
    msg.textContent = "Erro ao carregar os dados. Verifique o arquivo data/ranking.csv.";
  }
}

/* Roteamento simples por página */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "ranking-geral") {
    inicializarRankingGeral();
  } else if (page === "mestres") {
    inicializarMestres();
  }
});
