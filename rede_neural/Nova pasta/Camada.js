// import Neuronio from './Neuronio.js';
const Neuronio = require('./Neuronio.js');

class Camada {
  constructor(numNeuronios, numEntradas) {
    this.neuronios = Array.from({ length: numNeuronios }, () => new Neuronio(numEntradas));
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
