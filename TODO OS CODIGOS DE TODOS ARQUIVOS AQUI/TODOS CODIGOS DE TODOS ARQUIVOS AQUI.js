EU CRIEI ESSE JOGO E QUERIA QUE ELE SE TORNASSE INVENCIVEL, OBSERVA QUE ELE É TREINADO EM IA
QUE GERA UM MODELO DE CONHECIMENTO ARQUIVO JSON "modelo_treinado_jogo_da_velha.json" APÓS O TREINAMENTO 
E DEPOIS ELE USA ESSE MODELO GERADO QUE TEM OS PESOS DE CONHECIMENTOS DAS JOGADAS, MAS EU AINDA ESTOU 
ACHANDO ESSE MODELO MUITO FRACO, MESMO MODIFICANDO A QUANTIDADE DE TREINAMENTO, OU OS VALORES DE TAXAS 
DE APRENDISAGEM, OUTRA QUESTÃO É QUE EU NÃO QUERO USAR NENHUMA BIBLIOTECA DE REDE NEURAL DE TERCEIROS 
PORQUE ESSA É A IDÉIDA, TER O MEU PRÓPRIO ALGORITMO DE REDES NEURAIS COMO PODE OBSERVAR NO CÓDIGO,
LEMBRANDO ESSE É UM JOGO TIC TAC TOY ?

ESTRUTURA DE DIRETORIOS DO JOGO DE TIC TAC TOY IA
F:.
├───modelo
├───node_modules
│   └───readline-sync
│       └───lib
└───rede_neural

JogarContraIA.js CODIGO ABAIXO

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

ARQUIVO RedeNeural.js CODIGO ABAIXO

const Camada = require('./Camada.js');

class RedeNeural {
  constructor(estruturas) {
    this.camadas = [];

    for (let i = 0; i < estruturas.length - 1; i++) {
      this.camadas.push(new Camada(estruturas[i + 1], estruturas[i]));
    }
  }

  propagar(entradas) {
    let saidas = entradas;
    this.camadas.forEach(camada => {
      saidas = camada.propagar(saidas);
    });
    return saidas;
  }

  treinar(entradas, saidasEsperadas, taxaAprendizagem, iteracoes) {
    for (let i = 0; i < iteracoes; i++) {
      let saidas = this.propagar(entradas);

      // Calcula o erro para cada neurônio na última camada
      for (let j = 0; j < this.camadas[this.camadas.length - 1].neuronios.length; j++) {
        let neuronio = this.camadas[this.camadas.length - 1].neuronios[j];
        neuronio.erro = saidasEsperadas[j] - neuronio.saida;
      }

      // Ajusta os pesos de cada camada, começando da última para a primeira
      for (let k = this.camadas.length - 1; k >= 0; k--) {
        let entradasCamada = k === 0 ? entradas : this.camadas[k - 1].neuronios.map(neuronio => neuronio.saida);
        let camada = this.camadas[k];
        camada.ajustarPesos(entradasCamada, taxaAprendizagem);
      }
    }
  }

  exportarModelo() {
    const modelo = [];
    for (let i = 0; i < this.camadas.length; i++) {
      const camada = this.camadas[i];
      const dadosCamada = {
        pesos: [],
        biases: []
      };
      for (const neuronio of camada.neuronios) {
        dadosCamada.pesos.push(neuronio.pesos);
        dadosCamada.biases.push(neuronio.bias);
      }
      modelo.push(dadosCamada);
    }
    return modelo;
  }


  // importarModelo(dadosModelo) {
  //   this.camadas.forEach((camada, index) => {
  //     camada.importarPesosBiases(dadosModelo[index]);
  //   });
  // }

  ////##############################
  importarModelo(dadosModelo) {
    if (dadosModelo.length !== this.camadas.length) {
      throw new Error("O modelo importado não corresponde à estrutura da rede neural");
    }
      this.camadas.forEach((camada, index) => {
      camada.importarPesosBiases(dadosModelo[index]);
    });
  }


}

module.exports = RedeNeural;


ARQUIVO Camada.js CODIGO ABAIXO

const Neuronio = require('./Neuronio.js');

class Camada {
  constructor(numNeuronios, numEntradas) {
    // Inicializa a camada com um array de neurônios
    this.neuronios = Array.from({ length: numNeuronios }, () => new Neuronio(numEntradas));
  }

  // Propaga as entradas através da camada
  propagar(entradas) {
    return this.neuronios.map(neuronio => neuronio.propagar(entradas));
  }

  // Ajusta os pesos dos neurônios da camada
  ajustarPesos(entradas, taxaAprendizagem) {
    this.neuronios.forEach(neuronio => neuronio.ajustarPesos(entradas, taxaAprendizagem));
  }

  // Exporta pesos e biases dos neurônios da camada
  exportarPesosBiases() {
    return this.neuronios.map(neuronio => ({
      pesos: neuronio.pesos,
      bias: neuronio.bias
    }));
  }

  
  importarPesosBiases(dadosCamada) {
    if (dadosCamada.pesos.length !== this.neuronios.length || dadosCamada.biases.length !== this.neuronios.length) {
      throw new Error("O modelo importado não corresponde à estrutura da camada");
    }
    const pesos = dadosCamada.pesos;
    const biases = dadosCamada.biases;
    for (let i = 0; i < this.neuronios.length; i++) {
      this.neuronios[i].pesos = pesos[i];
      this.neuronios[i].bias = biases[i];
    }
  }



}

module.exports = Camada;

ARQUIVO Neuronio.js CODIGO ABAIXO

class Neuronio {
    constructor(numEntradas) {
      // Inicializa os pesos com valores aleatórios entre -1 e 1
      this.pesos = Array.from({ length: numEntradas }, () => Math.random() * 2 - 1);
      // Inicializa o bias com um valor aleatório entre -1 e 1
      this.bias = Math.random() * 2 - 1;
      this.saida = 0;
      this.erro = 0;
    }
  
    // Função de ativação (sigmoid)
    ativacao(valor) {
      return 1 / (1 + Math.exp(-valor));
    }
  
    // Propaga as entradas através do neurônio
    propagar(entradas) {
      // Calcula a soma ponderada das entradas mais o bias
      const soma = entradas.reduce((acc, entrada, index) => acc + entrada * this.pesos[index], 0);
      // Calcula a saída do neurônio aplicando a função de ativação
      this.saida = this.ativacao(soma + this.bias);
      return this.saida;
    }
  
    // Ajusta os pesos e o bias do neurônio com base no erro e na taxa de aprendizagem
    ajustarPesos(entradas, taxaAprendizagem) {
      for (let i = 0; i < this.pesos.length; i++) {
        // Ajusta cada peso
        this.pesos[i] += taxaAprendizagem * this.erro * entradas[i];
      }
      // Ajusta o bias
      this.bias += taxaAprendizagem * this.erro;
    }
  }
  
  module.exports = Neuronio;

  ARQUIVO modeloUtils.js CODIGO ABAIXO

// import fs from 'fs';
// import path from 'path';

const fs = require('fs');
const path = require('path');

// Função para salvar o modelo treinado no ambiente Node.js
function salvarModelo(redeNeural, nomeArquivo) {
  const modeloTreinado = redeNeural.exportarModelo();
  const json = JSON.stringify(modeloTreinado, null, 2);
  const caminhoArquivo = path.join(__dirname, '..', 'modelo', `${nomeArquivo}.json`);
  fs.writeFileSync(caminhoArquivo, json, 'utf-8');
  console.log(`Modelo salvo com sucesso em ${caminhoArquivo}`);
}

// Função para carregar o modelo treinado
function carregarModelo(redeNeural, nomeArquivo) {
  try {
    const caminhoArquivo = path.join(__dirname, '..', 'modelo', `${nomeArquivo}.json`);
    const json = fs.readFileSync(caminhoArquivo, 'utf-8');
    const modeloCarregado = JSON.parse(json);
    return modeloCarregado;
  } catch (erro) { console.log("Erro 76465349# => " + erro.message); }
}

// export { salvarModelo, carregarModelo };
module.exports = { salvarModelo, carregarModelo };



NESSE ARQUIVO modelo_treinado_jogo_da_velha.json É CRIADO O MODELO TREINADO COM OS PESOS DE BIASES QUE FICA ASSIM 

[
    {
      "pesos": [
                    [
                    -0.7889672650343971,
                    -0.2000916562222379,
                    -0.9957286138826018,
                    -0.438354461407922,
                    0.07205982351508311,
                    0.3789023148236823,
                    0.009664468911702695,
                    0.38765466293901385,
                    -0.4082902715336876
                    ],

                    ... MAIS PESOS AQUI ENTRE ...

                    [
                    -0.8260701936830066,
                    0.9332057905479108,
                    0.7192211721525954,
                    -0.8528189122044973,
                    0.5157513738300774,
                    -0.3167248893038388,
                    0.7594698558375415,
                    0.6896081995457468,
                    0.9349722404674186
                    ],

             ],
     
            "biases": [
                    8510.225872305007
            ]
   }
]