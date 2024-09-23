const fs = require('fs');
const path = require('path');

// Função para salvar o modelo treinado no ambiente Node.js
function salvarModelo(redeNeural, nomeArquivo) {
  const modeloTreinado = redeNeural.exportarModelo();
  const json = JSON.stringify(modeloTreinado, null, 2);
  const caminhoArquivo = path.join(__dirname, '..', 'modelo', `${nomeArquivo}.json`);
  fs.writeFileSync(caminhoArquivo, json, 'utf-8');
  console.log(`Modelo salvo com sucesso em ${caminhoArquivo}`);
}

// Função para carregar o modelo treinado
function carregarModelo(redeNeural, nomeArquivo) {
  try {
    const caminhoArquivo = path.join(__dirname, '..', 'modelo', `${nomeArquivo}.json`);
    const json = fs.readFileSync(caminhoArquivo, 'utf-8');
    const modeloCarregado = JSON.parse(json);
    return modeloCarregado;
  } catch (erro) { console.log("Erro 76465349# => " + erro.message); }
}

// export { salvarModelo, carregarModelo };
module.exports = { salvarModelo, carregarModelo };

