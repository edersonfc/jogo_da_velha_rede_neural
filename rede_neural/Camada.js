const Neuronio = require('./Neuronio.js');

class Camada {
  constructor(numNeuronios, numEntradas) {
    // Inicializa a camada com um array de neurônios
    this.neuronios = Array.from({ length: numNeuronios }, () => new Neuronio(numEntradas));
  }

  // Propaga as entradas através da camada
  propagar(entradas) {
    return this.neuronios.map(neuronio => neuronio.propagar(entradas));
  }

  // Ajusta os pesos dos neurônios da camada
  ajustarPesos(entradas, taxaAprendizagem) {
    this.neuronios.forEach(neuronio => neuronio.ajustarPesos(entradas, taxaAprendizagem));
  }

  // Exporta pesos e biases dos neurônios da camada
  exportarPesosBiases() {
    return this.neuronios.map(neuronio => ({
      pesos: neuronio.pesos,
      bias: neuronio.bias
    }));
  }

  importarPesosBiases(dadosCamada) {
    if (dadosCamada.pesos.length !== this.neuronios.length || dadosCamada.biases.length !== this.neuronios.length) {
      throw new Error("O modelo importado não corresponde à estrutura da camada");
    }
    const pesos = dadosCamada.pesos;
    const biases = dadosCamada.biases;
    for (let i = 0; i < this.neuronios.length; i++) {
      this.neuronios[i].pesos = pesos[i];
      this.neuronios[i].bias = biases[i];
    }
  }


}

module.exports = Camada;