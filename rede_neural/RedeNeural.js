const Camada = require('./Camada.js');
class RedeNeural {
  constructor(estruturas) {
    this.camadas = [];
    for (let i = 0; i < estruturas.length - 1; i++) {
      this.camadas.push(new Camada(estruturas[i + 1], estruturas[i]));
    }
    this.taxaAprendizagem = 0.01;
    this.momentum = 0.9;
    this.regularizacao = 0.0001;
  }

  propagar(entradas) {
    let saidas = entradas;
    this.camadas.forEach(camada => {
      saidas = camada.propagar(saidas);
    });
    return saidas;
  }

  treinar(entradas, saidasEsperadas, taxaAprendizagem, maxIteracoes) {
    let epoca = 0;
    let erroMedio = Infinity;
    const erroMinimo = 0.001; // Defina um erro mínimo aceitável
    while (epoca < maxIteracoes && erroMedio > erroMinimo) {
      // Propaga as entradas pela rede para atualizar o estado dos neurônios
      // Isso é necessário para o cálculo correto do erro e atualização dos pesos
      this.propagar(entradas);
      erroMedio = 0;
      // Calcula o erro para cada neurônio na última camada
      for (let j = 0; j < this.camadas[this.camadas.length - 1].neuronios.length; j++) {
        let neuronio = this.camadas[this.camadas.length - 1].neuronios[j];
        neuronio.erro = saidasEsperadas[j] - neuronio.saida;
        erroMedio += Math.abs(neuronio.erro);
      }
      erroMedio /= this.camadas[this.camadas.length - 1].neuronios.length;
      // Atualiza os pesos de cada camada, começando da última para a primeira
      for (let k = this.camadas.length - 1; k >= 0; k--) {
        let camada = this.camadas[k];
        camada.atualizarPesos(taxaAprendizagem, this.momentum, this.regularizacao);
      }
      epoca++;
      if (epoca % 1000 === 0) {
        console.log(`Época ${epoca}, Erro Médio: ${erroMedio}`);
      }
    }
  }

  calcularErro(saidas, saidasEsperadas) {
    let erro = 0;
    for (let i = 0; i < saidas.length; i++) {
      erro += Math.pow(saidasEsperadas[i] - saidas[i], 2);
    }
    return erro / saidas.length;
  }

  exportarModelo() {
    const modelo = [];
    for (let i = 0; i < this.camadas.length; i++) {
      const camada = this.camadas[i];
      const dadosCamada = {
        pesos: [],
        biases: []
      };
      for (const neuronio of camada.neuronios) {
        dadosCamada.pesos.push(neuronio.pesos);
        dadosCamada.biases.push(neuronio.bias);
      }
      modelo.push(dadosCamada);
    }
    return modelo;
  }

  importarModelo(dadosModelo) {
    if (dadosModelo.length !== this.camadas.length) {
      throw new Error("O modelo importado não corresponde à estrutura da rede neural");
    }
    this.camadas.forEach((camada, index) => {
      camada.importarPesosBiases(dadosModelo[index]);
    });
  }
}
module.exports = RedeNeural;