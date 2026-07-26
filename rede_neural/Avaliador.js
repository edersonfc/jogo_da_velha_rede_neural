// Path of this file => rede_neural\Avaliador.js
//
// A REGUA. Sem ela, "ficou mais inteligente" e opiniao.
//
// O problema do treino antigo nao era so o algoritmo: era nao ter NENHUMA
// medicao. O treino imprimia "Episodio 9000, Epsilon: 0.010" e terminava
// dizendo "Treinamento concluido!" -- sem uma unica informacao sobre se a rede
// tinha ficado boa ou ruim. Voce so descobria jogando, e perdendo em coisa boba.
//
// Aqui existem tres medidas, da mais severa para a mais folgada:
//
//   1. ACERTO OTIMO (a principal). Passa por TODAS as 4.520 posicoes possiveis
//      do jogo da velha e pergunta: a jogada escolhida esta entre as jogadas
//      perfeitas? E exaustivo e deterministico -- nao tem sorte no meio.
//      Junto vem a contagem dos DOIS ERROS BOBOS:
//        - "deixou de ganhar": tinha 3 em linha na mao e nao fechou;
//        - "nao bloqueou"    : o oponente ia ganhar na proxima e ela ignorou.
//
//   2. CONTRA O JOGO PERFEITO. Jogo da velha e empate quando os dois jogam
//      certo. Entao o alvo aqui e 100% de EMPATES e ZERO derrotas. Testa dos
//      dois lados: comecando e nao comecando.
//
//   3. CONTRA O ALEATORIO. O teste facil, que a rede antiga ja passava mais ou
//      menos. Alvo: vencer quase sempre e NUNCA perder.

const J = require('./JogoDaVelha.js');
const Minimax = require('./Minimax.js');

class Avaliador {
  constructor(minimax = null) {
    this.mm = minimax || new Minimax();
    this._posicoes = null;
  }

  /** As 4.520 posicoes nao-terminais, com as jogadas otimas de cada uma. */
  posicoes() {
    if (!this._posicoes) this._posicoes = this.mm.gerarConjuntoSupervisionado();
    return this._posicoes;
  }

  /**
   * MEDIDA 1 -- exaustiva. `politica(tabuleiro, jogador)` devolve um indice.
   * As posicoes do conjunto sao canonicas, entao avaliamos sempre como X.
   */
  acertoOtimo(politica) {
    const amostras = this.posicoes();
    let acertos = 0, deixouDeGanhar = 0, naoBloqueou = 0, invalidas = 0;

    for (const am of amostras) {
      // Reconstroi o tabuleiro a partir da chave canonica ("M" = quem joga).
      const tabuleiro = am.chave.split('').map(c => (c === 'M' ? J.X : c === 'O' ? J.O : J.VAZIO));
      const jogada = politica(tabuleiro, J.X);

      if (tabuleiro[jogada] !== J.VAZIO || jogada < 0 || jogada > 8) { invalidas++; continue; }
      if (am.otimas.includes(jogada)) { acertos++; continue; }

      // Errou. Foi um dos dois erros bobos?
      const minhasVitorias = J.jogadasQueVencem(tabuleiro, J.X);
      if (minhasVitorias.length > 0) { deixouDeGanhar++; continue; }

      const ameacas = J.jogadasQueVencem(tabuleiro, J.O);
      if (ameacas.length > 0 && !ameacas.includes(jogada)) { naoBloqueou++; }
    }

    const total = amostras.length;
    return {
      total,
      acertos,
      percentual: (acertos / total) * 100,
      deixouDeGanhar,
      naoBloqueou,
      invalidas,
      outrosErros: total - acertos - deixouDeGanhar - naoBloqueou - invalidas
    };
  }

  /** Uma partida entre duas politicas. Devolve o resultado (1, -1 ou 0). */
  partida(politicaX, politicaO) {
    let tabuleiro = J.novoTabuleiro();
    let jogador = J.X;

    while (!J.terminou(tabuleiro)) {
      const politica = jogador === J.X ? politicaX : politicaO;
      let jogada = politica(tabuleiro, jogador);

      // Rede de seguranca: jogada invalida conta como derrota do lado que errou.
      if (jogada === undefined || jogada === null || tabuleiro[jogada] !== J.VAZIO) {
        return -jogador;
      }
      tabuleiro = J.aplicarJogada(tabuleiro, jogada, jogador);
      jogador = -jogador;
    }
    return J.resultado(tabuleiro);
  }

  /**
   * MEDIDA 2 e 3 -- `politica` joga `partidas` vezes comecando e `partidas`
   * vezes sem comecar, contra `oponente`.
   */
  duelo(politica, oponente, partidas = 50) {
    const r = { vitorias: 0, empates: 0, derrotas: 0, comecando: null, semComecar: null };

    const rodar = (souX) => {
      const c = { vitorias: 0, empates: 0, derrotas: 0 };
      for (let i = 0; i < partidas; i++) {
        const res = souX ? this.partida(politica, oponente) : this.partida(oponente, politica);
        const meuLado = souX ? J.X : J.O;
        if (res === meuLado) c.vitorias++;
        else if (res === 0) c.empates++;
        else c.derrotas++;
      }
      return c;
    };

    r.comecando = rodar(true);
    r.semComecar = rodar(false);
    r.vitorias = r.comecando.vitorias + r.semComecar.vitorias;
    r.empates = r.comecando.empates + r.semComecar.empates;
    r.derrotas = r.comecando.derrotas + r.semComecar.derrotas;
    return r;
  }

  /** Politica: joga perfeito. */
  politicaPerfeita() {
    return (tabuleiro, jogador) => this.mm.melhorJogada(tabuleiro, jogador);
  }

  /** Politica: joga qualquer casa livre. */
  politicaAleatoria() {
    return (tabuleiro) => {
      const livres = J.jogadasValidas(tabuleiro);
      return livres[Math.floor(Math.random() * livres.length)];
    };
  }

  /** Relatorio completo, formatado para o terminal. */
  relatorio(politica, nome = 'a rede', partidas = 50) {
    const ac = this.acertoOtimo(politica);
    const vsPerfeito = this.duelo(politica, this.politicaPerfeita(), partidas);
    const vsAleatorio = this.duelo(politica, this.politicaAleatoria(), partidas);

    const linhas = [];
    linhas.push('');
    linhas.push(`  AVALIACAO DE ${nome.toUpperCase()}`);
    linhas.push('  ' + '-'.repeat(72));
    linhas.push(`  1) ACERTO OTIMO nas ${ac.total} posicoes possiveis do jogo:`);
    linhas.push(`       jogadas perfeitas ....... ${ac.acertos} de ${ac.total}  (${ac.percentual.toFixed(2)}%)`);
    linhas.push(`       ERRO BOBO "deixou de ganhar" ... ${ac.deixouDeGanhar}`);
    linhas.push(`       ERRO BOBO "nao bloqueou" ....... ${ac.naoBloqueou}`);
    linhas.push(`       outros erros (jogada nao-otima) ${ac.outrosErros}`);
    if (ac.invalidas) linhas.push(`       JOGADAS INVALIDAS .............. ${ac.invalidas}  <-- bug!`);
    linhas.push('');
    linhas.push(`  2) CONTRA O JOGO PERFEITO (${partidas} partidas de cada lado) -- o alvo e SO empate:`);
    linhas.push(`       comecando ....: ${this._fmt(vsPerfeito.comecando)}`);
    linhas.push(`       sem comecar ..: ${this._fmt(vsPerfeito.semComecar)}`);
    linhas.push(`       TOTAL ........: ${this._fmt(vsPerfeito)}`);
    linhas.push('');
    linhas.push(`  3) CONTRA O ALEATORIO (${partidas} partidas de cada lado) -- o alvo e vencer e nunca perder:`);
    linhas.push(`       comecando ....: ${this._fmt(vsAleatorio.comecando)}`);
    linhas.push(`       sem comecar ..: ${this._fmt(vsAleatorio.semComecar)}`);
    linhas.push(`       TOTAL ........: ${this._fmt(vsAleatorio)}`);
    linhas.push('  ' + '-'.repeat(72));

    const perfeita = ac.percentual === 100 && vsPerfeito.derrotas === 0;
    if (perfeita) {
      linhas.push('  VEREDITO: joga PERFEITO. Nao existe jogada melhor em nenhuma posicao.');
    } else if (vsPerfeito.derrotas === 0 && ac.deixouDeGanhar === 0 && ac.naoBloqueou === 0) {
      linhas.push('  VEREDITO: FORTE. Nao perde e nao comete erro bobo (mas nao e otima em tudo).');
    } else {
      linhas.push(`  VEREDITO: com falhas -- ${vsPerfeito.derrotas} derrota(s) para o jogo perfeito, ` +
                  `${ac.deixouDeGanhar + ac.naoBloqueou} erro(s) bobo(s).`);
    }
    linhas.push('');

    return { texto: linhas.join('\n'), acertoOtimo: ac, vsPerfeito, vsAleatorio, perfeita };
  }

  _fmt(c) {
    return `${String(c.vitorias).padStart(3)} vitorias | ${String(c.empates).padStart(3)} empates | ${String(c.derrotas).padStart(3)} derrotas`;
  }
}

module.exports = Avaliador;
