// Path of this file => rede_neural\treinarIA.js
//
// O TREINO. Rode com:   node rede_neural/treinarIA.js
//
// Opcoes (todas opcionais):
//   node rede_neural/treinarIA.js --epocas=25 --episodios=4000
//   node rede_neural/treinarIA.js --so-reforco     (sem o professor: DQN puro)
//   node rede_neural/treinarIA.js --so-imitacao    (so o professor, mais rapido)
//   node rede_neural/treinarIA.js --rapido         (treino curto, para testar)
//
// O original esta em treinarIA.js.BACKUP-ORIGINAL-25-07-2026.NAO-APAGAR
// (ele fazia: `treinador.treinar(10000, 0.01)` e imprimia "concluido", sem
//  medir nada. Este aqui mede antes, mede depois e mostra a diferenca.)

const RedeNeural = require('./RedeNeural.js');
const AgenteTreinamento = require('./AgenteTreinamento.js');
const Avaliador = require('./Avaliador.js');
const Minimax = require('./Minimax.js');
const { salvarModelo } = require('./modeloUtils.js');
const fs = require('fs');
const path = require('path');

// --------------------------------------------------------------------------
// Argumentos de linha de comando
// --------------------------------------------------------------------------
const args = process.argv.slice(2);
const opcao = (nome, padrao) => {
  const achado = args.find(a => a.startsWith(`--${nome}=`));
  return achado ? Number(achado.split('=')[1]) : padrao;
};
const tem = (nome) => args.includes(`--${nome}`);

const rapido = tem('rapido');
const soReforco = tem('so-reforco');
const soImitacao = tem('so-imitacao');

const EPOCAS_IMITACAO = soReforco ? 0 : opcao('epocas', rapido ? 12 : 25);
const EPISODIOS = soImitacao ? 0 : opcao('episodios', rapido ? 800 : 4000);
const TAXA_IMITACAO = 0.02;
const TAXA_REFORCO = 0.003;

// --------------------------------------------------------------------------
// CONFIGURACAO DA REDE
// --------------------------------------------------------------------------
// 18 entradas: 9 para "as minhas pecas" + 9 para "as pecas dele".
//   (o antigo tinha 9 entradas com 1 / 0,5 / 0 -- ver JogoDaVelha.js para o
//    motivo de a codificacao ter mudado)
// 9 saidas  : o VALOR de jogar em cada casa. Pode ser negativo.
//   (o antigo terminava em softmax, que nao consegue representar valor
//    negativo -- ver o comentario no topo do AgenteTreinamento.js)
const ESTRUTURA = [18, 128, 128, 9];
const NOME_MODELO = 'modelo_jogo_da_velha_v2';

const rede = new RedeNeural(ESTRUTURA, { tipoSaida: 'linear' });

const minimax = new Minimax(0.95);
const avaliador = new Avaliador(minimax);
const treinador = new AgenteTreinamento(rede, { minimax, avaliador, tamanhoLote: 32 });

// --------------------------------------------------------------------------
function separador(titulo) {
  console.log('\n' + '='.repeat(78));
  console.log('  ' + titulo);
  console.log('='.repeat(78));
}

async function principal() {
  const t0 = Date.now();

  separador('TREINAMENTO DO JOGO DA VELHA COM REDE NEURAL');
  console.log(`  estrutura da rede ..... ${ESTRUTURA.join(' -> ')}  (saida linear = valor de cada jogada)`);
  console.log(`  fase 1 (imitacao) ..... ${EPOCAS_IMITACAO} epocas`);
  console.log(`  fase 2 (reforco) ...... ${EPISODIOS} episodios`);

  // ---------------------------------------------------------------- ANTES
  separador('ANTES DE TREINAR (rede com pesos aleatorios)');
  const antes = avaliador.relatorio(treinador.politica(), 'a rede nao treinada', 30);
  console.log(antes.texto);

  // ---------------------------------------------------------------- TREINO
  separador('TREINANDO');
  await treinador.treinar(EPISODIOS, TAXA_REFORCO, {
    epocasImitacao: EPOCAS_IMITACAO,
    taxaImitacao: TAXA_IMITACAO,
    avaliarCadaEpoca: Math.max(4, Math.floor(EPOCAS_IMITACAO / 4)),
    avaliarCadaEpisodio: Math.max(50, Math.floor(EPISODIOS / 12)),
    ciclosCorrecao: 40,
    // Se o professor ja rodou, a fase 2 comeca com pouca exploracao: a rede
    // ja sabe jogar, e encher a memoria de lance aleatorio so faria estragar.
    epsilonInicial: EPOCAS_IMITACAO > 0 ? 0.25 : 1.0
  });

  // ---------------------------------------------------------------- DEPOIS
  separador('DEPOIS DE TREINAR');
  const depois = avaliador.relatorio(treinador.politica(), 'a rede treinada', 50);
  console.log(depois.texto);

  // ---------------------------------------------------------------- COMPARACAO
  separador('O QUE MUDOU');
  const linha = (rotulo, a, b, melhorEhMenor = false, casas = 0) => {
    const na = Number(a), nb = Number(b);
    const seta = na === nb ? 'igual'
               : melhorEhMenor ? (nb < na ? 'MELHOROU' : 'piorou')
                               : (nb > na ? 'MELHOROU' : 'piorou');
    console.log(`  ${rotulo.padEnd(34)} ${na.toFixed(casas).padStart(10)}  ->  ` +
                `${nb.toFixed(casas).padStart(10)}   ${seta}`);
  };
  linha('acerto otimo (%)',
    antes.acertoOtimo.percentual, depois.acertoOtimo.percentual, false, 2);
  linha('erro bobo "deixou de ganhar"',
    antes.acertoOtimo.deixouDeGanhar, depois.acertoOtimo.deixouDeGanhar, true);
  linha('erro bobo "nao bloqueou"',
    antes.acertoOtimo.naoBloqueou, depois.acertoOtimo.naoBloqueou, true);
  linha('derrotas para o jogo perfeito',
    antes.vsPerfeito.derrotas, depois.vsPerfeito.derrotas, true);
  linha('derrotas para o ALEATORIO',
    antes.vsAleatorio.derrotas, depois.vsAleatorio.derrotas, true);

  // O que cada fase entregou -- sem enfeite.
  const c = treinador.contribuicao;
  if (c) {
    console.log('\n  A CONTRIBUICAO DE CADA FASE (acerto otimo):');
    console.log(`    rede crua .................... ${c.inicio.toFixed(2)}%`);
    if (c.depoisImitacao !== null) {
      console.log(`    depois da FASE 1 (imitacao) .. ${c.depoisImitacao.toFixed(2)}%`);
    }
    if (c.depoisReforco !== null) {
      console.log(`    depois da FASE 2 (reforco) ... ${c.depoisReforco.toFixed(2)}%`);
      const base = c.depoisImitacao ?? c.inicio;
      if (c.depoisReforco > base + 0.01) {
        console.log('    -> a fase 2 melhorou a rede.');
      } else if (c.depoisReforco < base - 0.01) {
        console.log('    -> a fase 2 nao melhorou; o melhor checkpoint foi restaurado.');
      } else {
        console.log('    -> a fase 2 manteve o nivel (nada a melhorar: a fase 1 ja chegou no teto).');
      }
      if (c.depoisImitacao !== null) {
        console.log('       Com o professor levando a rede a 100%, a fase 2 nao tem de onde subir.');
        console.log('       Para ver o REFORCO aprendendo sozinho, rode:  node rede_neural/treinarIA.js --so-reforco');
      }
    }
  }

  // ---------------------------------------------------------------- SALVAR
  separador('SALVANDO');
  salvarModelo(rede, NOME_MODELO);

  // O CONJUNTO DE REFERENCIA -- serve ao aprendizado online.
  //
  // POR QUE ELE EXISTE: quando a rede for aprendendo com as suas partidas
  // (AprendizadoOnline.js), treinar SO com as ultimas partidas faria a rede
  // esquecer o resto do jogo -- e o "esquecimento catastrofico" das redes
  // neurais. Misturar sempre um punhado destas posicoes de referencia junto
  // (o que se chama de "rehearsal") impede que aprender uma coisa nova apague
  // uma coisa velha. Sem isso, "aprender jogando" viraria "desaprender jogando".
  // Vao TODAS as 4.520 posicoes, nao uma amostra.
  //
  // POR QUE TODAS: numa primeira versao eu gravei so 904 (uma de cada 5) e
  // medi o efeito -- em 60 partidas a rede escorregou de 100,00% para 98,96%.
  // O motivo: o ensaio e o autoexame so cobriam 20% do jogo, e a deriva
  // acontecia justamente nos outros 80%, sem ninguem para notar. Com o conjunto
  // inteiro, o ensaio cobre o jogo todo e o autoexame passa a ser EXAUSTIVO.
  // Custa ~2 MB de disco e ~0,15 s por partida. Vale.
  //
  // `otimas` vai junto: e com ele que a IA faz o AUTOEXAME depois de cada
  // partida ("continuo sabendo o que eu sabia?"). Ver concordanciaComAncora().
  const conjunto = minimax.gerarConjuntoSupervisionado();
  const referencia = conjunto
    .map(am => ({ entrada: am.entrada, alvoQ: am.alvoQ, mascara: am.mascara, otimas: am.otimas }));

  const caminhoRef = path.join(__dirname, '..', 'modelo', 'conjunto_referencia.json');
  fs.writeFileSync(caminhoRef, JSON.stringify(referencia), 'utf-8');
  console.log(`Conjunto de referencia salvo (${referencia.length} posicoes) em ${caminhoRef}`);
  console.log('  -> usado pelo aprendizado online para nao esquecer o que ja sabe.');

  separador('PRONTO');
  console.log(`  tempo total: ${((Date.now() - t0) / 1000).toFixed(1)} segundos`);
  console.log('');
  console.log('  Agora jogue contra ela -- e ela CONTINUA APRENDENDO a cada partida:');
  console.log('      node JogarContraIA.js');
  console.log('');
  if (depois.perfeita) {
    console.log('  A rede joga PERFEITO nas 4.520 posicoes do jogo. Voce nao vai conseguir');
    console.log('  ganhar dela -- o maximo possivel e empatar. (E era esse o objetivo.)');
  }
  console.log('');
}

principal().catch(erro => {
  console.error('Erro no treinamento:', erro);
  process.exit(1);
});
