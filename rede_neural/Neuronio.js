class Neuronio {
  constructor(numEntradas) {
    // Inicializa os pesos com valores aleatórios entre -1 e 1
    this.pesos = Array.from({ length: numEntradas }, () => Math.random() * 2 - 1);
    // Inicializa o bias com um valor aleatório entre -1 e 1
    this.bias = Math.random() * 2 - 1;
    this.saida = 0;
    this.erro = 0;
  }

  // Função de ativação (sigmoid)
  ativacao(valor) {
    return 1 / (1 + Math.exp(-valor));
  }

  // Propaga as entradas através do neurônio
  propagar(entradas) {
    // Calcula a soma ponderada das entradas mais o bias
    const soma = entradas.reduce((acc, entrada, index) => acc + entrada * this.pesos[index], 0);
    // Calcula a saída do neurônio aplicando a função de ativação
    this.saida = this.ativacao(soma + this.bias);
    return this.saida;
  }

  // Ajusta os pesos e o bias do neurônio com base no erro e na taxa de aprendizagem
  ajustarPesos(entradas, taxaAprendizagem) {
    for (let i = 0; i < this.pesos.length; i++) {
      // Ajusta cada peso
      this.pesos[i] += taxaAprendizagem * this.erro * entradas[i];
    }
    // Ajusta o bias
    this.bias += taxaAprendizagem * this.erro;
  }
}

module.exports = Neuronio;