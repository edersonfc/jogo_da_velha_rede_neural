const Camada = require('./Camada.js');

/*
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


  // importarModelo(dadosModelo) {
  //   this.camadas.forEach((camada, index) => {
  //     camada.importarPesosBiases(dadosModelo[index]);
  //   });
  // }

  ////##############################
  importarModelo(dadosModelo) {
    if (dadosModelo.length !== this.camadas.length) {
      throw new Error("O modelo importado não corresponde à estrutura da rede neural");
    }
      this.camadas.forEach((camada, index) => {
      camada.importarPesosBiases(dadosModelo[index]);
    });
  }


}
*/

/*
class RedeNeural {
  constructor(estruturas) {
    this.camadas = [];
    for (let i = 0; i < estruturas.length - 1; i++) {
      this.camadas.push(new Camada(estruturas[i + 1], estruturas[i]));
    }
  }

  propagar(entradas) {
    let saidas = entradas;
    for (const camada of this.camadas) {
      saidas = camada.propagar(saidas);
    }
    return saidas;
  }

  retropropagar(saidasEsperadas, taxaAprendizagem) {
    // Calcula gradientes na última camada
    const ultimaCamada = this.camadas[this.camadas.length - 1];
    for (let i = 0; i < ultimaCamada.neuronios.length; i++) {
      const neuronio = ultimaCamada.neuronios[i];
      neuronio.gradiente = saidasEsperadas[i] - neuronio.saida;
    }

    // Propaga gradientes para trás
    for (let i = this.camadas.length - 1; i >= 0; i--) {
      const camadaAtual = this.camadas[i];
      const entradasCamada = i > 0 ? 
        this.camadas[i - 1].neuronios.map(n => n.saida) : 
        camadaAtual.entradas;

      camadaAtual.calcularGradientes(this.camadas[i + 1]);
      camadaAtual.atualizarPesos(entradasCamada, taxaAprendizagem);
    }
  }
}

module.exports = RedeNeural;
*/


// Path: rede_neural/RedeNeural.js
class RedeNeural {
  constructor(estrutura) {
      this.estrutura = estrutura;
      this.pesos = [];
      this.biases = [];
      this.inicializarRede();
  }

  inicializarRede() {
      // Inicialização dos pesos e biases entre camadas
      for (let i = 0; i < this.estrutura.length - 1; i++) {
          const camadaEntrada = this.estrutura[i];
          const camadaSaida = this.estrutura[i + 1];
          
          // Inicialização Xavier/Glorot para pesos
          this.pesos[i] = Array(camadaSaida).fill().map(() => 
              Array(camadaEntrada).fill().map(() => 
                  (Math.random() * 2 - 1) * Math.sqrt(6 / (camadaEntrada + camadaSaida))
              )
          );
          
          this.biases[i] = Array(camadaSaida).fill().map(() => Math.random() * 0.1);
      }
  }

  ativacaoReLU(x) {
      return Math.max(0, x);
  }

  derivadaReLU(x) {
      return x > 0 ? 1 : 0;
  }

  softmax(arr) {
      const max = Math.max(...arr);
      const exp = arr.map(x => Math.exp(x - max));
      const sum = exp.reduce((a, b) => a + b, 0);
      return exp.map(x => x / sum);
  }

  forward(entrada) {
      let ativacoes = [entrada.slice()];
      let zs = [];

      for (let i = 0; i < this.pesos.length; i++) {
          const camadaAtual = [];
          const z = [];

          for (let j = 0; j < this.pesos[i].length; j++) {
              let soma = this.biases[i][j];
              for (let k = 0; k < this.pesos[i][j].length; k++) {
                  soma += this.pesos[i][j][k] * ativacoes[i][k];
              }
              
              // Aplica ReLU nas camadas ocultas
              if (i < this.pesos.length - 1) {
                  z.push(soma);
                  camadaAtual.push(this.ativacaoReLU(soma));
              } else { // Softmax na última camada
                  z.push(soma);
                  camadaAtual.push(soma); // Softmax será aplicado depois
              }
          }

          zs.push(z);
          if (i === this.pesos.length - 1) {
              ativacoes.push(this.softmax(camadaAtual));
          } else {
              ativacoes.push(camadaAtual);
          }
      }

      return { ativacoes, zs };
  }

  backward(entrada, alvo, taxaAprendizado) {
      const { ativacoes, zs } = this.forward(entrada);
      const deltas = [];
      
      // Cálculo do erro na camada de saída
      let erro = Array.from(ativacoes[ativacoes.length - 1]).map((a, i) => a - alvo[i]);
      deltas[this.pesos.length - 1] = erro;

      // Backpropagation
      for (let i = this.pesos.length - 2; i >= 0; i--) {
          erro = [];
          for (let j = 0; j < this.pesos[i].length; j++) {
              let somaErro = 0;
              for (let k = 0; k < this.pesos[i + 1].length; k++) {
                  somaErro += this.pesos[i + 1][k][j] * deltas[i + 1][k];
              }
              erro[j] = somaErro * this.derivadaReLU(zs[i][j]);
          }
          deltas[i] = erro;
      }

      // Atualização dos pesos e biases
      for (let i = 0; i < this.pesos.length; i++) {
          for (let j = 0; j < this.pesos[i].length; j++) {
              for (let k = 0; k < this.pesos[i][j].length; k++) {
                  this.pesos[i][j][k] -= taxaAprendizado * deltas[i][j] * ativacoes[i][k];
              }
              this.biases[i][j] -= taxaAprendizado * deltas[i][j];
          }
      }

      return this.calcularPerda(ativacoes[ativacoes.length - 1], alvo);
  }

  calcularPerda(saida, alvo) {
      // Cross-entropy loss
      return -saida.reduce((acc, val, idx) => acc + alvo[idx] * Math.log(val + 1e-8), 0);
  }

  prever(entrada) {
      const { ativacoes } = this.forward(entrada);
      return ativacoes[ativacoes.length - 1];
  }

  trainOnBatch(loteEntradas, loteAlvos, taxaAprendizado) {
      let perdaTotal = 0;
      for (let i = 0; i < loteEntradas.length; i++) {
          perdaTotal += this.backward(loteEntradas[i], loteAlvos[i], taxaAprendizado);
      }
      return perdaTotal / loteEntradas.length;
  }

  exportarModelo() {
      return {
          estrutura: this.estrutura,
          pesos: this.pesos,
          biases: this.biases
      };
  }

  importarModelo(dados) {
      this.estrutura = dados.estrutura;
      this.pesos = dados.pesos;
      this.biases = dados.biases;
  }
}

module.exports = RedeNeural;