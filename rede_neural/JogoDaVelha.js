// Path of this file => rede_neural\JogoDaVelha.js
//
// AS REGRAS DO JOGO, EM UM LUGAR SO.
//
// Antes, as 8 combinacoes vencedoras estavam copiadas em 4 arquivos diferentes.
// Quando uma copia divergia, o treino aprendia uma regra e o jogo usava outra.
// Agora existe UMA fonte da verdade.
//
// Convencao usada em TODO o projeto:
//   tabuleiro : array de 9 numeros  ->  0 = vazio, 1 = jogador X, -1 = jogador O
//   jogador   : 1 (X) ou -1 (O)
//
// A rede neural NUNCA ve "X" ou "O". Ela ve sempre "as MINHAS pecas" e "as
// pecas DELE" (ver codificarEstado). E por isso que a MESMA rede sabe jogar
// como X e como O -- e por isso que o treino antigo falhava: ele so treinava
// a IA comecando primeiro, e no jogo real o humano comecava.

const LINHAS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // linhas
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // colunas
  [0, 4, 8], [2, 4, 6]               // diagonais
];

const VAZIO = 0;
const X = 1;
const O = -1;

/** Cria um tabuleiro vazio. */
function novoTabuleiro() {
  return new Array(9).fill(VAZIO);
}

/** As casas livres. */
function jogadasValidas(tabuleiro) {
  const livres = [];
  for (let i = 0; i < 9; i++) if (tabuleiro[i] === VAZIO) livres.push(i);
  return livres;
}

/** Devolve um NOVO tabuleiro com a jogada aplicada (nao modifica o original). */
function aplicarJogada(tabuleiro, jogada, jogador) {
  const novo = tabuleiro.slice();
  novo[jogada] = jogador;
  return novo;
}

/** Este jogador tem 3 em linha? */
function venceu(tabuleiro, jogador) {
  for (const [a, b, c] of LINHAS) {
    if (tabuleiro[a] === jogador && tabuleiro[b] === jogador && tabuleiro[c] === jogador) {
      return true;
    }
  }
  return false;
}

/**
 * O resultado da partida:
 *   1  -> X venceu
 *  -1  -> O venceu
 *   0  -> empate (tabuleiro cheio)
 *  null-> a partida continua
 */
function resultado(tabuleiro) {
  if (venceu(tabuleiro, X)) return X;
  if (venceu(tabuleiro, O)) return O;
  return tabuleiro.includes(VAZIO) ? null : 0;
}

/** A partida acabou? */
function terminou(tabuleiro) {
  return resultado(tabuleiro) !== null;
}

/**
 * CODIFICACAO CANONICA -- 18 entradas, sempre do ponto de vista de quem joga.
 *
 *   entrada[0..8]  = 1 onde estao as MINHAS pecas
 *   entrada[9..17] = 1 onde estao as pecas DELE
 *   (casa vazia = 0 nos dois blocos)
 *
 * POR QUE ISSO E MELHOR QUE O ANTIGO (1 / 0 / 0.5 em 9 entradas):
 *   1. "peca do oponente" valia 0, igual a "meio de casa vazia" na escala --
 *      a rede tinha que separar dois conceitos diferentes de valores vizinhos;
 *   2. o antigo era fixo em "1 = IA", entao a rede so servia para UM lado.
 *      Aqui a mesma rede joga como X e como O, e o treino cobre os dois casos.
 */
function codificarEstado(tabuleiro, jogador) {
  const entrada = new Array(18).fill(0);
  for (let i = 0; i < 9; i++) {
    if (tabuleiro[i] === jogador) entrada[i] = 1;
    else if (tabuleiro[i] !== VAZIO) entrada[9 + i] = 1;
  }
  return entrada;
}

/**
 * Chave de texto de um estado, tambem canonica (ponto de vista de quem joga).
 * Usada como identificador na BASE DE CONHECIMENTO do aprendizado online.
 *   exemplo: "M....O..." -> M = minha peca, O = dele, . = vazio
 */
function chaveEstado(tabuleiro, jogador) {
  let s = '';
  for (let i = 0; i < 9; i++) {
    if (tabuleiro[i] === jogador) s += 'M';
    else if (tabuleiro[i] === VAZIO) s += '.';
    else s += 'O';
  }
  return s;
}

/** Jogadas que fazem ESTE jogador ganhar agora (vitoria imediata). */
function jogadasQueVencem(tabuleiro, jogador) {
  const jogadas = [];
  for (const i of jogadasValidas(tabuleiro)) {
    if (venceu(aplicarJogada(tabuleiro, i, jogador), jogador)) jogadas.push(i);
  }
  return jogadas;
}

/** Desenha o tabuleiro em texto (para depurar no terminal). */
function desenhar(tabuleiro) {
  const s = tabuleiro.map((c, i) => (c === X ? 'X' : c === O ? 'O' : String(i)));
  return ` ${s[0]} | ${s[1]} | ${s[2]}\n---+---+---\n ${s[3]} | ${s[4]} | ${s[5]}\n---+---+---\n ${s[6]} | ${s[7]} | ${s[8]}`;
}

module.exports = {
  LINHAS, VAZIO, X, O,
  novoTabuleiro, jogadasValidas, aplicarJogada,
  venceu, resultado, terminou,
  codificarEstado, chaveEstado, jogadasQueVencem, desenhar
};
