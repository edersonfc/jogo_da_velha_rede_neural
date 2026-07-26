// Path: JogarContraIA.js
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
      resolve(parseInt(posicaoHumano));
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

//________________// CONFIGURAÇÃO DA REDE NEURAL //___________________//
const estrutura = [9, 64, 64, 9]; // DEVE SER IGUAL AO USADO NO TREINAMENTO
const redeNeural = new RedeNeural(estrutura);

// Carregar modelo treinado
try {
  const modeloCarregado = carregarModelo(redeNeural, 'modelo_treinado_jogo_da_velha');
  if (modeloCarregado) {
    redeNeural.importarModelo(modeloCarregado);
    console.log('Modelo carregado com sucesso!');
  } else {
    throw new Error('Modelo não encontrado ou inválido');
  }
} catch (error) {
  console.error(`Erro ao carregar o modelo: ${error.message}`);
  process.exit(1);
}

// Função para exibir o tabuleiro
function exibirTabuleiro(tabuleiro) {
  const email = "\x1b[33m"; // Amarelo
  const reset = "\x1b[0m";  // Reseta a cor
  const corO = "\x1b[32m";  // Verde para "O"
  const corX = "\x1b[31m";  // Vermelho para "X"

  const simbolos = tabuleiro.map((celula, index) => {
    if (celula === 1) return `${corO}O${reset}`;
    if (celula === -1) return `${corX}X${reset}`;
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
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
    [0, 4, 8], [2, 4, 6]             // Diagonais
  ];

  for (const [a, b, c] of combinacoesVencedoras) {
    if (tabuleiro[a] !== 0 && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) {
      return tabuleiro[a]; // 1 para IA, -1 para humano
    }
  }

  return tabuleiro.includes(0) ? null : 0; // 0 para empate
}

// Função para obter a jogada da IA (CORRIGIDA)
function obterJogadaIA(tabuleiro) {
  const estadoProcessado = tabuleiro.map(c => {
    if (c === 1) return 1;    // IA
    if (c === -1) return 0;   // Humano
    return 0.5;               // Vazio
  });

  const previsao = redeNeural.forward(estadoProcessado).ativacoes.slice(-1)[0];
  
  let melhorJogada = -1;
  let melhorValor = -Infinity;
  
  // Encontra a melhor jogada válida
  for (let i = 0; i < 9; i++) {
    if (tabuleiro[i] === 0 && previsao[i] > melhorValor) {
      melhorValor = previsao[i];
      melhorJogada = i;
    }
  }
  
  return melhorJogada;
}

// Função para criar o delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function jogarContraIA() {
  let tabuleiro = Array(9).fill(0);
  let vencedor = null;
  const JOGADOR_HUMANO = -1;
  const JOGADOR_IA = 1;

  while (vencedor === null) {
    console.clear();
    exibirTabuleiro(tabuleiro);
    
    // Jogada do humano
    let posicaoHumano;
    while (true) {
      posicaoHumano = await perguntarPosicao();
      if (tabuleiro[posicaoHumano] === 0 && posicaoHumano >= 0 && posicaoHumano <= 8) break;
      console.log("Posição inválida! Tente novamente.");
    }
    
    tabuleiro[posicaoHumano] = JOGADOR_HUMANO;
    vencedor = verificarVencedor(tabuleiro);
    if (vencedor !== null) break;

    // Jogada da IA
    await delay(1000);
    const posicaoIA = obterJogadaIA(tabuleiro);
    console.log(`IA escolheu a posição: ${posicaoIA}`);
    await delay(1000);
    tabuleiro[posicaoIA] = JOGADOR_IA;
    vencedor = verificarVencedor(tabuleiro);
  }

  console.clear();
  exibirTabuleiro(tabuleiro);

  if (vencedor === JOGADOR_HUMANO) {
    console.log("Parabéns! Você ganhou!");
  } else if (vencedor === JOGADOR_IA) {
    console.log("A IA ganhou. Melhor sorte na próxima vez!");
  } else {
    console.log("O jogo terminou em empate!");
  }

  const resposta = await perguntarSeJogarNovamente();
  if (resposta === 's') {
    jogarContraIA();
  } else {
    console.log("Obrigado por jogar! Até a próxima.");
    rl.close();
  }
}

jogarContraIA();