

class Neuronio {
  constructor(numEntradas) {
    this.pesos = Array.from({ length: numEntradas }, () => Math.random() * 2 - 1);
    this.bias = Math.random() * 2 - 1;
    this.saida = 0;
    this.gradiente = 0;
    this.deltaPesosAnterior = new Array(numEntradas).fill(0);
    this.deltaBiasAnterior = 0;
  }

  ativacao(valor) {
    return 1 / (1 + Math.exp(-valor));
  }

  derivadaAtivacao(valor) {
    return valor * (1 - valor);
  }

  propagar(entradas) {
    const soma = entradas.reduce((acc, entrada, index) => acc + entrada * this.pesos[index], 0) + this.bias;
    this.saida = this.ativacao(soma);
    return this.saida;
  }

  calcularGradienteSaida(saidaEsperada) {
    this.gradiente = (saidaEsperada - this.saida) * this.derivadaAtivacao(this.saida);
  }

  calcularGradienteOculto(camadaSeguinte, indice) {
    let soma = 0;
    for (let i = 0; i < camadaSeguinte.neuronios.length; i++) {
      soma += camadaSeguinte.neuronios[i].gradiente * camadaSeguinte.neuronios[i].pesos[indice];
    }
    this.gradiente = soma * this.derivadaAtivacao(this.saida);
  }

  atualizarPesos(entradas, taxaAprendizagem, momentum, regularizacao) {
    for (let i = 0; i < this.pesos.length; i++) {
      const deltaPeso = taxaAprendizagem * this.gradiente * entradas[i] + 
                        momentum * this.deltaPesosAnterior[i] - 
                        regularizacao * this.pesos[i];
      this.pesos[i] += deltaPeso;
      this.deltaPesosAnterior[i] = deltaPeso;
    }
    const deltaBias = taxaAprendizagem * this.gradiente + momentum * this.deltaBiasAnterior;
    this.bias += deltaBias;
    this.deltaBiasAnterior = deltaBias;
  }
}

module.exports = Neuronio;