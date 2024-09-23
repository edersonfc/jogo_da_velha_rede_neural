function imprimirTabuleiro(tabuleiro) {
    const email = "\x1b[33m"; // Amarelo
    const reset = "\x1b[0m"; // Reseta a cor
    const corO = "\x1b[32m"; // Cor verde para "O"
    const corX = "\x1b[31m"; // Cor vermelha para "X"
  
    const simbolos = tabuleiro.map((celula, index) => {
      if (celula === 1) return `${corO}O${reset}`; // "O" em verde
      if (celula === -1) return `${corX}X${reset}`; // "X" em vermelho
      if (celula === 0) return " "; // "X" em vermelho
    //   return index.toString();
    });
  
    console.log(
      `
       ${simbolos[0]} | ${simbolos[1]} | ${simbolos[2]}
      ---+---+---
       ${simbolos[3]} | ${simbolos[4]} | ${simbolos[5]}
      ---+---+---
       ${simbolos[6]} | ${simbolos[7]} | ${simbolos[8]}
    `);
  }



function formatarPosicao(valor) {
    if (valor === 1) return ' X ';
    if (valor === -1) return ' O ';
    return '   '; // Espaço vazio para posições não preenchidas
}

function verificarVitoria(tabuleiro, jogador) {
    const vitorias = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
        [0, 4, 8], [2, 4, 6]              // Diagonais
    ];
    return vitorias.some(combinacao => 
        combinacao.every(posicao => tabuleiro[posicao] === jogador)
    );
}

function gerarJogadasValidas() {
    let jogadasValidas = [];

    function jogar(tabuleiro, jogador) {
        if (verificarVitoria(tabuleiro, -jogador)) {
            // Se o jogador anterior venceu, para as jogadas
            return;
        }

        // Verifica se o tabuleiro está cheio (empate)
        if (tabuleiro.every(pos => pos !== 0)) {
            // jogadasValidas.push([...tabuleiro]);
            jogadasValidas.push([...tabuleiro]);
            imprimirTabuleiro(tabuleiro); // Exibe o tabuleiro quando cheio
            return;
        }

        for (let i = 0; i < tabuleiro.length; i++) {
            if (tabuleiro[i] === 0) { // Casa vazia
                let novoTabuleiro = [...tabuleiro];
                novoTabuleiro[i] = jogador;
                jogadasValidas.push([...novoTabuleiro]);
                imprimirTabuleiro(novoTabuleiro); // Exibe o tabuleiro a cada jogada
                jogar(novoTabuleiro, -jogador); // Alterna jogador
            }
        }
    }

    // Começa com tabuleiro vazio e jogador 1
    jogar([0, 0, 0, 0, 0, 0, 0, 0, 0], 1);

    return jogadasValidas;
}

const todasAsJogadas = gerarJogadasValidas();
