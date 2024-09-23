const Camada = require('./Camada.js');

class RedeNeural {
  constructor(estruturas) {
    this.camadas = [];

    for (let i = 0; i < estruturas.length - 1; i++) {
      this.camadas.push(new Camada(estruturas[i + 1], estruturas[i]));
    }
  }

  propagar(entradas) {
    let saidas = entradas;
    this.camadas.forEach(camada => {
      saidas = camada.propagar(saidas);
    });
    return saidas;
  }

  treinar(entradas, saidasEsperadas, taxaAprendizagem, iteracoes) {
    for (let i = 0; i < iteracoes; i++) {
      let saidas = this.propagar(entradas);

      // Calcula o erro para cada neurônio na última camada
      for (let j = 0; j < this.camadas[this.camadas.length - 1].neuronios.length; j++) {
        let neuronio = this.camadas[this.camadas.length - 1].neuronios[j];
        neuronio.erro = saidasEsperadas[j] - neuronio.saida;
      }

      // Ajusta os pesos de cada camada, começando da última para a primeira
      for (let k = this.camadas.length - 1; k >= 0; k--) {
        let entradasCamada = k === 0 ? entradas : this.camadas[k - 1].neuronios.map(neuronio => neuronio.saida);
        let camada = this.camadas[k];
        camada.ajustarPesos(entradasCamada, taxaAprendizagem);
      }
    }
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