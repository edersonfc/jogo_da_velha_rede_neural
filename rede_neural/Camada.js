const Neuronio = require('./Neuronio.js');

class Camada {
  constructor(numNeuronios, numEntradas) {
    this.neuronios = Array.from({ length: numNeuronios }, () => new Neuronio(numEntradas));
    this.entradas = [];
  }

  propagar(entradas) {
    this.entradas = entradas;
    return this.neuronios.map(neuronio => neuronio.propagar(entradas));
  }

  calcularGradientes(proximaCamada) {
    for (let i = 0; i < this.neuronios.length; i++) {
      let somaGradientes = 0;
      if (proximaCamada) {
        for (const neuronio of proximaCamada.neuronios) {
          somaGradientes += neuronio.pesos[i] * neuronio.gradiente;
        }
      }
      this.neuronios[i].gradiente = somaGradientes * this.neuronios[i].derivada();
    }
  }

  atualizarPesos(entradas, taxaAprendizagem) {
    for (const neuronio of this.neuronios) {
      for (let j = 0; j < neuronio.pesos.length; j++) {
        neuronio.pesos[j] += taxaAprendizagem * neuronio.gradiente * entradas[j];
      }
      neuronio.bias += taxaAprendizagem * neuronio.gradiente;
    }
  }
}


module.exports = Camada;