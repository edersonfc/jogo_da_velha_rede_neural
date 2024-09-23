
// Importa o módulo fs para manipulação de arquivos
const fs = require('fs');

// Verifica se há um vencedor ou empate
function verificarVencedor(tabuleiro) {
  const linhasVitoria = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
    [0, 4, 8], [2, 4, 6]             // Diagonais
  ];
  for (const [a, b, c] of linhasVitoria) {
    if (tabuleiro[a] !== 0 && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) {
      return tabuleiro[a] === 1 ? 15 : 10;  // 15 para "O", 10 para "X"
    }
  }
  return tabuleiro.includes(0) ? null : 5;  // 5 para empate
}
//______________________________/______________________________/______________________________

// Função auxiliar para encontrar uma posição vazia no tabuleiro
function obterPosicaoVazia(tabuleiro) {
  let posicoesVazias = tabuleiro.map((valor, index) => (valor === 0 ? index : null)).filter(index => index !== null);
  return posicoesVazias[Math.floor(Math.random() * posicoesVazias.length)];
}
//______________________________/______________________________/______________________________

// Função para gerar movimentos e treinar a rede neural
function gerarMovimentos() {
  let tabuleiro = Array(9).fill(0);
  let jogadas = [];
  let vencedor = null;
  // console.log(tabuleiro);
  for (let i = 0; i < 9 && vencedor === null; i++) {
    let jogador = i % 2 === 0 ? 1 : -1;  // Alterna entre O (1) e X (-1)
    let posicao = obterPosicaoVazia(tabuleiro);
    tabuleiro[posicao] = jogador;
    jogadas.push([...tabuleiro]);  // Salva a configuração atual do tabuleiro
    vencedor = verificarVencedor(tabuleiro);
  }
  return { jogadas, vencedor };
}
//______________________________/______________________________/______________________________
/*
function Jogadas(quantidadeDeRodadas) {
  // Número de iterações de treinamento
  const iteracoes = quantidadeDeRodadas;  
  for (let i = 0; i < iteracoes; i++) {
    const { jogadas, vencedor } = gerarMovimentos();
    console.log(jogadas);
    console.log(vencedor);
  }//FOR
}
Jogadas(2);
*/




//Função que tem os recursos que Grava as Jogadas em Arquivo JSON
// Função para executar as rodadas de jogadas
function Jogadas(quantidadeDeRodadas) {
  const iteracoes = quantidadeDeRodadas;
  let jogos = [];  // Array para armazenar todos os jogos

  for (let i = 0; i < iteracoes; i++) {
    const { jogadas, vencedor } = gerarMovimentos();
    const jogo = { [`jogo_${i + 1}`]: jogadas.map((jogada, index) => ({ [`jogada_${index + 1}`]: jogada })) };
    jogos.push(jogo);
  }

  // Escreve os dados no arquivo base_de_conhecimento.json
  fs.writeFileSync('base_de_conhecimento.json', JSON.stringify(jogos, null, 2), 'utf8');
  console.log('Jogadas salvas no arquivo base_de_conhecimento.json');
}

Jogadas(2);

