/*
function imprimirTabuleiro(tabuleiro) {
  // Exibe o tabuleiro de forma organizada (formato 3x3)
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

let n0 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
let n1 = [0, 0, 0, 0, 0, 0, 0, 0];
let n2 = [0, 0, 0, 0, 0, 0, 0];
let n3 = [0, 0, 0, 0, 0, 0];
let n4 = [0, 0, 0, 0, 0];
let n5 = [0, 0, 0, 0];
let n6 = [0, 0, 0];
let n7 = [0, 0];
let n8 = [0];


function gerarCombinacoesJogadas() {

  let tabuleiro = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  let board = [];

  let vez = 1;

  for (let a = 0; a < 9; a++) {
    tabuleiro[a] = vez = vez === 1 ? -1 : 1;
    // console.log(tabuleiro)
    for (let b = 1; b < 9; b++) {
      tabuleiro[b] = vez = vez === 1 ? -1 : 1;
      // console.log(tabuleiro)
      for (let c = 2; c < 9; c++) {
        tabuleiro[c] = vez = vez === 1 ? -1 : 1;
        // console.log(tabuleiro)
        for (let d = 3; d < 9; d++) {
          tabuleiro[d] = vez = vez === 1 ? -1 : 1;
          // console.log(tabuleiro)
          for (let e = 4; e < 9; e++) {
            tabuleiro[e] = vez = vez === 1 ? -1 : 1;
            // console.log(tabuleiro)
            for (let f = 5; f < 9; f++) {
              tabuleiro[f] = vez = vez === 1 ? -1 : 1;
              // console.log(tabuleiro)
              for (let g = 6; g < 9; g++) {
                tabuleiro[g] = vez = vez === 1 ? -1 : 1;
                // console.log(tabuleiro)
                for (let h = 7; h < 9; h++) {
                  tabuleiro[h] = vez = vez === 1 ? -1 : 1;
                  // console.log(tabuleiro)
                  for (let i = 8; i < 9; i++) {
                    tabuleiro[i] = vez = vez === 1 ? -1 : 1;
                    // console.log(tabuleiro)

                    board.push(tabuleiro)

                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // return tabuleiro;
  return board

}
//  gerarCombinacoesJogadas()
*/



function verificarVencedor(tabuleiro) {
  const combinacoesVitoria = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
    [0, 4, 8], [2, 4, 6]             // Diagonais
  ];

  for (let combinacao of combinacoesVitoria) {
    const [a, b, c] = combinacao;
    if (tabuleiro[a] !== 0 && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) {
      return tabuleiro[a]; // Retorna o jogador que venceu
    }
  }

  return tabuleiro.includes(0) ? null : 0; // Retorna 0 para empate ou null se o jogo não terminou
}



function gerarCombinacoesJogadas2() {
  const board = [];
  const boardRetorno = [];
  const tabuleiro = Array(9).fill(0);

  const imprimirTabuleiro = (tabuleiro) => {

    /*
    const simbolo = (valor) => (valor === 1 ? 'X' : valor === -1 ? 'O' : '-');
    console.log(
      `${simbolo(tabuleiro[0])} | ${simbolo(tabuleiro[1])} | ${simbolo(tabuleiro[2])}\n` +
      `${simbolo(tabuleiro[3])} | ${simbolo(tabuleiro[4])} | ${simbolo(tabuleiro[5])}\n` +
      `${simbolo(tabuleiro[6])} | ${simbolo(tabuleiro[7])} | ${simbolo(tabuleiro[8])}\n`
    );
    */

    const simbolo = (valor) => (valor === 1 ? 1 : valor === -1 ? -1 : 0);

    boardRetorno.push(
      [
        simbolo(tabuleiro[0]), simbolo(tabuleiro[1]), simbolo(tabuleiro[2]),
        simbolo(tabuleiro[3]), simbolo(tabuleiro[4]), simbolo(tabuleiro[5]),
        simbolo(tabuleiro[6]), simbolo(tabuleiro[7]), simbolo(tabuleiro[8])
      ]
    );

  };

  const gerarCombinacoes = (indice, jogador, jogada) => {
    if (indice === 9 || verificarVencedor(tabuleiro) !== null) {
      // Se o jogo terminou (vitória ou empate), salva o estado atual
      board.push([...tabuleiro]);
      return;
    }

    for (let i = 0; i < 9; i++) {
      if (tabuleiro[i] === 0) {  // Se a posição está vazia
        tabuleiro[i] = jogador;  // Marca o movimento do jogador
        // console.log(`Jogada ${jogada}: Jogador ${jogador > 0 ? 'X' : 'O'} na posição ${i + 1}`);
        imprimirTabuleiro(tabuleiro);  // Imprime o tabuleiro atual
        gerarCombinacoes(i + 1, -jogador, jogada + 1);  // Próximo jogador
        tabuleiro[i] = 0;  // Desfaz o movimento para tentar outras combinações
      }
    }
  };
  gerarCombinacoes(0, 1, 1);  // Começa com o jogador X na jogada 1
  return boardRetorno;

}

console.log(gerarCombinacoesJogadas2());


