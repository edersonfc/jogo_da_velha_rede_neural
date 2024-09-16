class Neuronio {
    constructor(numEntradas) {
      this.pesos = Array.from({ length: numEntradas }, () => Math.random() * 2 - 1);
      this.erro = 0;
      this.saida = 0;
    }
  
    ativacao(x) {
      return 1 / (1 + Math.exp(-x));
    }
  
    propagar(entradas) {
      let soma = entradas.reduce((acumulado, entrada, i) => acumulado + entrada * this.pesos[i], 0);
      this.saida = this.ativacao(soma);
      return this.saida;
    }
  
    ajustarPesos(entradas, taxaAprendizagem) {
      for (let i = 0; i < this.pesos.length; i++) {
        this.pesos[i] += taxaAprendizagem * this.erro * entradas[i];
      }
    }
  }
  
  // export default Neuronio;
  module.exports =  Neuronio;
  