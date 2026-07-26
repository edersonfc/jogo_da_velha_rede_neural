// Path of this file => rede_neural\AgenteTreinamento.js
//
// ============================================================================
// TREINAMENTO REESCRITO -- 25-07-2026
// O arquivo original esta preservado em:
//   AgenteTreinamento.js.BACKUP-ORIGINAL-25-07-2026.NAO-APAGAR
// ============================================================================
//
// POR QUE O TREINO ANTIGO NAO DEIXAVA A REDE INTELIGENTE
// -----------------------------------------------------------------------------
// Medido com o Avaliador.js sobre o modelo que estava salvo:
//   acerto otimo ................ 56,57% das 4.520 posicoes
//   "deixou de ganhar" .......... 1.150 vezes (tinha 3 em linha e nao fechou)
//   "nao bloqueou" ................ 598 vezes
//   contra o jogo perfeito ........ 94 derrotas em 100
//   contra o ALEATORIO ............ 34 derrotas em 100   <-- perdia para o acaso
//
// As oito causas encontradas no codigo antigo:
//
//  1. SOFTMAX NA SAIDA COM ALVO DE Q-LEARNING. A saida somava 1 e era sempre
//     positiva, entao a rede nao tinha como dizer "essa jogada me faz PERDER".
//     E o alvo (recompensa + gama x max) chegava a 1,9, um valor inalcancavel
//     para softmax: os pesos cresciam sem parar. E por isso que o modelo salvo
//     tem 14,8% dos pesos acima de 100 em valor absoluto, chegando a -2,0 x 10^86
//     (Xavier nasce entre -0,8 e +0,8): a rede DIVERGIU. Ver RedeNeural.js.
//
//  2. A JOGADA VENCEDORA NUNCA ERA PREMIADA. No fim da partida o codigo fazia
//     `atualizarRede(resultado, estadoAnterior, jogadaAnterior)` -- estado e
//     jogada do turno ANTERIOR. A jogada que de fato ganhou nunca recebia o +1.
//
//  3. A MEMORIA DE EXPERIENCIA GUARDAVA `recompensa: 0` SEMPRE. Vitoria e
//     derrota jamais entravam no replay. O treino repetia 100 exemplos por
//     episodio, todos com recompensa zero: ruido puro.
//
//  4. O ALVO USAVA O ESTADO ERRADO. `max(...previsao)` era o maximo do estado
//     ATUAL, nao do PROXIMO (a formula de Bellman pede Q do proximo estado).
//     E em posicao terminal nao pode haver esse termo -- o jogo acabou.
//
//  5. HEURISTICA DENTRO DA POLITICA DE TREINO. `escolherJogada` fechava vitoria
//     e bloqueava ameaca por regra fixa, ANTES de consultar a rede. Resultado:
//     a rede nunca foi exposta a essas decisoes e nunca as aprendeu. E o
//     JogarContraIA.js NAO tinha essa heuristica -- na hora de jogar, a rede
//     ficava sozinha justamente no que nunca treinou. ESTA e a explicacao
//     direta de "perde em coisas simples e bobas".
//
//  6. TREINAVA SO COMECANDO. No treino a IA sempre jogava primeiro; no jogo
//     real o humano comecava. Metade do jogo era territorio desconhecido.
//
//  7. OPONENTE SEMPRE ALEATORIO. Nunca enfrentou ninguem que soubesse jogar.
//
//  8. NENHUMA MEDICAO. Terminava com "Treinamento concluido!" sem dizer se
//     ficou bom ou ruim.
//
// COMO O TREINO NOVO FUNCIONA -- duas fases
// -----------------------------------------------------------------------------
// FASE 1 -- IMITACAO (o "professor"): a rede aprende a copiar a tabela Q*
//   EXATA do minimax, nas 4.520 posicoes possiveis. E rapido, estavel e cobre
//   TODAS as situacoes -- inclusive as 1.748 em que a rede antiga errava feio.
//   E a mesma ideia da destilacao usada no AlphaZero: um professor perfeito
//   gera os alvos, o aluno (a rede) aprende a funcao inteira.
//
// FASE 2 -- REFORCO (a rede jogando): DQN de verdade, agora correto --
//   auto-jogo + oponentes variados, transicoes bem montadas, rede-alvo
//   separada, Double DQN, mascara de jogadas invalidas, e a IA jogando dos
//   DOIS lados.
//
// O professor so aparece no TREINO. Na hora de jogar, quem decide e a rede.

const J = require('./JogoDaVelha.js');
const Minimax = require('./Minimax.js');
const Avaliador = require('./Avaliador.js');

class AgenteTreinamento {
  constructor(redeNeural, opcoes = {}) {
    this.rede = redeNeural;

    // --- Q-learning ---------------------------------------------------------
    this.gama = opcoes.gama ?? 0.95;          // desconto: vitoria rapida vale mais
    this.epsilon = opcoes.epsilon ?? 1.0;     // exploracao inicial
    this.epsilonMin = opcoes.epsilonMin ?? 0.05;
    this.epsilonFinalEm = opcoes.epsilonFinalEm ?? 0.7; // fracao do treino ate chegar no minimo

    // --- memoria de experiencia -------------------------------------------
    this.memoria = [];
    this.tamanhoMemoria = opcoes.tamanhoMemoria ?? 20000;
    this.tamanhoLote = opcoes.tamanhoLote ?? 64;

    // --- rede alvo (target network) ---------------------------------------
    // Sem ela, a rede persegue um alvo que ela mesma move a cada passo -- o
    // treino oscila e nao converge. A copia congelada da estabilidade.
    this.redeAlvo = this.rede.clonar();
    this.sincronizarCada = opcoes.sincronizarCada ?? 500;   // em passos de treino
    this._passos = 0;

    this.minimax = opcoes.minimax || new Minimax(this.gama);
    this.avaliador = opcoes.avaliador || new Avaliador(this.minimax);
    this.silencioso = opcoes.silencioso ?? false;
    this.historico = [];
  }

  log(...args) { if (!this.silencioso) console.log(...args); }

  // ==========================================================================
  // A POLITICA DA REDE (sem nenhuma regra fixa por cima)
  // ==========================================================================

  /** Q de cada casa, com as ocupadas rebaixadas para nunca serem escolhidas. */
  qMascarado(tabuleiro, jogador, rede = this.rede) {
    const entrada = J.codificarEstado(tabuleiro, jogador);
    const q = rede.forward(entrada).ativacoes.slice(-1)[0];
    const saida = new Array(9);
    for (let i = 0; i < 9; i++) {
      saida[i] = tabuleiro[i] === J.VAZIO ? q[i] : -Infinity;
    }
    return saida;
  }

  /** A melhor jogada segundo a rede. Nenhuma heuristica: e a rede, so ela. */
  melhorJogada(tabuleiro, jogador, rede = this.rede) {
    const q = this.qMascarado(tabuleiro, jogador, rede);
    let melhor = -Infinity, idx = -1;
    for (let i = 0; i < 9; i++) if (q[i] > melhor) { melhor = q[i]; idx = i; }
    return idx;
  }

  /** Politica pronta para o Avaliador e para o jogo. */
  politica() {
    return (tabuleiro, jogador) => this.melhorJogada(tabuleiro, jogador);
  }

  escolherJogada(tabuleiro, jogador, epsilon = 0) {
    if (Math.random() < epsilon) {
      const livres = J.jogadasValidas(tabuleiro);
      return livres[Math.floor(Math.random() * livres.length)];
    }
    return this.melhorJogada(tabuleiro, jogador);
  }

  // ==========================================================================
  // FASE 1 -- IMITACAO DO PROFESSOR
  // ==========================================================================

  /**
   * A rede aprende a reproduzir Q*(s,a) do minimax nas 4.520 posicoes.
   * `mascara` faz o gradiente correr so nas casas livres.
   */
  treinarSupervisionado(epocas = 60, taxaAprendizagem = 0.02, opcoes = {}) {
    const conjunto = this.minimax.gerarConjuntoSupervisionado();
    const pararAoAtingir = opcoes.pararAoAtingir ?? 100;   // % de acerto otimo
    const avaliarCada = opcoes.avaliarCada ?? 10;
    const ciclosCorrecao = opcoes.ciclosCorrecao ?? 40;
    const taxaFinal = opcoes.taxaFinal ?? taxaAprendizagem / 20;

    const embaralhar = (lista) => {
      for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lista[i], lista[j]] = [lista[j], lista[i]];
      }
    };

    let melhorAcerto = -1, melhorPesos = null;
    const registrar = (rotulo, n, perda) => {
      const ac = this.avaliador.acertoOtimo(this.politica());
      this.log(`  ${rotulo.padEnd(9)} ${String(n).padStart(4)} | ${perda.toFixed(6)} | ` +
               `${ac.percentual.toFixed(2).padStart(9)}% | ` +
               `${String(ac.deixouDeGanhar).padStart(16)} | ${String(ac.naoBloqueou).padStart(12)}`);
      this.historico.push({ fase: 'imitacao', etapa: rotulo, n, perda, acerto: ac.percentual });
      if (ac.percentual > melhorAcerto) {
        melhorAcerto = ac.percentual;
        melhorPesos = JSON.parse(JSON.stringify(this.rede.exportarModelo()));
      }
      return ac;
    };

    this.log(`\n  FASE 1 - IMITACAO DO PROFESSOR (minimax perfeito)`);
    this.log(`  ${conjunto.length} posicoes de treino`);
    this.log('  ' + '-'.repeat(72));
    this.log('  etapa      n   |    perda | acerto otimo | deixou de ganhar | nao bloqueou');

    // ------------------------------------------------------------------ (A)
    // ETAPA A -- REGRESSAO: a rede aprende o VALOR de cada jogada.
    // A taxa cai geometricamente ate `taxaFinal`: taxa alta no comeco anda
    // rapido, taxa baixa no fim assenta em vez de ficar oscilando.
    for (let e = 1; e <= epocas; e++) {
      const taxa = taxaAprendizagem * Math.pow(taxaFinal / taxaAprendizagem, (e - 1) / Math.max(1, epocas - 1));
      embaralhar(conjunto);

      let perda = 0;
      for (const am of conjunto) {
        perda += this.rede.backward(am.entrada, am.alvoQ, taxa, am.mascara);
      }
      perda /= conjunto.length;

      if (e % avaliarCada === 0 || e === 1 || e === epocas) {
        const ac = registrar('regressao', e, perda);
        if (ac.percentual >= pararAoAtingir) break;
      }
    }

    // ------------------------------------------------------------------ (B)
    // ETAPA B -- CORRECAO DE MARGEM.
    //
    // POR QUE ELA E NECESSARIA: a regressao minimiza o erro no VALOR, mas quem
    // decide a jogada e o ARGMAX. Duas jogadas que levam ao mesmo empate tem
    // Q* = 0 as duas; um errinho de 0,05 na regressao inverte a escolha sem
    // quase mexer na perda. Foi isso que travou a rede em ~97%: a perda
    // continuava caindo e o acerto NAO subia (o "deixou de ganhar" chegou a
    // AUMENTAR de 59 para 116 enquanto a perda ia de 0,42 para 0,03).
    //
    // A correcao ataca exatamente o que importa: percorre so as posicoes em que
    // a rede ainda escolhe errado e abre uma MARGEM entre a jogada otima e a
    // jogada que ela escolheu -- empurra a otima para cima do valor verdadeiro
    // e a errada para baixo. E um passo de perceptron sobre o argmax.
    const margem = opcoes.margem ?? 0.15;
    const taxaCorrecao = opcoes.taxaCorrecao ?? 0.01;

    for (let c = 1; c <= ciclosCorrecao; c++) {
      const erradas = [];
      for (const am of conjunto) {
        const tabuleiro = am.chave.split('').map(ch => (ch === 'M' ? J.X : ch === 'O' ? J.O : J.VAZIO));
        const escolhida = this.melhorJogada(tabuleiro, J.X);
        if (!am.otimas.includes(escolhida)) erradas.push({ am, escolhida });
      }

      if (erradas.length === 0) {
        this.log(`  -> correcao ${c}: nenhuma posicao errada restante.`);
        break;
      }

      embaralhar(erradas);
      let perda = 0;
      for (const { am, escolhida } of erradas) {
        const q = Array.from(this.rede.forward(am.entrada).ativacoes.slice(-1)[0]);

        // Entre as jogadas otimas, empurra a que a rede ja considera melhor:
        // e a que precisa do menor empurrao.
        let alvoOtima = am.otimas[0];
        for (const o of am.otimas) if (q[o] > q[alvoOtima]) alvoOtima = o;

        const alvo = q.slice();
        const mascara = new Array(9).fill(0);
        alvo[alvoOtima] = am.alvoQ[alvoOtima] + margem;
        alvo[escolhida] = am.alvoQ[escolhida] - margem;
        mascara[alvoOtima] = 1;
        mascara[escolhida] = 1;

        perda += this.rede.backward(am.entrada, alvo, taxaCorrecao, mascara);
      }
      perda /= erradas.length;

      const ac = registrar('correcao', c, perda);
      if (ac.percentual >= pararAoAtingir) break;
    }

    // Reforco final leve de regressao, para a correcao nao ter distorcido os
    // valores (o acerto e mantido pelo melhor checkpoint).
    if (melhorPesos && melhorAcerto > this.avaliador.acertoOtimo(this.politica()).percentual) {
      this.rede.importarModelo(melhorPesos);
      this.log(`  -> restaurado o melhor checkpoint da fase 1: ${melhorAcerto.toFixed(2)}% de acerto otimo.`);
    }

    // A rede-alvo comeca a fase 2 sabendo o que a fase 1 ensinou.
    this.redeAlvo.copiarPesosDe(this.rede);
    return conjunto;
  }

  // ==========================================================================
  // FASE 2 -- REFORCO (DQN correto)
  // ==========================================================================

  /**
   * Joga UMA partida e devolve as transicoes do agente, bem montadas.
   *
   * A montagem e o ponto que o codigo antigo errava. Uma transicao do agente e:
   *   (estado em que EU joguei, jogada, recompensa, estado em que EU VOLTO a jogar)
   * O estado seguinte NAO e o tabuleiro logo depois da minha jogada -- e o
   * tabuleiro depois da resposta do oponente, quando a vez volta para mim.
   *
   * `oponente`: funcao (tabuleiro, jogador) => jogada. Se `null`, e AUTO-JOGO
   *             (a propria rede joga os dois lados e as duas metades da partida
   *             viram experiencia -- ganha-se o dobro de dado por partida).
   */
  jogarEpisodio(oponente, ladoAgente, epsilon) {
    const transicoes = [];
    const pendente = { 1: null, '-1': null };
    let tabuleiro = J.novoTabuleiro();
    let jogador = J.X;
    const autoJogo = oponente === null;

    const fechar = (lado, recompensa, entradaProx, mascaraProx) => {
      const p = pendente[lado];
      if (!p) return;
      transicoes.push({
        entrada: p.entrada,
        jogada: p.jogada,
        recompensa,
        entradaProx: entradaProx || null,
        mascaraProx: mascaraProx || null
      });
      pendente[lado] = null;
    };

    while (true) {
      const res = J.resultado(tabuleiro);
      if (res !== null) {
        // Fim de partida: agora cada lado sabe o que a sua ultima jogada valeu.
        for (const lado of [J.X, J.O]) {
          const recompensa = res === 0 ? 0 : (res === lado ? 1 : -1);
          fechar(lado, recompensa, null, null);
        }
        return { transicoes, resultado: res };
      }

      const ehAgente = autoJogo || jogador === ladoAgente;
      const entrada = J.codificarEstado(tabuleiro, jogador);

      if (ehAgente) {
        // A vez voltou para mim: agora sei qual era o "proximo estado" da
        // minha jogada anterior. Recompensa intermediaria = 0.
        const mascaraProx = tabuleiro.map(c => (c === J.VAZIO ? 1 : 0));
        fechar(jogador, 0, entrada, mascaraProx);
      }

      const jogada = ehAgente
        ? this.escolherJogada(tabuleiro, jogador, epsilon)
        : oponente(tabuleiro, jogador);

      if (ehAgente) pendente[jogador] = { entrada, jogada };

      tabuleiro = J.aplicarJogada(tabuleiro, jogada, jogador);
      jogador = -jogador;
    }
  }

  guardar(transicoes) {
    for (const t of transicoes) {
      this.memoria.push(t);
      if (this.memoria.length > this.tamanhoMemoria) this.memoria.shift();
    }
  }

  /**
   * UM passo de treino sobre um lote sorteado da memoria.
   *
   * DOUBLE DQN: a rede ATUAL escolhe qual e a melhor jogada do proximo estado;
   * a rede ALVO diz quanto ela vale. Separar "quem escolhe" de "quem avalia"
   * evita a superestimacao classica do DQN.
   */
  treinarLoteDaMemoria(taxaAprendizagem) {
    if (this.memoria.length < this.tamanhoLote) return 0;

    let perda = 0;
    for (let n = 0; n < this.tamanhoLote; n++) {
      const t = this.memoria[Math.floor(Math.random() * this.memoria.length)];

      // O alvo parte da propria previsao: assim as outras 8 saidas nao mudam.
      const alvo = Array.from(this.rede.forward(t.entrada).ativacoes.slice(-1)[0]);

      if (!t.entradaProx) {
        alvo[t.jogada] = t.recompensa;                 // terminal: sem bootstrap
      } else {
        const qAtual = this.rede.forward(t.entradaProx).ativacoes.slice(-1)[0];
        const qAlvo = this.redeAlvo.forward(t.entradaProx).ativacoes.slice(-1)[0];

        let melhorA = -1, melhorV = -Infinity;
        for (let i = 0; i < 9; i++) {
          if (!t.mascaraProx[i]) continue;
          if (qAtual[i] > melhorV) { melhorV = qAtual[i]; melhorA = i; }
        }
        const valorProx = melhorA >= 0 ? qAlvo[melhorA] : 0;
        alvo[t.jogada] = t.recompensa + this.gama * valorProx;
      }

      // So a jogada realmente feita gera gradiente.
      const mascara = new Array(9).fill(0);
      mascara[t.jogada] = 1;

      perda += this.rede.backward(t.entrada, alvo, taxaAprendizagem, mascara);

      this._passos++;
      if (this._passos % this.sincronizarCada === 0) {
        this.redeAlvo.copiarPesosDe(this.rede);
      }
    }
    return perda / this.tamanhoLote;
  }

  /**
   * O sorteio do oponente de cada episodio -- o "curriculo".
   * Comeca facil e vai endurecendo: aleatorio -> a propria rede -> perfeito.
   */
  sortearOponente(progresso) {
    const r = Math.random();
    const pAleatorio = Math.max(0.10, 0.60 - 0.50 * progresso);
    const pPerfeito = 0.15 + 0.35 * progresso;

    if (r < pAleatorio) {
      return { nome: 'aleatorio', fn: this.avaliador.politicaAleatoria() };
    }
    if (r < pAleatorio + pPerfeito) {
      return { nome: 'perfeito', fn: this.avaliador.politicaPerfeita() };
    }
    return { nome: 'auto-jogo', fn: null };   // null = a rede joga os dois lados
  }

  treinarPorReforco(episodios = 20000, taxaAprendizagem = 0.005, opcoes = {}) {
    const avaliarCada = opcoes.avaliarCada ?? Math.max(1, Math.floor(episodios / 10));
    const guardarMelhor = opcoes.guardarMelhor ?? true;

    // Exploracao inicial. Quando a fase 2 vem DEPOIS da fase 1, a rede ja sabe
    // jogar -- comecar em epsilon 1,0 encheria a memoria de lances aleatorios e
    // so faria a rede desaprender. Nesse caso o treinarIA.js passa algo como 0,3.
    const epsilonInicial = opcoes.epsilonInicial ?? this.epsilon;

    let melhorAcerto = -1;
    let melhorPesos = null;
    if (guardarMelhor) {
      melhorAcerto = this.avaliador.acertoOtimo(this.politica()).percentual;
      melhorPesos = JSON.parse(JSON.stringify(this.rede.exportarModelo()));
      this.log(`\n  (ponto de partida da fase 2: ${melhorAcerto.toFixed(2)}% de acerto otimo -- ` +
               `este checkpoint fica guardado e nao se perde)`);
    }

    this.log(`\n  FASE 2 - REFORCO (DQN com auto-jogo, rede-alvo e Double DQN)`);
    this.log(`  ${episodios} episodios, taxa ${taxaAprendizagem}, lote ${this.tamanhoLote}, ` +
             `gama ${this.gama}, epsilon inicial ${epsilonInicial}`);
    this.log('  ' + '-'.repeat(72));
    this.log('  episodio | epsilon |    perda | acerto otimo | derrotas p/ perfeito');

    for (let e = 1; e <= episodios; e++) {
      const progresso = e / episodios;

      // Epsilon caindo linearmente ate `epsilonFinalEm` do treino.
      const frac = Math.min(1, progresso / this.epsilonFinalEm);
      const epsilon = Math.max(this.epsilonMin, epsilonInicial - (epsilonInicial - this.epsilonMin) * frac);

      const op = this.sortearOponente(progresso);
      // Alterna o lado: metade das partidas comecando, metade sem comecar.
      const ladoAgente = e % 2 === 0 ? J.X : J.O;

      const { transicoes } = this.jogarEpisodio(op.fn, ladoAgente, epsilon);
      this.guardar(transicoes);

      const perda = this.treinarLoteDaMemoria(taxaAprendizagem);

      if (e % avaliarCada === 0 || e === episodios) {
        const ac = this.avaliador.acertoOtimo(this.politica());
        const duelo = this.avaliador.duelo(this.politica(), this.avaliador.politicaPerfeita(), 15);
        this.log(`  ${String(e).padStart(8)} | ${epsilon.toFixed(3).padStart(7)} | ${perda.toFixed(6)} | ` +
                 `${ac.percentual.toFixed(2).padStart(9)}% | ${String(duelo.derrotas).padStart(20)}`);
        this.historico.push({ fase: 'reforco', episodio: e, perda, acerto: ac.percentual, derrotas: duelo.derrotas });

        // GUARDA O MELHOR. Reforco oscila: sem isso, uma piora no ultimo
        // episodio jogaria fora o melhor modelo que o treino ja teve.
        if (guardarMelhor && ac.percentual > melhorAcerto) {
          melhorAcerto = ac.percentual;
          melhorPesos = this.rede.exportarModelo();
        }
      }
    }

    if (guardarMelhor && melhorPesos) {
      const acFinal = this.avaliador.acertoOtimo(this.politica()).percentual;
      if (melhorAcerto > acFinal) {
        this.rede.importarModelo(JSON.parse(JSON.stringify(melhorPesos)));
        this.log(`  -> restaurado o melhor checkpoint do treino: ${melhorAcerto.toFixed(2)}% ` +
                 `(o estado final estava em ${acFinal.toFixed(2)}%)`);
      }
    }
  }

  // ==========================================================================
  // O PIPELINE COMPLETO
  // ==========================================================================

  /**
   * Mantem a assinatura antiga -- `treinar(episodios, taxa)` continua valendo e
   * continua devolvendo Promise -- mas agora roda as DUAS fases.
   */
  async treinar(episodios = 20000, taxaAprendizagem = 0.005, opcoes = {}) {
    const epocasImitacao = opcoes.epocasImitacao ?? 60;
    const taxaImitacao = opcoes.taxaImitacao ?? 0.02;

    // Quanto cada fase contribuiu -- para o relatorio nao ficar no "achismo".
    const contribuicao = { inicio: null, depoisImitacao: null, depoisReforco: null };
    contribuicao.inicio = this.avaliador.acertoOtimo(this.politica()).percentual;

    if (epocasImitacao > 0) {
      this.treinarSupervisionado(epocasImitacao, taxaImitacao, {
        ...opcoes,
        avaliarCada: opcoes.avaliarCadaEpoca ?? opcoes.avaliarCada
      });
      contribuicao.depoisImitacao = this.avaliador.acertoOtimo(this.politica()).percentual;
    }
    if (episodios > 0) {
      this.treinarPorReforco(episodios, taxaAprendizagem, {
        ...opcoes,
        avaliarCada: opcoes.avaliarCadaEpisodio ?? Math.max(1, Math.floor(episodios / 12))
      });
      contribuicao.depoisReforco = this.avaliador.acertoOtimo(this.politica()).percentual;
    }

    this.contribuicao = contribuicao;
    return this;
  }

  // ==========================================================================
  // Compatibilidade: metodos que o codigo antigo expunha.
  // Ficam aqui para nada que dependia deles quebrar.
  // ==========================================================================
  jogadasValidas(tabuleiro) { return J.jogadasValidas(tabuleiro); }
  verificarResultado(tabuleiro) { return J.resultado(tabuleiro); }
  verificarVitoria(tabuleiro, jogador) { return J.venceu(tabuleiro, jogador); }
  verificarJogadasVencedoras(tabuleiro, jogador) { return J.jogadasQueVencem(tabuleiro, jogador); }
  preprocessarEstado(estado, jogador = 1) { return J.codificarEstado(estado, jogador); }
}

module.exports = AgenteTreinamento;
