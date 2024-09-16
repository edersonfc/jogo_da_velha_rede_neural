class Neuronio {
  constructor(numEntradas) {
    this.pesos = [];
    this.bias = Math.random() * 2 - 1; // Inicializa o bias aleatoriamente entre -1 e 1

    for (let i = 0; i < numEntradas; i++) {
      this.pesos.push(Math.random() * 2 - 1); // Inicializa os pesos aleatoriamente entre -1 e 1
    }
  }

  propagar(entradas) {
    let soma = this.bias; // Inicializa a soma com o valor do bias

    for (let i = 0; i < entradas.length; i++) {
      soma += entradas[i] * this.pesos[i]; // Soma ponderada das entradas e pesos
    }

    return this.funcaoAtivacao(soma); // Aplica a função de ativação à soma
  }

  ajustarPesos(entradas, taxaAprendizagem) {
    const erro = this.erro; // Obtém o erro calculado durante a propagação reversa

    for (let i = 0; i < this.pesos.length; i++) {
      const gradiente = entradas[i] * erro; // Calcula o gradiente para cada peso
      this.pesos[i] -= taxaAprendizagem * gradiente; // Ajusta o peso com base no gradiente e na taxa de aprendizagem
    }

    this.bias -= taxaAprendizagem * erro; // Ajusta o bias com base no erro e na taxa de aprendizagem
  }

  funcaoAtivacao(valor) {
    // Implemente a função de ativação desejada (por exemplo, sigmoid, ReLU, etc.)
    return 1 / (1 + Math.exp(-valor));
  }
}

module.exports = Neuronio;