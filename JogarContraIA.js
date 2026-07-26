// Path: JogarContraIA.js
//
// JOGAR CONTRA A IA -- E ELA APRENDE DE VOCE, PARTIDA A PARTIDA.
//
//   node JogarContraIA.js                 joga (e ela aprende)
//   node JogarContraIA.js --do-zero       ZERA a base: ela nao sabe NADA e vai
//                                         aprender so jogando com voce
//   node JogarContraIA.js --sem-aprender   so joga, sem alterar a base
//   node JogarContraIA.js --base           mostra a base de conhecimento e sai
//
// O original esta em JogarContraIA.js.BACKUP-ORIGINAL-25-07-2026.NAO-APAGAR
// (ele carregava um modelo fixo e jogava; a partida nao mudava nada.)

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const J = require('./rede_neural/JogoDaVelha.js');
const AprendizadoOnline = require('./rede_neural/AprendizadoOnline.js');

// ---------------------------------------------------------------- cores ANSI
const C = {
  reset: '\x1b[0m', negrito: '\x1b[1m', fraco: '\x1b[2m',
  amarelo: '\x1b[33m', verde: '\x1b[32m', vermelho: '\x1b[31m',
  azul: '\x1b[36m', magenta: '\x1b[35m'
};

const args = process.argv.slice(2);
const tem = (n) => args.includes(`--${n}`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// LEITURA DA ENTRADA -- com fila propria, em vez de `rl.question`.
//
// POR QUE: com `rl.question`, uma linha que chega quando NAO ha pergunta
// pendente e simplesmente descartada. Isso quebrava duas coisas:
//   1. colar varias linhas de uma vez (as extras eram perdidas);
//   2. rodar o jogo com entrada vinda de arquivo ou pipe -- o processo saia
//      calado, com codigo 0, no meio da primeira partida (foi assim que
//      descobri: o teste automatizado morria sempre na primeira jogada).
// A fila guarda o que chegou adiantado, e o fechamento da entrada (Ctrl+D)
// passa a ser tratado como "sair" em vez de travar para sempre.
// ---------------------------------------------------------------------------
const filaLinhas = [];
const filaEsperando = [];
let entradaFechada = false;

rl.on('line', (linha) => {
  const texto = linha.trim();
  if (filaEsperando.length) filaEsperando.shift()(texto);
  else filaLinhas.push(texto);
});
rl.on('close', () => {
  entradaFechada = true;
  while (filaEsperando.length) filaEsperando.shift()(null);
});

/** Devolve a linha digitada, ou `null` se a entrada terminou. */
function perguntar(texto) {
  process.stdout.write(texto);
  if (filaLinhas.length) {
    const pronta = filaLinhas.shift();
    process.stdout.write(pronta + '\n');
    return Promise.resolve(pronta);
  }
  if (entradaFechada) { process.stdout.write('\n'); return Promise.resolve(null); }
  return new Promise(resolve => filaEsperando.push(resolve));
}

// ---------------------------------------------------------------------------
// A IA
// ---------------------------------------------------------------------------
const pastaModelo = path.join(__dirname, 'modelo');
const arquivoBase = path.join(pastaModelo, 'base_conhecimento.json');

if (tem('do-zero') && fs.existsSync(arquivoBase)) {
  const reserva = arquivoBase + '.anterior';
  fs.renameSync(arquivoBase, reserva);
  console.log(`${C.amarelo}Base anterior guardada em ${path.basename(reserva)}.${C.reset}`);
}

const ia = new AprendizadoOnline({
  // Comecando do zero ela PRECISA experimentar para descobrir o jogo: sem
  // exploracao, ela repetiria eternamente a primeira jogada que achou boa.
  // Ja treinada, exploracao so a faria jogar pior de proposito -> zero.
  explorar: tem('do-zero') ? 0.12 : 0
});
// `null` = nao caia no modelo treinado; comece de verdade do zero.
const infoCarga = ia.carregar(tem('do-zero') ? null : 'modelo_jogo_da_velha_v2');

const aprendendo = !tem('sem-aprender');

// ---------------------------------------------------------------------------
// Tabuleiro na tela
// ---------------------------------------------------------------------------
// CORRIGIDO: o original imprimia "Voce (O) Vs IA com X" mas pintava as pecas do
// humano como X e as da IA como O -- o cabecalho contradizia o tabuleiro.
// Aqui o simbolo vem do lado de cada um, entao nao ha como divergir.
function exibirTabuleiro(tabuleiro, ladoHumano, ladoIA, titulo = '') {
  const simbolo = (celula, indice) => {
    if (celula === ladoHumano) return `${C.vermelho}${ladoHumano === J.X ? 'X' : 'O'}${C.reset}`;
    if (celula === ladoIA) return `${C.verde}${ladoIA === J.X ? 'X' : 'O'}${C.reset}`;
    return `${C.fraco}${indice}${C.reset}`;
  };
  const s = tabuleiro.map(simbolo);
  const humano = ladoHumano === J.X ? 'X' : 'O';
  const daIA = ladoIA === J.X ? 'X' : 'O';

  console.log(`
  ${C.amarelo}Autor: edersonfc7@gmail.com${C.reset}
  Voce (${C.vermelho}${humano}${C.reset})  vs  IA (${C.verde}${daIA}${C.reset})${titulo ? '   ' + titulo : ''}

     ${s[0]} | ${s[1]} | ${s[2]}
    ---+---+---
     ${s[3]} | ${s[4]} | ${s[5]}
    ---+---+---
     ${s[6]} | ${s[7]} | ${s[8]}
`);
}

function barra(valor, minimo, maximo, largura = 18) {
  const frac = Math.max(0, Math.min(1, (valor - minimo) / (maximo - minimo)));
  const cheio = Math.round(frac * largura);
  return '[' + '#'.repeat(cheio) + '.'.repeat(largura - cheio) + ']';
}

// ---------------------------------------------------------------------------
// Uma partida
// ---------------------------------------------------------------------------
async function umaPartida(numero, humanoComeca) {
  const ladoHumano = humanoComeca ? J.X : J.O;
  const ladoIA = -ladoHumano;

  ia.iniciarPartida(ladoIA);

  let tabuleiro = J.novoTabuleiro();
  let jogador = J.X;

  while (!J.terminou(tabuleiro)) {
    if (jogador === ladoHumano) {
      // ------------------------------------------------------ vez do humano
      exibirTabuleiro(tabuleiro, ladoHumano, ladoIA, `${C.fraco}partida ${numero}${C.reset}`);
      let posicao = null;
      while (posicao === null) {
        const resposta = await perguntar(`  Sua jogada (0-8${aprendendo ? ', ou "sair"' : ''}): `);
        if (resposta === null || resposta.toLowerCase() === 'sair') return 'sair';
        const n = parseInt(resposta, 10);
        if (Number.isInteger(n) && n >= 0 && n <= 8 && tabuleiro[n] === J.VAZIO) posicao = n;
        else console.log(`  ${C.vermelho}Posicao invalida. Escolha um numero livre do tabuleiro.${C.reset}`);
      }
      ia.registrarLance(tabuleiro, jogador, posicao);
      tabuleiro = J.aplicarJogada(tabuleiro, posicao, jogador);

    } else {
      // ---------------------------------------------------------- vez da IA
      // AQUI acontece o "aprender apos cada jogada": ao ser chamada, a IA
      // fecha a transicao da jogada anterior dela e da um passo de TD.
      const decisao = ia.jogarEAprender(tabuleiro);
      await esperar(450);

      const q = decisao.q;
      const nota = q && Number.isFinite(decisao.confianca) ? decisao.confianca : null;
      let detalhe = '';
      if (decisao.exploracao) {
        detalhe = `${C.magenta}(experimentando -- e assim que ela descobre jogadas novas)${C.reset}`;
      } else if (nota !== null) {
        detalhe = `${C.fraco}valor que ela da a essa jogada: ${nota.toFixed(3)} ` +
                  `${barra(nota, -1, 1)}${C.reset}`;
      }
      console.log(`  ${C.verde}IA jogou na posicao ${decisao.jogada}${C.reset}  ${detalhe}`);
      if (decisao.visitas === 1) {
        console.log(`  ${C.azul}   ^ posicao NOVA para ela: acabou de entrar na base de conhecimento.${C.reset}`);
      } else if (decisao.visitas > 1) {
        console.log(`  ${C.fraco}   ^ ela ja tinha visto esta posicao ${decisao.visitas - 1}x antes.${C.reset}`);
      }

      tabuleiro = J.aplicarJogada(tabuleiro, decisao.jogada, jogador);
      await esperar(350);
    }

    jogador = -jogador;
  }

  // ------------------------------------------------------------- fim de jogo
  const resultado = J.resultado(tabuleiro);
  exibirTabuleiro(tabuleiro, ladoHumano, ladoIA, `${C.fraco}fim da partida ${numero}${C.reset}`);

  if (resultado === ladoHumano) console.log(`  ${C.negrito}${C.vermelho}VOCE GANHOU!${C.reset}`);
  else if (resultado === ladoIA) console.log(`  ${C.negrito}${C.verde}A IA GANHOU.${C.reset}`);
  else console.log(`  ${C.negrito}${C.amarelo}EMPATE.${C.reset}`);

  // ------------------------------------------------------- o que ela aprendeu
  if (aprendendo) {
    console.log(`\n  ${C.azul}${C.negrito}O QUE ELA APRENDEU NESTA PARTIDA${C.reset}`);
    const r = ia.finalizarPartida(resultado);

    console.log(`  ${C.fraco}${'-'.repeat(64)}${C.reset}`);
    console.log(`  jogadas dela analisadas ..... ${r.transicoes}`);

    if (r.licoesNovas.length === 0) {
      console.log(`  erros bobos nesta partida ... ${C.verde}nenhum${C.reset}`);
    } else {
      console.log(`  erros bobos nesta partida ... ${C.vermelho}${r.licoesNovas.length}${C.reset}`);
      for (const licao of r.licoesNovas) {
        const nome = licao.tipo === 'deixou-de-ganhar'
          ? 'tinha 3 em linha e nao fechou'
          : 'voce ia fechar e ela nao bloqueou';
        console.log(`     ${C.vermelho}!${C.reset} ${nome}: jogou ${licao.jogadaErrada}, ` +
                    `o certo era ${licao.jogadaCerta}  ${C.fraco}(licao gravada)${C.reset}`);
      }
    }

    if (r.aprendizado) {
      const a = r.aprendizado;
      console.log(`  passos de treino ............ ${a.passos}` +
                  (a.licoesTreinadas ? ` + ${a.licoesTreinadas} licao(oes) revisada(s)` : ''));
      if (a.antes !== null) {
        const dif = a.depois - a.antes;
        const sinal = dif > 0.001 ? `${C.verde}+${dif.toFixed(3)}${C.reset}`
                    : dif < -0.001 ? `${C.vermelho}${dif.toFixed(3)}${C.reset}`
                    : `${C.fraco}0.000${C.reset}`;
        console.log(`  autoexame ................... ${a.antes.toFixed(3)}% -> ${a.depois.toFixed(3)}%  (${sinal})`);
        const explicacao = {
          melhorou: `${C.verde}MELHOROU -- ela sabe mais do que sabia antes desta partida.${C.reset}`,
          mantido: `${C.azul}MANTIDO -- nada a corrigir nesta partida.${C.reset}`,
          revertido: `${C.amarelo}REVERTIDO -- desfeito; ela voltou para ${a.antes.toFixed(3)}%.${C.reset}\n` +
                     `  ${C.fraco}   (a trava de seguranca: ela nunca sai de uma partida pior do que entrou)${C.reset}`
        };
        console.log(`  veredito .................... ${explicacao[a.veredito] || a.veredito}`);

        // Sem isto, quem joga contra uma rede ja perfeita ve "MANTIDO" ou
        // "REVERTIDO" em toda partida e conclui que o aprendizado esta quebrado.
        // Nao esta: e que nao ha mais nada para aprender.
        if (a.melhorDeTodos >= 99.99) {
          console.log(`  ${C.fraco}   Ela ja acerta as 4.520 posicoes do jogo. Nao existe jogada melhor para`);
          console.log(`     ela aprender -- daqui o aprendizado so tem como PROTEGER o que ela sabe.`);
          console.log(`     Para ver o aprendizado acontecendo de verdade: node JogarContraIA.js --do-zero${C.reset}`);
        }
      } else {
        console.log(`  ${C.fraco}veredito .................... aplicado (modo APRENDIZ: sem trava, ela esta descobrindo o jogo)${C.reset}`);
      }
    }

    const e = r.estatisticas;
    console.log(`  ${C.fraco}${'-'.repeat(64)}${C.reset}`);
    console.log(`  placar acumulado ............ voce ${e.derrotas} x ${e.vitorias} IA  (${e.empates} empates)`);
    console.log(`  posicoes na base ............ ${r.estadosConhecidos}`);
    console.log(`  licoes guardadas ............ ${ia.licoes.length}`);
    if (ia.ultimoSalvamento && !ia.ultimoSalvamento.ok) {
      console.log(`  ${C.vermelho}AVISO: nao consegui gravar a base (${ia.ultimoSalvamento.erro}).${C.reset}`);
      console.log(`  ${C.fraco}   O aprendizado desta sessao segue na memoria, mas pode nao persistir.${C.reset}`);
    } else {
      console.log(`  ${C.fraco}base gravada em modelo/base_conhecimento.json${C.reset}`);
    }
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------
async function principal() {
  console.log(`\n${C.negrito}  JOGO DA VELHA COM REDE NEURAL -- que aprende jogando${C.reset}`);
  console.log(`  ${C.fraco}${'='.repeat(64)}${C.reset}`);
  console.log(`  ${infoCarga.mensagem}`);

  if (infoCarga.origem === 'nova') {
    console.log(`  ${C.amarelo}Ela vai jogar MAL no comeco -- e o esperado: ela nao sabe nada ainda.`);
    console.log(`  Cada partida sua e uma aula. Jogue varias e veja o placar mudar.${C.reset}`);
  }
  if (!aprendendo) {
    console.log(`  ${C.amarelo}Modo --sem-aprender: a base nao sera alterada.${C.reset}`);
  }

  console.log('');
  console.log(ia.relatorio());

  if (tem('base')) {
    const principais = ia.licoesPrincipais(8);
    if (principais.length) {
      console.log(`\n  AS LICOES QUE ELA MAIS TEVE DE APRENDER:`);
      for (const l of principais) {
        console.log(`    ${l.tipo.padEnd(18)} ${l.vezes}x   posicao ${l.chave}  -> o certo era ${l.jogadaCerta}`);
      }
    }
    rl.close();
    return;
  }

  // Quem comeca? Alternar e o mais justo -- e cobre os dois lados do jogo.
  let humanoComeca = true;
  const resposta = await perguntar('\n  Quem comeca? [1] voce  [2] a IA  [3] alternar (padrao): ');
  const alternar = resposta !== '1' && resposta !== '2';
  if (resposta === '2') humanoComeca = false;

  let numero = ia.estatisticas.partidas + 1;
  while (true) {
    const r = await umaPartida(numero, humanoComeca);
    if (r === 'sair') break;

    const novamente = await perguntar(`\n  Jogar de novo? (s/n): `);
    if (novamente.toLowerCase() !== 's') break;

    if (alternar) humanoComeca = !humanoComeca;
    numero++;
  }

  console.log(`\n${C.negrito}  Fim da sessao.${C.reset}`);
  console.log(ia.relatorio());
  console.log(`\n  ${C.fraco}Ela continua de onde parou na proxima vez que voce rodar.${C.reset}\n`);
  rl.close();
}

principal().catch(erro => {
  console.error(`\n${C.vermelho}Erro: ${erro.message}${C.reset}`);
  console.error(erro.stack);
  rl.close();
  process.exit(1);
});
