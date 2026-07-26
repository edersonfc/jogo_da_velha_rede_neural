// Path of this file => rede_neural\avaliarModelo.js
//
// "QUAO INTELIGENTE ELA ESTA AGORA?" -- a resposta em numeros, sem jogar.
//
//   node rede_neural/avaliarModelo.js            avalia a BASE de conhecimento
//                                                (o que o aprendizado online formou)
//   node rede_neural/avaliarModelo.js --modelo   avalia o modelo do TREINAMENTO
//   node rede_neural/avaliarModelo.js --antigo   avalia o modelo antigo, de 9
//                                                entradas com softmax (para comparar)
//
// Use depois de umas quantas partidas para ver se ela realmente subiu.

const fs = require('fs');
const path = require('path');
const RedeNeural = require('./RedeNeural.js');
const Avaliador = require('./Avaliador.js');
const AprendizadoOnline = require('./AprendizadoOnline.js');
const J = require('./JogoDaVelha.js');

const args = process.argv.slice(2);
const tem = (n) => args.includes(`--${n}`);
const pastaModelo = path.join(__dirname, '..', 'modelo');

const avaliador = new Avaliador();

function avaliarAntigo() {
  const caminho = path.join(pastaModelo, 'modelo_treinado_jogo_da_velha.json');
  if (!fs.existsSync(caminho)) {
    console.log('  O modelo antigo nao esta mais na pasta modelo/.');
    return;
  }
  const dados = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  const rede = new RedeNeural(dados.estrutura, { tipoSaida: 'softmax' });
  rede.importarModelo(dados);

  // Reproduz a politica do JogarContraIA.js ORIGINAL: 9 entradas com 1/0,5/0.
  const politica = (tabuleiro, jogador) => {
    const entrada = tabuleiro.map(c => (c === jogador ? 1 : c === J.VAZIO ? 0.5 : 0));
    const p = rede.forward(entrada).ativacoes.slice(-1)[0];
    let melhor = -Infinity, idx = -1;
    for (let i = 0; i < 9; i++) if (tabuleiro[i] === J.VAZIO && p[i] > melhor) { melhor = p[i]; idx = i; }
    return idx;
  };

  console.log(avaliador.relatorio(politica, 'O MODELO ANTIGO (treino original)', 50).texto);

  // O sintoma no proprio arquivo: os pesos estouraram.
  let maior = 0;
  for (const camada of dados.pesos) for (const linha of camada) for (const w of linha) {
    if (Math.abs(w) > maior) maior = Math.abs(w);
  }
  console.log(`  Maior peso em valor absoluto: ${maior.toFixed(2)}`);
  console.log(`  ${'(a inicializacao Xavier nasce entre -0,8 e +0,8 -- peso nessa ordem de'}`);
  console.log(`   grandeza e sinal de treino divergindo, nao de treino aprendendo)\n`);
}

function avaliarModeloTreinado() {
  const caminho = path.join(pastaModelo, 'modelo_jogo_da_velha_v2.json');
  if (!fs.existsSync(caminho)) {
    console.log('  Modelo do treinamento nao encontrado. Rode:  node rede_neural/treinarIA.js');
    return;
  }
  const dados = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  const rede = new RedeNeural(dados.estrutura, { tipoSaida: dados.tipoSaida || 'linear' });
  rede.importarModelo(dados);

  const politica = (tabuleiro, jogador) => {
    const q = rede.forward(J.codificarEstado(tabuleiro, jogador)).ativacoes.slice(-1)[0];
    let melhor = -Infinity, idx = -1;
    for (let i = 0; i < 9; i++) if (tabuleiro[i] === J.VAZIO && q[i] > melhor) { melhor = q[i]; idx = i; }
    return idx;
  };

  console.log(avaliador.relatorio(politica, 'O MODELO DO TREINAMENTO', 50).texto);
}

function avaliarBase() {
  const ia = new AprendizadoOnline();
  const info = ia.carregar();
  console.log(`\n  origem: ${info.mensagem}`);
  console.log(`  modo:   ${ia.modo}`);
  console.log('');
  console.log(ia.relatorio());
  console.log(avaliador.relatorio(ia.politica(), 'A BASE DE CONHECIMENTO ATUAL', 50).texto);

  const principais = ia.licoesPrincipais(8);
  if (principais.length) {
    console.log('  AS LICOES QUE ELA MAIS TEVE DE APRENDER JOGANDO:');
    console.log('  ' + '-'.repeat(72));
    for (const l of principais) {
      const nome = l.tipo === 'deixou-de-ganhar' ? 'deixou de ganhar' : 'nao bloqueou';
      console.log(`    ${nome.padEnd(18)} ${String(l.vezes).padStart(3)}x   ` +
                  `posicao ${l.chave}  -> o certo era ${l.jogadaCerta}`);
    }
    console.log('  ' + '-'.repeat(72));
    console.log('  (M = peca dela, O = peca do adversario, . = casa livre)\n');
  }
}

console.log('\n' + '='.repeat(78));
console.log('  AVALIACAO');
console.log('='.repeat(78));

if (tem('antigo')) avaliarAntigo();
else if (tem('modelo')) avaliarModeloTreinado();
else avaliarBase();
