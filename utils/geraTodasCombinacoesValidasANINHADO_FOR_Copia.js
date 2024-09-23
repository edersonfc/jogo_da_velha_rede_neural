
// function imprimirTabuleiro(tabuleiro) {
//   // Exibe o tabuleiro de forma organizada (formato 3x3)
//   const email = "\x1b[33m"; // Amarelo
//   const reset = "\x1b[0m"; // Reseta a cor
//   const corO = "\x1b[32m"; // Cor verde para "O"
//   const corX = "\x1b[31m"; // Cor vermelha para "X"

//   const simbolos = tabuleiro.map((celula, index) => {
//     if (celula === 1) return `${corO}O${reset}`; // "O" em verde
//     if (celula === -1) return `${corX}X${reset}`; // "X" em vermelho
//     if (celula === 0) return " "; // "X" em vermelho
//     //   return index.toString();
//   });

//   console.log(
//     `
//        ${simbolos[0]} | ${simbolos[1]} | ${simbolos[2]}
//       ---+---+---
//        ${simbolos[3]} | ${simbolos[4]} | ${simbolos[5]}
//       ---+---+---
//        ${simbolos[6]} | ${simbolos[7]} | ${simbolos[8]}
//     `);
// }


function gerarCombinacoesJogadas(numeroDeJogos) {
  // Função para verificar se alguém venceu
  function verificarVencedor(tabuleiro) {
    const combinacoesVencedoras = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
      [0, 4, 8], [2, 4, 6]             // Diagonais
    ];

    for (let combinacao of combinacoesVencedoras) {
      const [a, b, c] = combinacao;
      if (tabuleiro[a] !== 0 && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) {
        return tabuleiro[a]; // Retorna o jogador vencedor (1 ou -1)
      }
    }

    return null; // Se ninguém venceu ainda
  }

  // Função para embaralhar as posições
  function embaralharPosicoes() {
    let posicoes = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = posicoes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [posicoes[i], posicoes[j]] = [posicoes[j], posicoes[i]];
    }
    return posicoes;
  }

  let resultados = []; // Armazena os resultados de todos os jogos

  // Loop para gerar múltiplos jogos
  for (let jogo = 1; jogo <= numeroDeJogos; jogo++) {
    let tabuleiro = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let vez = 1;
    let posicoes = embaralharPosicoes(); // Embaralha a ordem das jogadas

    console.log(`\nIniciando Jogo ${jogo}`);

    // Executar jogada por jogada para este jogo
    for (let i = 0; i < 9; i++) {
      let posicao = posicoes[i]; // Pega a próxima posição embaralhada
      tabuleiro[posicao] = vez; // Preenche a posição embaralhada com o jogador da vez
      vez = vez === 1 ? -1 : 1; // Alterna a vez do jogador

      // console.log(`Jogada ${i + 1}:`, tabuleiro);

      // Verifica se alguém venceu após essa jogada
      let vencedor = verificarVencedor(tabuleiro);
      if (vencedor) {
        // console.log(`Jogador ${vencedor} venceu no jogo ${jogo}!`);
        resultados.push({ jogo: jogo, resultado: `Jogador ${vencedor} venceu`, tabuleiro: [...tabuleiro] });
        break; // Para o loop se houver um vencedor
      }

      // Se chegar ao fim das jogadas (empate)
      if (i === 8) {
        console.log(`Empate no jogo ${jogo}!`);
        resultados.push({ jogo: jogo, resultado: "Empate", tabuleiro: [...tabuleiro] });
      }
    }
  }
  return resultados; // Retorna os resultados de todos os jogos

}

// Chamar a função para gerar múltiplos jogos
// gerarCombinacoesJogadas(255168); 
// Chamar a função para gerar múltiplos jogos
const resultadosDosJogos = gerarCombinacoesJogadas(5); // Exemplo com 5 jogos
console.log("\nResultados finais:");
console.log(resultadosDosJogos);
