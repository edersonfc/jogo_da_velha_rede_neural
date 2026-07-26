class Neuronio {
  constructor(numEntradas) {
    this.pesos = Array.from({ length: numEntradas }, () => Math.random() * 2 - 1);
    this.bias = Math.random() * 2 - 1;
    this.saida = 0;
    this.gradiente = 0;
  }

  relu(x) {
    return Math.max(0, x);
  }

  derivadaRelu() {
    return this.saida > 0 ? 1 : 0;
  }

  propagar(entradas) {
    const soma = entradas.reduce((acc, entrada, i) => acc + entrada * this.pesos[i], 0) + this.bias;
    this.saida = this.relu(soma);
    return this.saida;
  }

  derivada() {
    return this.derivadaRelu();
  }
}


module.exports = Neuronio;