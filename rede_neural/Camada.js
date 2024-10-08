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
  calcularGradientesSaida(saidasEsperadas) {
    this.neuronios.forEach((neuronio, i) => {
      neuronio.calcularGradienteSaida(saidasEsperadas[i]);
    });
  }
  calcularGradientesOcultos(camadaSeguinte) {
    this.neuronios.forEach((neuronio, i) => {
      neuronio.calcularGradienteOculto(camadaSeguinte, i);
    });
  }
  atualizarPesos(taxaAprendizagem, momentum, regularizacao) {
    this.neuronios.forEach(neuronio => {
      neuronio.atualizarPesos(this.entradas, taxaAprendizagem, momentum, regularizacao);
    });
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