const fs = require('fs');
const path = require('path');
const RedeNeural = require('./rede_neural/RedeNeural.js');
const { carregarModelo } = require('./rede_neural/modeloUtils.js');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function perguntarPosicao() {
  return new Promise((resolve) => {
    rl.question('Escolha uma posição (0-8): ', (posicaoHumano) => {
      resolve(posicaoHumano);
    });
  });
}

async function perguntarSeJogarNovamente() {
  return new Promise((resolve) => {
    rl.question("Deseja jogar novamente? (s/n): ", (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

//________________//CONFIGURAÇÃO REDE NEURAL//___________________//
let neuroniosCamadaEntrada = 9;
let neuroniosCamadaEscondida = [100, 100, 100];
let neuroniosCamadaSaida = 1;
let estrutura = [neuroniosCamadaEntrada, ...neuroniosCamadaEscondida, neuroniosCamadaSaida];
let redeNeural = new RedeNeural(estrutura);

try {
  const modeloCarregado = carregarModelo(redeNeural, 'modelo_treinado_jogo_da_velha');
  const modeloFormatado = modeloCarregado.map(camada => {
    return {
      pesos: camada.pesos.map(peso => JSON.parse(JSON.stringify(peso))),
      biases: camada.biases
    };
  });
  console.log('Modelo carregado com sucesso!');
} catch (error) {
  console.error(`Erro ao carregar o modelo: ${error.message}`);
  process.exit(1);
}

// Função para exibir o tabuleiro
function exibirTabuleiro(tabuleiro) {
  const email = "\x1b[33m"; // Amarelo
  const reset = "\x1b[0m"; // Reseta a cor
  const corO = "\x1b[32m"; // Cor verde para "O"
  const corX = "\x1b[31m"; // Cor vermelha para "X"

  const simbolos = tabuleiro.map((celula, index) => {
    if (celula === 1) return `${corO}O${reset}`; // "O" em verde
    if (celula === -1) return `${corX}X${reset}`; // "X" em vermelho
    return index.toString();
  });

  console.log(
    `Autor: ${email}edersonfc7@gmail.com${reset}
     Você  (${corO}O${reset}) Vs IA com ${corX}X${reset}  Você começa !!
    
     ${simbolos[0]} | ${simbolos[1]} | ${simbolos[2]}
    ---+---+---
     ${simbolos[3]} | ${simbolos[4]} | ${simbolos[5]}
    ---+---+---
     ${simbolos[6]} | ${simbolos[7]} | ${simbolos[8]}
  `);
}

// Função para verificar o vencedor
function verificarVencedor(tabuleiro) {
  const combinacoesVencedoras = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of combinacoesVencedoras) {
    if (tabuleiro[a] !== 0 && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) {
      return tabuleiro[a] === 1 ? 15 : 10; // 15 para IA, 10 para humano
    }
  }

  return tabuleiro.includes(0) ? null : 0; // Retorna 0 para empate, null para continuar o jogo
}

// Função para obter a jogada da IA
function obterJogadaIA(tabuleiro) {
  let melhorJogada = null;
  let melhorPontuacao = -Infinity;

  const jogadasPossiveis = tabuleiro
    .map((valor, index) => (valor === 0 ? index : null))
    .filter(index => index !== null);

  for (const jogada of jogadasPossiveis) {
    const tabuleiroCopia = [...tabuleiro];
    tabuleiroCopia[jogada] = 1; // Simula a jogada da IA (O)

    const entrada = converterTabuleiroPraEntrada(tabuleiroCopia);
    const pontuacao = redeNeural.propagar(entrada)[0];

    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorJogada = jogada;
    }
  }

  return melhorJogada;
}

function converterTabuleiroPraEntrada(tabuleiro) {
  return tabuleiro.map(valor => valor === -1 ? -1 : valor === 1 ? 1 : 0);
}

// Função para criar o delay de 1 segundo
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function jogarContraIA() {
  let tabuleiro = Array(9).fill(0);
  let vencedor = null;
  let jogadorHumano = -1;

  while (vencedor === null) {
    console.clear();
    exibirTabuleiro(tabuleiro);
    let posicaoHumano = await perguntarPosicao();
    console.log(`Você escolheu a posição: ${posicaoHumano}`);
    // Auditoria
    // console.log(tabuleiro)

    if (tabuleiro[posicaoHumano] === 0) {
      // Auditoria, Jogada Humana Posição no Tabuleiro
      tabuleiro[posicaoHumano] = jogadorHumano;
    } else {
      console.log("Posição inválida! Tente novamente.");
      continue;
    }

    vencedor = verificarVencedor(tabuleiro);
    if (vencedor !== null) break;

    // Adicionando um delay de 1 segundo antes da IA marcar a jogada
    await delay(2000);

    const posicaoIA = obterJogadaIA(tabuleiro);
    // Auditoria, Jogada da IA escolhendo uma posição pra marcar no tabuleiro
    console.log("Jogada IA => " + posicaoIA)
    await delay(2000);
    tabuleiro[posicaoIA] = 1;
    vencedor = verificarVencedor(tabuleiro);
  }

  console.clear();
  exibirTabuleiro(tabuleiro);

  if (vencedor === 10) {
    console.log("Parabéns! Você ganhou!");
  } else if (vencedor === 15) {
    console.log("A IA ganhou. Melhor sorte na próxima vez!");
  } else {
    console.log("O jogo terminou em empate!");
  }

  let answer = await perguntarSeJogarNovamente();
  if (answer === 's') {
    jogarContraIA();
  } else {
    console.log("Obrigado por jogar! Até a próxima.");
    rl.close(); // Fecha o readline
  }
}

jogarContraIA();
