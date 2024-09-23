// Função para gerar o próximo estado do tabuleiro
function gerarProximosEstados(tabuleiro, jogador) {
  const proximosEstados = [];
  for (let i = 0; i < tabuleiro.length; i++) {
    if (tabuleiro[i] === '') {
      // Copia o tabuleiro e faz uma jogada
      const novoEstado = [...tabuleiro];
      novoEstado[i] = jogador;
      proximosEstados.push(novoEstado);
    }
  }
  return proximosEstados;
}

// Função para imprimir o tabuleiro em formato legível
function imprimirTabuleiro(tabuleiro) {
  console.log(
    `${tabuleiro[0] || '-'} | ${tabuleiro[1] || '-'} | ${tabuleiro[2] || '-'}`
  );
  console.log('---------');
  console.log(
    `${tabuleiro[3] || '-'} | ${tabuleiro[4] || '-'} | ${tabuleiro[5] || '-'}`
  );
  console.log('---------');
  console.log(
    `${tabuleiro[6] || '-'} | ${tabuleiro[7] || '-'} | ${tabuleiro[8] || '-'}`
  );
  console.log('---------');
}

// Função DFS para percorrer todos os estados possíveis do jogo da velha
function buscaEmProfundidade(tabuleiro, jogador, profundidade = 0) {
  // Imprime o estado atual do tabuleiro e a profundidade
  console.log(`Profundidade: ${profundidade}`);
  imprimirTabuleiro(tabuleiro);

  // Verifica os próximos estados possíveis para o jogador atual
  const proximosEstados = gerarProximosEstados(tabuleiro, jogador);

  // Alterna o jogador para o próximo turno ('X' -> 'O' ou 'O' -> 'X')
  const proximoJogador = jogador === 'X' ? 'O' : 'X';

  // Realiza a chamada recursiva para cada próximo estado
  for (const estado of proximosEstados) {
    buscaEmProfundidade(estado, proximoJogador, profundidade + 1);
  }
}

// Tabuleiro inicial vazio
const tabuleiroInicial = ['', '', '', '', '', '', '', '', ''];

// Inicia a busca em profundidade a partir do tabuleiro inicial com o jogador 'X'
buscaEmProfundidade(tabuleiroInicial, 'X');
