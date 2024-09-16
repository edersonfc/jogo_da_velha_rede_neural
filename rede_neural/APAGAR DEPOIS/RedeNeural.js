// import Camada from './Camada.js';
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

      for (let j = 0; j < this.camadas[this.camadas.length - 1].neuronios.length; j++) {
        let neuronio = this.camadas[this.camadas.length - 1].neuronios[j];
        neuronio.erro = saidasEsperadas[j] - neuronio.saida;
      }

      for (let k = this.camadas.length - 1; k >= 0; k--) {
        let camada = this.camadas[k];
        camada.ajustarPesos(entradas, taxaAprendizagem);
      }
    }
  }

  // Exportar o modelo
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

  // Importar o modelo
  importarModelo(dadosModelo) {
    this.camadas.forEach((camada, index) => {
      camada.importarPesosBiases(dadosModelo[index]);
    });
  }
}

// export default RedeNeural;
module.exports = RedeNeural;