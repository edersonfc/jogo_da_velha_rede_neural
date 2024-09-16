/*
const Neuronio = require('./Neuronio.js');

class Camada {
  constructor(numNeuronios, numEntradas) {
    this.neuronios = Array.from({ length: numNeuronios }, () => new Neuronio(numEntradas));

    this.bias = Math.random() * 2 - 1; // Inicializa o bias aleatoriamente entre -1 e 1
  }

  propagar(entradas) {
    return this.neuronios.map(neuronio => neuronio.propagar(entradas));
  }

  ajustarPesos(entradas, taxaAprendizagem) {
    this.neuronios.forEach(neuronio => neuronio.ajustarPesos(entradas, taxaAprendizagem));
  }

  // Exportar pesos e biases
  exportarPesosBiases() {
    return this.neuronios.map(neuronio => ({
      pesos: neuronio.pesos,
      bias: neuronio.bias
    }));
  }

  // Importar pesos e biases
  importarPesosBiases(dados) {
    this.neuronios.forEach((neuronio, index) => {
      neuronio.pesos = dados[index].pesos;
      neuronio.bias = dados[index].bias;
    });
  }
}

// export default Camada;
module.exports =  Camada;
*/

/////////////////////////////////////
// Importa a classe Neuronio
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

  // Exporta os pesos e biases dos neurônios da camada
  exportarPesosBiases() {
    return this.neuronios.map(neuronio => ({
      pesos: neuronio.pesos,
      bias: neuronio.bias
    }));
  }

  // Importa os pesos e biases para os neurônios da camada
  importarPesosBiases(dados) {
    this.neuronios.forEach((neuronio, index) => {
      neuronio.pesos = dados[index].pesos;
      neuronio.bias = dados[index].bias;
    });
  }
}

// Exporta a classe Camada
module.exports = Camada;