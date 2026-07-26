class AgenteTreinamento {
  constructor(redeNeural) {
    this.rede = redeNeural;
    this.gamma = 0.9;          // Fator de desconto para Q-learning
    this.epsilon = 1.0;        // Taxa de exploração inicial
    this.epsilonDecay = 0.995; // Decaimento da taxa de exploração
    this.epsilonMin = 0.01;    // Taxa mínima de exploração
    this.memoria = [];         // Memória para experiência replay
    this.tamanhoMemoria = 10000; // Tamanho máximo da memória
  }

  async treinar(episodios = 100000, taxaAprendizagem = 0.001) {
    for (let e = 0; e < episodios; e++) {
      let tabuleiro = Array(9).fill(0);
      let estadoAnterior = null;
      let jogadaAnterior = null;

      while (true) {
        // IA faz sua jogada
        const jogada = this.escolherJogada(tabuleiro);
        const novoEstado = [...tabuleiro];
        novoEstado[jogada] = 1;

        // Verifica resultado do jogo
        const resultado = this.verificarResultado(novoEstado);
        if (resultado !== null) {
          this.atualizarRede(resultado, estadoAnterior, jogadaAnterior, taxaAprendizagem);
          break;
        }

        // Jogada do oponente (aleatório)
        const jogadasDisponiveis = this.jogadasValidas(novoEstado);
        const jogadaOponente = jogadasDisponiveis[Math.floor(Math.random() * jogadasDisponiveis.length)];
        novoEstado[jogadaOponente] = -1;

        // Atualiza a rede com a nova experiência
        this.atualizarRede(0, novoEstado, jogada, taxaAprendizagem);

        // Armazena a experiência na memória
        this.memoria.push({ estado: estadoAnterior, jogada, recompensa: 0, proximoEstado: novoEstado });
        if (this.memoria.length > this.tamanhoMemoria) {
          this.memoria.shift();
        }

        // Atualiza estado anterior para próxima iteração
        estadoAnterior = [...novoEstado];
        jogadaAnterior = jogada;
        tabuleiro = novoEstado;
      }

      // Decaimento da taxa de exploração
      if (this.epsilon > this.epsilonMin) {
        this.epsilon *= this.epsilonDecay;
      }

      // Log de progresso
      if (e % 1000 === 0) {
        console.log(`Episódio ${e}, Epsilon: ${this.epsilon.toFixed(3)}`);
      }

      // Treina a rede com experiências da memória
      if (this.memoria.length > 100) {
        const batch = this.amostrarMemoria(100);
        for (const experiencia of batch) {
          this.atualizarRede(experiencia.recompensa, experiencia.estado, experiencia.jogada, taxaAprendizagem);
        }
      }
    }
  }

  amostrarMemoria(tamanho) {
    const indices = Array.from({ length: this.memoria.length }, (_, i) => i);
    const selecionados = [];
    for (let i = 0; i < tamanho; i++) {
      const indice = indices[Math.floor(Math.random() * indices.length)];
      selecionados.push(this.memoria[indice]);
    }
    return selecionados;
  }

  // ... (restante do código)
  atualizarRede(recompensa, estado, jogada, taxaAprendizagem) {
    if (!estado || jogada === null) return;

    // Preprocessa o estado para a rede neural
    const estadoProcessado = this.preprocessarEstado(estado);

    // Obtém a previsão atual da rede
    const previsao = this.rede.forward(estadoProcessado).ativacoes.slice(-1)[0];

    // Calcula o Q-value alvo
    const qTarget = [...previsao];
    qTarget[jogada] = recompensa + this.gamma * Math.max(...previsao);

    // Executa backpropagation
    this.rede.backward(estadoProcessado, qTarget, taxaAprendizagem);
  }

  escolherJogada(tabuleiro) {
    // Verifica jogadas vencedoras imediatas
    const jogadasVencedoras = this.verificarJogadasVencedoras(tabuleiro, 1);
    if (jogadasVencedoras.length > 0) return jogadasVencedoras[0];

    // Bloqueia jogadas perigosas do oponente
    const jogadasPerigosas = this.verificarJogadasVencedoras(tabuleiro, -1);
    if (jogadasPerigosas.length > 0) return jogadasPerigosas[0];

    // Exploração vs Explotação
    if (Math.random() < this.epsilon) {
      const jogadasDisponiveis = this.jogadasValidas(tabuleiro);
      return jogadasDisponiveis[Math.floor(Math.random() * jogadasDisponiveis.length)];
    }

    // Usa a rede neural para decisão
    const estadoProcessado = this.preprocessarEstado(tabuleiro);
    const previsao = this.rede.forward(estadoProcessado).ativacoes.slice(-1)[0];
    return this.melhorJogada(previsao, tabuleiro);
  }

  preprocessarEstado(estado) {
    return estado.map(c => {
      if (c === 1) return 1;    // Jogadas da IA
      if (c === -1) return 0;   // Jogadas do oponente (normalizado para 0)
      return 0.5;               // Campos vazios (valor intermediário)
    });
  }

  melhorJogada(qValues, tabuleiro) {
    let melhorValor = -Infinity;
    let melhorJogada = -1;

    for (let i = 0; i < 9; i++) {
      if (tabuleiro[i] !== 0) continue;
      if (qValues[i] > melhorValor) {
        melhorValor = qValues[i];
        melhorJogada = i;
      }
    }
    return melhorJogada;
  }

  jogadasValidas(tabuleiro) {
    return tabuleiro
      .map((valor, index) => (valor === 0 ? index : null))
      .filter(index => index !== null);
  }

  verificarJogadasVencedoras(tabuleiro, jogador) {
    const jogadas = [];
    for (let i = 0; i < 9; i++) {
      if (tabuleiro[i] !== 0) continue;
      const copia = [...tabuleiro];
      copia[i] = jogador;
      if (this.verificarVitoria(copia, jogador)) {
        jogadas.push(i);
      }
    }
    return jogadas;
  }

  verificarResultado(tabuleiro) {
    const combinacoesVencedoras = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
      [0, 4, 8], [2, 4, 6]             // Diagonais
    ];

    // Verifica vitória da IA (1)
    for (const [a, b, c] of combinacoesVencedoras) {
      if (tabuleiro[a] === 1 && tabuleiro[b] === 1 && tabuleiro[c] === 1) {
        return 1;
      }
    }

    // Verifica vitória do oponente (-1)
    for (const [a, b, c] of combinacoesVencedoras) {
      if (tabuleiro[a] === -1 && tabuleiro[b] === -1 && tabuleiro[c] === -1) {
        return -1;
      }
    }

    // Verifica empate
    return tabuleiro.includes(0) ? null : 0;
  }

  verificarVitoria(tabuleiro, jogador) {
    const combinacoesVencedoras = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    return combinacoesVencedoras.some(([a, b, c]) =>
      tabuleiro[a] === jogador && tabuleiro[b] === jogador && tabuleiro[c] === jogador
    );
  }
}

module.exports = AgenteTreinamento;

