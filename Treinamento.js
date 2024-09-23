
const RedeNeural = require('./rede_neural/RedeNeural.js');
const { salvarModelo } = require('./rede_neural/modeloUtils.js');

// Função para gerar movimentos e treinar a rede neural
function gerarMovimentos() {
  let tabuleiro = Array(9).fill(0);
  let jogadas = [];
  let vencedor = null;

  for (let i = 0; i < 9 && vencedor === null; i++) {
    let jogador = i % 2 === 0 ? 1 : -1;  // Alterna entre O (1) e X (-1)
    let posicao = obterPosicaoVazia(tabuleiro);
    tabuleiro[posicao] = jogador;
    jogadas.push([...tabuleiro]);  // Salva a configuração atual do tabuleiro
    vencedor = verificarVencedor(tabuleiro);
  }

  return { jogadas, vencedor };
}

// Função auxiliar para encontrar uma posição vazia no tabuleiro
function obterPosicaoVazia(tabuleiro) {
  let posicoesVazias = tabuleiro.map((valor, index) => (valor === 0 ? index : null)).filter(index => index !== null);
  return posicoesVazias[Math.floor(Math.random() * posicoesVazias.length)];
}

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

//________________//CONFIGURAÇÃO REDE NEURAL//___________________//
// Instânciando e Configurando a Rede Neural
let neuroniosCamadaEntrada = 9;
let neuroniosCamadaEscondida = [100, 100, 100];
let neuroniosCamadaSaida = 1;
// let estrutura = [9, 6, 6, 1];  // Estrutura da rede neural
let estrutura = [neuroniosCamadaEntrada, ...neuroniosCamadaEscondida, neuroniosCamadaSaida];  // Estrutura da rede neural
let redeNeural = new RedeNeural(estrutura);



// Função principal para treinar a rede neural com os movimentos gerados
function treinarComMovimentos() {
  const iteracoes = 1;  // Número de iterações de treinamento
  const taxaAprendizagem = 0.01;  // Taxa de aprendizagem da rede neural
  for (let i = 0; i < iteracoes; i++) {
    const { jogadas, vencedor } = gerarMovimentos();
    // console.log(jogadas[jogadas.length - 1]) // Movimento de 1 à 9
    // console.log(jogadas[jogadas.length - 1]) // Ultimo Movimento da Jogada
        
    // Treina a rede neural para cada jogada com o resultado da partida
    
    jogadas.forEach(jogada => {
      const resultadoEsperado = [vencedor];  // O vencedor é a saída esperada
      console.log(jogada)

      redeNeural.treinar(jogada, resultadoEsperado, taxaAprendizagem, 1);
      if (i % 100 === 0) {
        console.log(`Iteração ${i} concluída`);
      }
    });
    
  }
  console.log("Treinamento concluído!");
  // Salva o modelo após o treinamento
  // salvarModelo(redeNeural, 'modelo_treinado_jogo_da_velha'); ATIVAR DEPOIS
}


/*
function treinarComMovimentos() {
  const iteracoes = 1000;  // Reduzido de 10000 para 1000
  const taxaAprendizagem = 0.01;
  for (let i = 0; i < iteracoes; i++) {
    const { jogadas, vencedor } = gerarMovimentos();
    const jogadaAleatoria = jogadas[Math.floor(Math.random() * jogadas.length)];
    const resultadoEsperado = [vencedor];
    redeNeural.treinar(jogadaAleatoria, resultadoEsperado, taxaAprendizagem, 1);
    if (i % 100 === 0) {
      console.log(`Iteração ${i} concluída`);
    }
  }
  console.log("Treinamento concluído!");
  salvarModelo(redeNeural, 'modelo_treinado_jogo_da_velha');
}
*/



// Executa o treinamento
treinarComMovimentos();

