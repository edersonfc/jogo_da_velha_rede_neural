// Path of this file => rede_neural\Minimax.js
//
// O PROFESSOR PERFEITO.
//
// Minimax completo com memoizacao: para qualquer posicao, ele sabe o valor
// EXATO de cada jogada. Jogo da velha e pequeno o suficiente para isso ser
// instantaneo (5.478 posicoes legais no total).
//
// PARA QUE ELE SERVE AQUI -- e o que ele NAO faz:
//
//   [SIM] gerar os alvos do TREINO SUPERVISIONADO (a rede aprende a copiar
//         a tabela Q* exata -- e o remedio direto para "perde em coisa boba");
//   [SIM] ser o OPONENTE FORTE nos episodios de treino por reforco;
//   [SIM] ser o JUIZ na avaliacao ("a rede empata contra o jogo perfeito?").
//
//   [NAO] jogar no lugar da rede quando voce joga contra ela. Na hora de
//         jogar, quem decide e SEMPRE a rede neural. Se o minimax jogasse,
//         a "inteligencia" nao seria da rede -- seria dele, e nao haveria
//         nada aprendido. Este arquivo nao e importado pelo JogarContraIA.js.
//
// A CONTA DO VALOR DE UMA JOGADA (Q*), do ponto de vista de quem joga:
//
//   Q*(s, a) = +1                       se a jogada 'a' ganha na hora
//            =  0                       se a jogada 'a' enche o tabuleiro (empate)
//            = -gama x V*(s')           caso contrario
//
//   V*(s') = a melhor jogada que o OPONENTE tem em s'
//
// O sinal de MENOS e o coracao do minimax: o que e bom para ele e ruim para
// mim, na mesma medida. E o 'gama' (0,95) faz vitoria RAPIDA valer mais que
// vitoria demorada -- e derrota demorada valer mais que derrota rapida.

const J = require('./JogoDaVelha.js');

class Minimax {
  constructor(gama = 0.95) {
    this.gama = gama;
    this.memoriaV = new Map();   // chave do estado -> V*(s)
    this.memoriaQ = new Map();   // chave do estado -> [q0..q8] (null nas invalidas)
  }

  /** V*(s): o valor da posicao para quem tem a vez. */
  valor(tabuleiro, jogador) {
    const chave = J.chaveEstado(tabuleiro, jogador);
    if (this.memoriaV.has(chave)) return this.memoriaV.get(chave);

    const res = J.resultado(tabuleiro);
    let v;
    if (res !== null) {
      // Posicao terminal: quem tem a vez nao joga mais.
      v = res === 0 ? 0 : (res === jogador ? 1 : -1);
    } else {
      v = -Infinity;
      for (const a of J.jogadasValidas(tabuleiro)) {
        const q = this.qDaJogada(tabuleiro, jogador, a);
        if (q > v) v = q;
      }
    }

    this.memoriaV.set(chave, v);
    return v;
  }

  /** Q*(s, a): o valor de UMA jogada, para quem tem a vez. */
  qDaJogada(tabuleiro, jogador, jogada) {
    const depois = J.aplicarJogada(tabuleiro, jogada, jogador);

    if (J.venceu(depois, jogador)) return 1;              // ganhou agora
    if (!depois.includes(J.VAZIO)) return 0;              // encheu: empate

    // Agora e a vez do outro. O que e bom para ele e ruim para mim.
    return -this.gama * this.valor(depois, -jogador);
  }

  /**
   * A tabela completa de uma posicao: [q0..q8], com `null` nas casas ocupadas.
   * E exatamente o que a rede neural vai aprender a imitar.
   */
  tabelaQ(tabuleiro, jogador) {
    const chave = J.chaveEstado(tabuleiro, jogador);
    if (this.memoriaQ.has(chave)) return this.memoriaQ.get(chave);

    const q = new Array(9).fill(null);
    for (const a of J.jogadasValidas(tabuleiro)) {
      q[a] = this.qDaJogada(tabuleiro, jogador, a);
    }

    this.memoriaQ.set(chave, q);
    return q;
  }

  /** Todas as jogadas otimas (pode haver empate entre varias). */
  jogadasOtimas(tabuleiro, jogador) {
    const q = this.tabelaQ(tabuleiro, jogador);
    let melhor = -Infinity;
    for (let i = 0; i < 9; i++) if (q[i] !== null && q[i] > melhor) melhor = q[i];

    const otimas = [];
    for (let i = 0; i < 9; i++) {
      if (q[i] !== null && Math.abs(q[i] - melhor) < 1e-9) otimas.push(i);
    }
    return otimas;
  }

  /** Uma jogada perfeita (sorteada entre as empatadas, para variar as partidas). */
  melhorJogada(tabuleiro, jogador) {
    const otimas = this.jogadasOtimas(tabuleiro, jogador);
    return otimas[Math.floor(Math.random() * otimas.length)];
  }

  /**
   * ENUMERA TODAS AS POSICOES NAO-TERMINAIS ALCANCAVEIS, ja no formato de
   * treino: { entrada (18 numeros), alvoQ (9 numeros), mascara (9 numeros) }.
   *
   * A mascara vale 1 nas casas livres e 0 nas ocupadas: o gradiente so corre
   * nas saidas que significam algo. Sem ela, a rede gastaria capacidade
   * aprendendo notas de jogadas que nem sao possiveis.
   *
   * Como a codificacao e canonica ("minhas pecas" x "pecas dele"), uma posicao
   * e a mesma posicao com as cores trocadas caem na MESMA chave -- entao o
   * conjunto ja sai sem duplicata e com a simetria de cor garantida.
   */
  gerarConjuntoSupervisionado() {
    const vistos = new Set();
    const amostras = [];
    const preencherAte = -1.2;  // nota das casas ocupadas (fora da mascara, so por higiene)

    const visitar = (tabuleiro, jogador) => {
      if (J.terminou(tabuleiro)) return;

      const chave = J.chaveEstado(tabuleiro, jogador);
      if (!vistos.has(chave)) {
        vistos.add(chave);

        const q = this.tabelaQ(tabuleiro, jogador);
        const alvoQ = new Array(9);
        const mascara = new Array(9);
        for (let i = 0; i < 9; i++) {
          const livre = q[i] !== null;
          alvoQ[i] = livre ? q[i] : preencherAte;
          mascara[i] = livre ? 1 : 0;
        }

        amostras.push({
          chave,
          entrada: J.codificarEstado(tabuleiro, jogador),
          alvoQ,
          mascara,
          otimas: this.jogadasOtimas(tabuleiro, jogador)
        });
      }

      for (const a of J.jogadasValidas(tabuleiro)) {
        visitar(J.aplicarJogada(tabuleiro, a, jogador), -jogador);
      }
    };

    visitar(J.novoTabuleiro(), J.X);
    return amostras;
  }
}

module.exports = Minimax;
