// Path of this file => rede_neural\AprendizadoOnline.js
//
// ============================================================================
// O RECURSO NOVO: A IA APRENDENDO ENQUANTO VOCE JOGA COM ELA
// ============================================================================
//
// Antes, o ciclo era: treinar -> salvar -> jogar. Jogar nao mudava nada; a rede
// era um arquivo morto que so respondia. Agora ela aprende de VOCE:
//
//   * APOS CADA JOGADA  -> um passo de aprendizado imediato (TD online);
//   * APOS CADA PARTIDA -> o aprendizado forte, com o resultado ja conhecido,
//                          mais a licao dos erros que ela cometeu;
//   * ENTRE SESSOES     -> tudo fica gravado em modelo/base_conhecimento.json.
//                          Voce fecha o jogo, volta amanha, e ela continua de
//                          onde parou -- mais forte a cada partida.
//
// IMPORTANTE, E DE PROPOSITO: este arquivo NAO importa o Minimax.js.
// Nao existe professor aqui. A IA aprende do resultado das partidas e das
// regras do jogo, como um jogador humano aprenderia. Se o minimax estivesse
// aqui, quem estaria jogando bem seria ele, e nao haveria nada aprendido.
//
// COMO ELA "APRENDE COM OS PROPRIOS ERROS"
// -----------------------------------------------------------------------------
// No fim da partida o codigo relê a partida inteira e procura DOIS erros que
// dao para identificar so com as regras (nao precisa de oraculo nenhum):
//
//   1. "DEIXOU DE GANHAR": ela tinha 3 em linha disponivel e jogou outra coisa.
//      Aqui o alvo verdadeiro e conhecido: aquela jogada valia +1. A licao e
//      gravada e treinada com peso alto.
//
//   2. "NAO BLOQUEOU": voce tinha 3 em linha na proxima jogada, ela nao tinha
//      vitoria imediata, e ela nao bloqueou. A jogada de bloqueio era a certa.
//
// Sao exatamente os dois erros que a rede antiga cometia 1.748 vezes.
//
// O ANTI-ESQUECIMENTO (o detalhe que faz a diferenca)
// -----------------------------------------------------------------------------
// Rede neural treinada so com as ultimas partidas ESQUECE o resto do jogo --
// e o "esquecimento catastrofico". Se ela aprender que numa posicao especifica
// o certo era bloquear, e treinar so isso 200 vezes, ela pode desaprender a
// jogar em todas as outras. Sem tratamento, "aprender jogando" viraria
// "desaprender jogando", e a cada partida ela ficaria PIOR.
//
// A solucao usada aqui e a mesma da area (rehearsal / ensaio):
//   * mantem uma MEMORIA das partidas anteriores e treina misturado, nao so
//     com a ultima;
//   * mistura tambem o CONJUNTO DE REFERENCIA gravado pelo treinamento
//     (modelo/conjunto_referencia.json), que representa o jogo inteiro.
// Assim cada partida ACRESCENTA sem apagar.

const fs = require('fs');
const path = require('path');
const J = require('./JogoDaVelha.js');
const RedeNeural = require('./RedeNeural.js');

const VERSAO_BASE = 2;

class AprendizadoOnline {
  constructor(opcoes = {}) {
    this.estrutura = opcoes.estrutura || [18, 128, 128, 9];
    this.pastaModelo = opcoes.pastaModelo || path.join(__dirname, '..', 'modelo');
    this.arquivoBase = path.join(this.pastaModelo, 'base_conhecimento.json');
    this.arquivoReferencia = path.join(this.pastaModelo, 'conjunto_referencia.json');

    // --- hiperparametros do aprendizado online ---------------------------
    //
    // AS TAXAS SAO PEQUENAS DE PROPOSITO -- e uma correcao medida.
    // Primeira versao deste arquivo usava taxaPorPartida 0,004 com 240 passos.
    // Resultado medido em 40 partidas partindo do modelo PERFEITO:
    //     acerto otimo 100,00%  ->  96,84%
    //     "deixou de ganhar"  0  ->  80
    //     derrotas para o jogo perfeito  0  ->  5
    // Ou seja: ela ficava PIOR a cada partida. Era o esquecimento catastrofico
    // acontecendo de verdade -- 240 passos de gradiente sobre as ~10 posicoes
    // de UMA partida arrastam a rede inteira para aquele cantinho do jogo.
    // Ver `travaDeSeguranca` mais abaixo, que e a solucao de fundo.
    // ------------------------------------------------------------------------
    // DOIS MODOS, porque as duas situacoes pedem coisas opostas.
    //
    //   APRENDIZ  -- a rede nao sabe nada (comecou do zero). Precisa aprender
    //                rapido, e nao ha conhecimento a proteger. Taxas ALTAS.
    //   VETERANO  -- a rede ja vem treinada. O risco aqui nao e "aprender
    //                pouco", e "estragar o que ja sabe". Taxas BAIXAS + trava.
    //
    // Medido com um unico conjunto de taxas: as baixas mantinham o modelo
    // perfeito em 100% mas do zero so saiam de 54% para 60% em 400 partidas;
    // as altas aprendiam do zero mas derrubavam o modelo perfeito para 96,8%.
    // Nao da para servir aos dois com o mesmo numero. Por isso, dois modos.
    // Qual vale e decidido em `definirModo()`, ao carregar.
    this.gama = opcoes.gama ?? 0.95;
    this.tamanhoMemoria = opcoes.tamanhoMemoria ?? 3000;
    this.sincronizarCada = opcoes.sincronizarCada ?? 200;
    this.opcoesUsuario = opcoes;

    this.taxasAprendiz = {
      taxaPorJogada: 0.002, taxaPorPartida: 0.008, taxaLicao: 0.02,
      passosPorPartida: 400, pesoReferencia: 0
    };
    this.taxasVeterano = {
      taxaPorJogada: 0.0002, taxaPorPartida: 0.0006, taxaLicao: 0.004,
      passosPorPartida: 120, pesoReferencia: 1.5   // o ENSAIO pesa MAIS que a partida nova
    };
    Object.assign(this, this.taxasVeterano);   // trocado em definirModo()
    this.modo = 'veterano';

    this.explorar = opcoes.explorar ?? 0;                 // 0 = sempre a melhor jogada

    // A TRAVA DE SEGURANCA (ver `treinarDaPartida`): depois de aprender, ela
    // confere se continua sabendo o que sabia. Se piorou, desfaz.
    // A referencia da trava e o MELHOR NIVEL JA ATINGIDO, nao o da partida
    // anterior. Com tolerancia de 0,05 ponto contra a partida anterior, cada
    // partida podia ceder um tiquinho e a perda ia se ACUMULANDO: medido,
    // 100,00% -> 99,58% em 60 partidas. Travando no melhor de todos os tempos,
    // o ponto de comparacao nao escorrega, e a garantia passa a ser:
    // A CADA PARTIDA ELA FICA MELHOR OU IGUAL. Nunca pior.
    //
    // A tolerancia e minuscula (0,02 ponto = ~1 posicao em 4.520) e NAO se
    // acumula: como o piso e sempre "melhor de todos menos 0,02", a rede nunca
    // fica abaixo desse valor, por muitas partidas que passem. Ela existe so
    // para nao reverter por ruido numerico -- sem ela, uma queda invisivel de
    // 0,003 ponto aparecia na tela como "100,00% -> 100,00%  REVERTIDO", o que
    // parecia defeito e nao era.
    this.travaDeSeguranca = opcoes.travaDeSeguranca ?? true;
    this.toleranciaPiora = opcoes.toleranciaPiora ?? 0.02;  // em pontos percentuais
    this.melhorConcordancia = null;                        // preenchido ao carregar/jogar

    this.rede = new RedeNeural(this.estrutura, { tipoSaida: 'linear' });
    this.memoria = [];
    this.licoes = [];
    this.estados = {};       // a BASE DE CONHECIMENTO: chave do estado -> o que ela sabe dali
    this.estatisticas = {
      partidas: 0, vitorias: 0, empates: 0, derrotas: 0,
      jogadasVistas: 0, passosAprendizado: 0,
      licoesAprendidas: 0, deixouDeGanhar: 0, naoBloqueou: 0,
      criadaEm: new Date().toISOString(), atualizadaEm: null
    };

    this.referencia = [];
    this._passos = 0;
    this.origem = 'nova';

    // Estado da partida em andamento
    this.partida = null;
  }

  // ==========================================================================
  // CARREGAR / SALVAR A BASE DE CONHECIMENTO
  // ==========================================================================

  /**
   * Ordem de preferencia:
   *   1. base_conhecimento.json  -> a base que ela mesma foi formando jogando;
   *   2. modelo treinado         -> o ponto de partida vindo do treinamento;
   *   3. nada                    -> comeca do zero (aprende so de voce).
   *
   * Passe `null` em `nomeModeloInicial` para PULAR o passo 2 e forcar o comeco
   * do zero. E o que o `--do-zero` do JogarContraIA.js faz: sem isso, apagar a
   * base nao bastava -- o codigo caia no modelo treinado do passo 2 e a IA
   * aparecia jogando perfeito numa sessao que se anunciava como "do zero".
   */
  carregar(nomeModeloInicial = 'modelo_jogo_da_velha_v2') {
    // (1) a base de conhecimento
    if (fs.existsSync(this.arquivoBase)) {
      try {
        const base = JSON.parse(fs.readFileSync(this.arquivoBase, 'utf-8'));
        if (base.versao === VERSAO_BASE && Array.isArray(base.pesos)) {
          this.rede.importarModelo({
            estrutura: base.estrutura, tipoSaida: base.tipoSaida || 'linear',
            pesos: base.pesos, biases: base.biases
          });
          this.estrutura = base.estrutura;
          this.memoria = base.memoria || [];
          this.licoes = base.licoes || [];
          this.estados = base.estados || {};
          this.estatisticas = { ...this.estatisticas, ...(base.estatisticas || {}) };
          // O melhor nivel ja atingido atravessa as sessoes junto com a base.
          this.melhorConcordancia = base.melhorConcordancia ?? null;
          this.aprendizadoPuro = base.aprendizadoPuro ?? false;
          this.origem = 'base';
          this._carregarReferencia();
          this.redeAlvo = this.rede.clonar();
          return { origem: 'base', mensagem: 'Base de conhecimento carregada.' };
        }
      } catch (erro) {
        console.log(`  (aviso: base de conhecimento ilegivel -- ${erro.message})`);
      }
    }

    // (2) o modelo do treinamento -- pulado quando `nomeModeloInicial` e null
    const caminhoModelo = nomeModeloInicial
      ? path.join(this.pastaModelo, `${nomeModeloInicial}.json`)
      : null;
    if (caminhoModelo && fs.existsSync(caminhoModelo)) {
      try {
        const dados = JSON.parse(fs.readFileSync(caminhoModelo, 'utf-8'));
        this.rede.importarModelo(dados);
        this.estrutura = dados.estrutura;
        this.origem = 'modelo';
        this._carregarReferencia();
        this.redeAlvo = this.rede.clonar();
        return { origem: 'modelo', mensagem: `Modelo do treinamento carregado (${nomeModeloInicial}).` };
      } catch (erro) {
        console.log(`  (aviso: modelo ilegivel -- ${erro.message})`);
      }
    }

    // (3) do zero
    this.origem = 'nova';
    this._carregarReferencia();
    this.redeAlvo = this.rede.clonar();
    return {
      origem: 'nova',
      mensagem: 'Nenhum modelo encontrado: a rede comeca do ZERO e vai aprender so das suas partidas.'
    };
  }

  /**
   * O "caderno de exercicios ja resolvido", gravado pelo treinamento.
   *
   * REGRA DELIBERADA: ele so e usado quando a rede JA SABE alguma coisa
   * (`origem` = base ou modelo). Se ela esta comecando do ZERO, o caderno fica
   * FECHADO -- senao ela aprenderia dele, e nao das suas partidas, e a demo de
   * "aprender jogando com alguem" seria uma fraude. Ensaio serve para PROTEGER
   * conhecimento existente, nao para ser a fonte dele.
   */
  _carregarReferencia() {
    // `aprendizadoPuro` acompanha a base para SEMPRE. Uma base nascida do zero
    // continua do zero na proxima sessao: se o caderno de referencia entrasse
    // depois, ela passaria a aprender DELE em vez das partidas, e a demo de
    // "aprendeu jogando comigo" deixaria de ser verdade.
    if (this.aprendizadoPuro === undefined) this.aprendizadoPuro = this.origem === 'nova';
    this.usarReferencia = !this.aprendizadoPuro;

    if (!this.usarReferencia || !fs.existsSync(this.arquivoReferencia)) {
      this.referencia = [];
    } else {
      try {
        this.referencia = JSON.parse(fs.readFileSync(this.arquivoReferencia, 'utf-8'));
      } catch {
        this.referencia = [];
      }
    }
    this.definirModo();
  }

  /**
   * Escolhe o modo pelo unico critério que importa: existe conhecimento a
   * proteger? Se existe ancora, ha o que perder -> VETERANO (cuidado).
   * Se nao existe, nao ha nada a perder -> APRENDIZ (velocidade).
   */
  definirModo() {
    const veterano = this.temAncora();
    this.modo = veterano ? 'veterano' : 'aprendiz';
    Object.assign(this, veterano ? this.taxasVeterano : this.taxasAprendiz);

    // O que o usuario passou explicitamente sempre vence o modo.
    for (const chave of ['taxaPorJogada', 'taxaPorPartida', 'taxaLicao',
                         'passosPorPartida', 'pesoReferencia']) {
      if (this.opcoesUsuario[chave] !== undefined) this[chave] = this.opcoesUsuario[chave];
    }
  }

  /**
   * Grava a base de conhecimento.
   *
   * ESCRITA ATOMICA (grava num .tmp e depois renomeia) por dois motivos:
   *  1. este arquivo e reescrito DEPOIS DE CADA PARTIDA. Se o processo morresse
   *     no meio de um `writeFileSync`, a base ficaria truncada e a IA perderia
   *     tudo o que aprendeu -- o rename e uma operacao unica no sistema de
   *     arquivos, entao ou a base nova entra inteira ou a antiga fica intacta;
   *  2. no Windows, antivirus e indexador travam o arquivo por instantes. Isto
   *     aconteceu de verdade durante os testes (erro UNKNOWN no `open`) e
   *     derrubava o jogo. Agora ha retentativa, e falhar em salvar nunca
   *     interrompe a partida.
   */
  salvar() {
    try {
      if (!fs.existsSync(this.pastaModelo)) fs.mkdirSync(this.pastaModelo, { recursive: true });

      this.estatisticas.atualizadaEm = new Date().toISOString();
      const modelo = this.rede.exportarModelo();
      const base = {
        versao: VERSAO_BASE,
        estrutura: modelo.estrutura,
        tipoSaida: modelo.tipoSaida,
        pesos: modelo.pesos,
        biases: modelo.biases,
        estatisticas: this.estatisticas,
        melhorConcordancia: this.melhorConcordancia,
        aprendizadoPuro: this.aprendizadoPuro,
        estados: this.estados,
        licoes: this.licoes.slice(-400),
        memoria: this.memoria.slice(-this.tamanhoMemoria)
      };
      const texto = JSON.stringify(base);
      const temporario = this.arquivoBase + '.tmp';

      let ultimoErro = null;
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        try {
          fs.writeFileSync(temporario, texto, 'utf-8');
          fs.renameSync(temporario, this.arquivoBase);
          this.ultimoSalvamento = { ok: true, tentativas: tentativa };
          return this.arquivoBase;
        } catch (erro) {
          ultimoErro = erro;
        }
      }
      this.ultimoSalvamento = { ok: false, erro: ultimoErro ? ultimoErro.message : 'desconhecido' };
      return null;
    } catch (erro) {
      this.ultimoSalvamento = { ok: false, erro: erro.message };
      return null;
    }
  }

  // ==========================================================================
  // A POLITICA (quem decide a jogada e a rede, e so ela)
  // ==========================================================================

  qMascarado(tabuleiro, jogador, rede = this.rede) {
    const entrada = J.codificarEstado(tabuleiro, jogador);
    const q = rede.forward(entrada).ativacoes.slice(-1)[0];
    const saida = new Array(9);
    for (let i = 0; i < 9; i++) saida[i] = tabuleiro[i] === J.VAZIO ? q[i] : -Infinity;
    return saida;
  }

  escolherJogada(tabuleiro, jogador) {
    if (this.explorar > 0 && Math.random() < this.explorar) {
      const livres = J.jogadasValidas(tabuleiro);
      return { jogada: livres[Math.floor(Math.random() * livres.length)], exploracao: true, q: null };
    }
    const q = this.qMascarado(tabuleiro, jogador);
    let melhor = -Infinity, idx = -1;
    for (let i = 0; i < 9; i++) if (q[i] > melhor) { melhor = q[i]; idx = i; }
    return { jogada: idx, exploracao: false, q, confianca: melhor };
  }

  politica() {
    return (tabuleiro, jogador) => this.escolherJogada(tabuleiro, jogador).jogada;
  }

  // ==========================================================================
  // O CICLO DA PARTIDA
  // ==========================================================================

  iniciarPartida(ladoIA) {
    // A FOTO E TIRADA AQUI, no comeco da partida -- nao no fim.
    //
    // POR QUE: existem DOIS momentos de aprendizado, o passo apos cada jogada e
    // o treino do fim da partida. Na primeira versao a trava so cobria o
    // segundo, e o primeiro escapava. Medido: a rede escorregava de 100,00% para
    // 99,47% em 60 partidas, porque a foto era tirada DEPOIS de os passos por
    // jogada ja terem mexido nos pesos -- a deriva entrava na propria referencia.
    //
    // Com a foto aqui, a partida inteira fica ATOMICA: ou ela sai da partida
    // igual ou melhor, ou a partida e desfeita por inteiro.
    const podeConferir = this.travaDeSeguranca && this.temAncora();

    this.partida = {
      ladoIA,
      transicoes: [],
      pendente: null,
      lances: [],       // historico completo, para reler no fim e achar os erros
      podeConferir,
      fotoInicial: podeConferir ? JSON.parse(JSON.stringify(this.rede.exportarModelo())) : null,
      concordanciaInicial: podeConferir ? this.concordanciaComAncora() : null
    };

    // Primeira partida da sessao: o nivel atual passa a ser o melhor conhecido.
    if (podeConferir && this.melhorConcordancia === null) {
      this.melhorConcordancia = this.partida.concordanciaInicial;
    }
  }

  /** Registra um lance -- de quem for. */
  registrarLance(tabuleiro, jogador, jogada) {
    if (!this.partida) return;
    this.partida.lances.push({ tabuleiro: tabuleiro.slice(), jogador, jogada });
  }

  /**
   * A JOGADA DA IA -- e o aprendizado imediato que vem com ela.
   *
   * Chame ANTES de aplicar a jogada no tabuleiro. Devolve { jogada, ... }.
   */
  jogarEAprender(tabuleiro) {
    const jogador = this.partida.ladoIA;
    const entrada = J.codificarEstado(tabuleiro, jogador);

    // A vez voltou para a IA: agora ela sabe em que estado a jogada ANTERIOR
    // dela desembocou. Fecha a transicao e aprende na hora -- e este o
    // "aprender apos cada jogada".
    if (this.partida.pendente) {
      const mascaraProx = tabuleiro.map(c => (c === J.VAZIO ? 1 : 0));
      const t = {
        entrada: this.partida.pendente.entrada,
        jogada: this.partida.pendente.jogada,
        recompensa: 0,
        entradaProx: entrada,
        mascaraProx
      };
      this.partida.transicoes.push(t);
      this.guardarNaMemoria(t);
      this.passoTD(t, this.taxaPorJogada);     // <-- aprendizado imediato
      this.partida.pendente = null;
    }

    // A base de conhecimento cresce: mais um estado conhecido, ou mais uma visita.
    const chave = J.chaveEstado(tabuleiro, jogador);
    if (!this.estados[chave]) {
      this.estados[chave] = { visitas: 0, vitorias: 0, empates: 0, derrotas: 0 };
    }
    this.estados[chave].visitas++;
    this.estatisticas.jogadasVistas++;

    const escolha = this.escolherJogada(tabuleiro, jogador);
    this.partida.pendente = { entrada, jogada: escolha.jogada, chave };
    this.registrarLance(tabuleiro, jogador, escolha.jogada);

    return {
      ...escolha,
      chave,
      estadoNovo: !this.estados[chave] || this.estados[chave].visitas === 1,
      visitas: this.estados[chave].visitas
    };
  }

  guardarNaMemoria(t) {
    this.memoria.push(t);
    if (this.memoria.length > this.tamanhoMemoria) this.memoria.shift();
  }

  /**
   * FIM DA PARTIDA -- o aprendizado forte.
   * `resultado`: 1 (X venceu), -1 (O venceu) ou 0 (empate).
   */
  finalizarPartida(resultado) {
    if (!this.partida) return null;
    const lado = this.partida.ladoIA;
    const recompensa = resultado === 0 ? 0 : (resultado === lado ? 1 : -1);

    // 1) Fecha a ultima jogada da IA com o resultado de verdade.
    if (this.partida.pendente) {
      const t = {
        entrada: this.partida.pendente.entrada,
        jogada: this.partida.pendente.jogada,
        recompensa,
        entradaProx: null,      // terminal: nao ha proximo estado
        mascaraProx: null
      };
      this.partida.transicoes.push(t);
      this.guardarNaMemoria(t);
      this.partida.pendente = null;
    }

    // 2) Estatisticas + base de conhecimento por estado.
    this.estatisticas.partidas++;
    if (recompensa > 0) this.estatisticas.vitorias++;
    else if (recompensa < 0) this.estatisticas.derrotas++;
    else this.estatisticas.empates++;

    for (const lance of this.partida.lances) {
      if (lance.jogador !== lado) continue;
      const chave = J.chaveEstado(lance.tabuleiro, lado);
      const reg = this.estados[chave];
      if (!reg) continue;
      if (recompensa > 0) reg.vitorias++;
      else if (recompensa < 0) reg.derrotas++;
      else reg.empates++;
    }

    // 3) AS LICOES: relê a partida e acha os erros pelas regras do jogo.
    const licoesNovas = this.detectarErros();

    // 4) Treina: partida recente (peso alto) + memoria + referencia (ensaio).
    const perda = this.treinarDaPartida(licoesNovas);

    const resumo = {
      recompensa,
      transicoes: this.partida.transicoes.length,
      licoesNovas,
      perda,
      aprendizado: this.ultimoAprendizado || null,
      estatisticas: { ...this.estatisticas },
      estadosConhecidos: Object.keys(this.estados).length
    };

    this.partida = null;
    this.salvar();
    return resumo;
  }

  /**
   * OS ERROS QUE ELA MESMA COMETEU, achados so com as regras do jogo.
   * Nenhum minimax, nenhum oraculo: sao dois fatos verificaveis no tabuleiro.
   */
  detectarErros() {
    const lado = this.partida.ladoIA;
    const encontradas = [];

    for (const lance of this.partida.lances) {
      if (lance.jogador !== lado) continue;
      const { tabuleiro, jogada } = lance;

      // ERRO 1 -- tinha vitoria na mao e nao fechou.
      const minhasVitorias = J.jogadasQueVencem(tabuleiro, lado);
      if (minhasVitorias.length > 0 && !minhasVitorias.includes(jogada)) {
        encontradas.push({
          tipo: 'deixou-de-ganhar',
          chave: J.chaveEstado(tabuleiro, lado),
          entrada: J.codificarEstado(tabuleiro, lado),
          jogadaCerta: minhasVitorias[0],
          jogadaErrada: jogada,
          valorCerto: 1        // fechar 3 em linha vale +1. Isso e regra, nao opiniao.
        });
        this.estatisticas.deixouDeGanhar++;
        continue;
      }

      // ERRO 2 -- o adversario ia ganhar na proxima e ela nao bloqueou
      //           (e ela nao tinha vitoria propria disponivel).
      const ameacas = J.jogadasQueVencem(tabuleiro, -lado);
      if (minhasVitorias.length === 0 && ameacas.length === 1 && !ameacas.includes(jogada)) {
        encontradas.push({
          tipo: 'nao-bloqueou',
          chave: J.chaveEstado(tabuleiro, lado),
          entrada: J.codificarEstado(tabuleiro, lado),
          jogadaCerta: ameacas[0],
          jogadaErrada: jogada,
          valorCerto: null     // nao sabemos o valor exato; sabemos que era MELHOR
        });
        this.estatisticas.naoBloqueou++;
      }
    }

    // Acumula na base, contando a reincidencia (erro repetido pesa mais).
    for (const nova of encontradas) {
      const ja = this.licoes.find(l => l.chave === nova.chave && l.tipo === nova.tipo);
      if (ja) { ja.vezes++; ja.jogadaCerta = nova.jogadaCerta; }
      else { this.licoes.push({ ...nova, vezes: 1 }); this.estatisticas.licoesAprendidas++; }
    }

    return encontradas;
  }

  /** Um passo de TD (o mesmo alvo de Bellman do treino, com rede-alvo). */
  passoTD(t, taxa) {
    const alvo = Array.from(this.rede.forward(t.entrada).ativacoes.slice(-1)[0]);

    if (!t.entradaProx) {
      alvo[t.jogada] = t.recompensa;                       // terminal
    } else {
      const qAtual = this.rede.forward(t.entradaProx).ativacoes.slice(-1)[0];
      const qAlvo = this.redeAlvo.forward(t.entradaProx).ativacoes.slice(-1)[0];
      let melhorA = -1, melhorV = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!t.mascaraProx[i]) continue;
        if (qAtual[i] > melhorV) { melhorV = qAtual[i]; melhorA = i; }
      }
      alvo[t.jogada] = t.recompensa + this.gama * (melhorA >= 0 ? qAlvo[melhorA] : 0);
    }

    const mascara = new Array(9).fill(0);
    mascara[t.jogada] = 1;
    const perda = this.rede.backward(t.entrada, alvo, taxa, mascara);

    this.estatisticas.passosAprendizado++;
    this._passos++;
    if (this._passos % this.sincronizarCada === 0) this.redeAlvo.copiarPesosDe(this.rede);
    return perda;
  }

  /** Um passo sobre uma LICAO -- o erro identificado, corrigido de frente. */
  passoLicao(licao) {
    const q = Array.from(this.rede.forward(licao.entrada).ativacoes.slice(-1)[0]);
    const alvo = q.slice();
    const mascara = new Array(9).fill(0);

    if (licao.valorCerto !== null) {
      // Sabemos o valor exato: fechar 3 em linha vale +1.
      alvo[licao.jogadaCerta] = licao.valorCerto;
    } else {
      // Nao sabemos o valor, mas sabemos a ORDEM: a certa tem de ficar acima
      // da que ela escolheu. Abre uma margem entre as duas.
      alvo[licao.jogadaCerta] = Math.max(q[licao.jogadaCerta], q[licao.jogadaErrada]) + 0.3;
    }
    alvo[licao.jogadaErrada] = q[licao.jogadaErrada] - 0.3;

    mascara[licao.jogadaCerta] = 1;
    mascara[licao.jogadaErrada] = 1;

    this.estatisticas.passosAprendizado++;
    return this.rede.backward(licao.entrada, alvo, this.taxaLicao, mascara);
  }

  /**
   * O TREINO DO FIM DA PARTIDA.
   *
   * Tres ingredientes no mesmo lote, e cada um tem um motivo:
   *   a) as transicoes DESTA partida, repetidas -- e o que ela acabou de viver;
   *   b) a memoria das partidas anteriores      -- para nao virar "so a ultima";
   *   c) o conjunto de referencia               -- o ensaio que evita esquecer
   *                                                o resto do jogo.
   */
  treinarDaPartida(licoesNovas = []) {
    // ------------------------------------------------------------------ TRAVA
    // A foto e a medida de "antes" vem do INICIO da partida (iniciarPartida),
    // para cobrir tambem os passos de aprendizado feitos durante o jogo.
    const podeConferir = this.partida ? this.partida.podeConferir : false;
    const antes = this.partida ? this.partida.concordanciaInicial : null;
    const foto = this.partida ? this.partida.fotoInicial : null;

    const desta = this.partida ? this.partida.transicoes : [];
    let perda = 0, n = 0;

    // (a) + (b) -- o que ela acabou de viver, misturado com o que ja viveu.
    for (let i = 0; i < this.passosPorPartida; i++) {
      const usarDesta = desta.length > 0 && Math.random() < 0.5;
      const fonte = usarDesta ? desta : this.memoria;
      if (fonte.length === 0) continue;
      const t = fonte[Math.floor(Math.random() * fonte.length)];
      perda += this.passoTD(t, this.taxaPorPartida);
      n++;
    }

    // (c) ENSAIO contra o esquecimento -- pesa mais que a partida nova.
    if (this.usarReferencia && this.referencia.length > 0) {
      const quantos = Math.floor(this.passosPorPartida * this.pesoReferencia);
      for (let i = 0; i < quantos; i++) {
        const r = this.referencia[Math.floor(Math.random() * this.referencia.length)];
        this.rede.backward(r.entrada, r.alvoQ, this.taxaPorPartida, r.mascara);
        this.estatisticas.passosAprendizado++;
      }
    }

    // (d) AS LICOES. Duas regras importantes:
    //   - so treina a licao que ela AINDA erra. Empurrar o que ela ja acerta
    //     nao ensina nada e ainda desregula o resto;
    //   - errar a mesma coisa de novo pesa mais (reincidencia = mais repeticoes).
    const candidatas = licoesNovas.length > 0 ? licoesNovas : this.licoes.slice(-12);
    let licoesTreinadas = 0;
    for (const licao of candidatas) {
      if (!this.aindaErra(licao)) continue;
      const registrada = this.licoes.find(l => l.chave === licao.chave && l.tipo === licao.tipo);
      const repeticoes = Math.min(24, 6 * (registrada ? registrada.vezes : 1));
      for (let i = 0; i < repeticoes; i++) this.passoLicao(licao);
      licoesTreinadas++;
    }

    this.redeAlvo.copiarPesosDe(this.rede);

    // ------------------------------------------------------------- CONFERENCIA
    let veredito = 'aplicado';
    let depois = null;
    if (podeConferir) {
      depois = this.concordanciaComAncora();
      const piso = this.melhorConcordancia - this.toleranciaPiora;

      if (depois < piso) {
        // Esta partida deixaria a IA pior do que ela ja foi: desfaz tudo.
        this.rede.importarModelo(foto);
        this.redeAlvo.copiarPesosDe(this.rede);
        veredito = 'revertido';
        // `depois` continua sendo o valor MEDIDO (nao o restaurado), para o
        // relatorio poder mostrar de quanto foi a queda que motivou o desfazer.
        // Antes eu sobrescrevia com `antes` e a tela dizia
        // "100,000% -> 100,000%  REVERTIDO", uma contradicao na cara do usuario.
      } else if (depois > this.melhorConcordancia + 0.001) {
        this.melhorConcordancia = depois;
        veredito = 'melhorou';
      } else {
        veredito = 'mantido';
      }
    }

    this.ultimoAprendizado = {
      veredito, antes, depois,
      melhorDeTodos: this.melhorConcordancia,
      passos: n, licoesTreinadas,
      perda: n ? perda / n : 0
    };
    return this.ultimoAprendizado.perda;
  }

  /** Ela ainda comete este erro? (se ja acerta, nao ha o que corrigir) */
  aindaErra(licao) {
    const q = this.rede.forward(licao.entrada).ativacoes.slice(-1)[0];
    // Reconstroi as casas livres a partir da chave do estado.
    let escolhida = -1, melhor = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (licao.chave[i] !== '.') continue;
      if (q[i] > melhor) { melhor = q[i]; escolhida = i; }
    }
    return escolhida !== licao.jogadaCerta;
  }

  /** Existe algo contra o que conferir se ela nao esta desaprendendo? */
  temAncora() {
    return this.usarReferencia && this.referencia.length > 0 &&
           this.referencia[0] && Array.isArray(this.referencia[0].otimas);
  }

  /**
   * O AUTOEXAME. Nas posicoes de referencia que ela carrega na propria base,
   * em quantas ela ainda escolhe uma jogada certa?
   *
   * Nao e consulta a oraculo nenhum durante o jogo: e um caderno de exercicios
   * ja resolvido, gravado no treinamento, que ela usa para se conferir.
   */
  concordanciaComAncora() {
    let acertos = 0;
    for (const r of this.referencia) {
      const q = this.rede.forward(r.entrada).ativacoes.slice(-1)[0];
      let escolhida = -1, melhor = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!r.mascara[i]) continue;
        if (q[i] > melhor) { melhor = q[i]; escolhida = i; }
      }
      if (r.otimas.includes(escolhida)) acertos++;
    }
    return (acertos / this.referencia.length) * 100;
  }

  // ==========================================================================
  // RELATORIO -- a base de conhecimento por dentro
  // ==========================================================================

  relatorio() {
    const e = this.estatisticas;
    const total = e.partidas || 1;
    const linhas = [];
    linhas.push('  BASE DE CONHECIMENTO DA IA');
    linhas.push(`  modo de aprendizado ......... ${this.modo.toUpperCase()}` +
      (this.modo === 'aprendiz' ? '  (nao sabia nada: aprende forte, so das partidas)'
                                : '  (ja treinada: aprende com cuidado + trava de seguranca)'));
    linhas.push('  ' + '-'.repeat(64));
    linhas.push(`  partidas jogadas ............ ${e.partidas}`);
    linhas.push(`     vitorias dela ............ ${e.vitorias}  (${(100 * e.vitorias / total).toFixed(0)}%)`);
    linhas.push(`     empates .................. ${e.empates}  (${(100 * e.empates / total).toFixed(0)}%)`);
    linhas.push(`     derrotas dela ............ ${e.derrotas}  (${(100 * e.derrotas / total).toFixed(0)}%)`);
    linhas.push(`  posicoes que ela conhece .... ${Object.keys(this.estados).length}`);
    linhas.push(`  jogadas vistas .............. ${e.jogadasVistas}`);
    linhas.push(`  passos de aprendizado ....... ${e.passosAprendizado}`);
    linhas.push(`  licoes de erro na base ...... ${this.licoes.length}`);
    linhas.push(`     "deixou de ganhar" ....... ${e.deixouDeGanhar}`);
    linhas.push(`     "nao bloqueou" ........... ${e.naoBloqueou}`);
    linhas.push(`  experiencias na memoria ..... ${this.memoria.length}`);
    if (this.referencia.length) {
      linhas.push(`  ensaio anti-esquecimento .... ${this.referencia.length} posicoes de referencia`);
    } else {
      linhas.push(`  ensaio anti-esquecimento .... AUSENTE (rode o treinamento para gerar)`);
    }
    linhas.push('  ' + '-'.repeat(64));
    return linhas.join('\n');
  }

  /** As lições mais reincidentes -- "o que ela mais errou e teve de aprender". */
  licoesPrincipais(quantas = 5) {
    return this.licoes
      .slice()
      .sort((a, b) => b.vezes - a.vezes)
      .slice(0, quantas);
  }
}

module.exports = AprendizadoOnline;
