//Path of this file => rede_neural\treinarIA.js
const RedeNeural = require('./RedeNeural.js');
const AgenteTreinamento = require('./AgenteTreinamento.js');
const { salvarModelo } = require('./modeloUtils.js');

// Configuração da Rede
const estrutura = [9, 64, 64, 9]; // Entrada: 9, Saída: 9 (uma para cada posição)
const rede = new RedeNeural(estrutura);

// Treinamento
const treinador = new AgenteTreinamento(rede);
treinador.treinar(10000, 0.01).then(() => {
  // Salvamento do Modelo
  salvarModelo(rede, 'modelo_treinado_jogo_da_velha');
  console.log('Treinamento concluído e modelo salvo!');
});