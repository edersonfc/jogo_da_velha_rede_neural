# JOGO DA VELHA COM REDE NEURAL — versão 2

> Rede neural escrita à mão, sem nenhuma biblioteca. Ela **treina** e depois
> **continua aprendendo enquanto você joga com ela**.

---

## Como usar

```
node rede_neural/treinarIA.js      treina (2 fases) e mede o resultado
node JogarContraIA.js              joga -- e ela aprende de você a cada partida
node JogarContraIA.js --do-zero    ela NÃO SABE NADA e aprende só jogando com você
node rede_neural/avaliarModelo.js  "quão inteligente ela está agora?", em números
```

Com `npm`: `npm run treinar`, `npm run jogar`, `npm run jogar-do-zero`,
`npm run avaliar`.

---

## O que foi feito nesta versão

Você pediu duas coisas:

1. **um recurso novo** — a IA aprendendo conforme o usuário joga, formando aos
   poucos uma base de conhecimento, aprendendo com erros e acertos;
2. **melhorar o treinamento que já existia**, porque no fim ele não deixava a
   rede inteligente e ela perdia em coisas bobas.

As duas estão feitas, e o resultado foi **medido** — não é impressão.

### O problema, em números

O primeiro passo foi construir uma régua (`rede_neural/Avaliador.js`) e medir o
modelo que estava salvo. Ele passa por **todas as 4.520 posições possíveis** do
jogo da velha e pergunta: a jogada escolhida está entre as perfeitas?

| medida | modelo antigo | agora |
|---|---|---|
| acerto ótimo nas 4.520 posições | **56,57%** | **100,00%** |
| erro bobo "tinha 3 em linha e não fechou" | **1.150** | **0** |
| erro bobo "não bloqueou" | **598** | **0** |
| derrotas para o jogo perfeito (100 partidas) | **94** | **0** |
| derrotas para um jogador **aleatório** (100 partidas) | **34** | **0** |

Aquela última linha é a que explica o que você sentiu jogando: **o modelo antigo
perdia 34 de cada 100 partidas para alguém jogando ao acaso.**

Para conferir você mesmo:

```
node rede_neural/avaliarModelo.js --antigo    (o modelo antigo, ainda preservado)
node rede_neural/avaliarModelo.js --modelo    (o novo)
```

---

## As 8 causas do treinamento antigo não funcionar

Estão todas documentadas dentro de `rede_neural/AgenteTreinamento.js`, no topo
do arquivo, junto do trecho de código que resolveu cada uma. Em resumo:

**1. Softmax na saída com alvo de Q-learning.** O erro de fundo. Em Q-learning a
saída é o *valor* de cada jogada, e valor pode ser **negativo** (−1 = essa jogada
me faz perder). O softmax só produz números positivos que somam 1: era
*matematicamente impossível* a rede dizer "essa jogada é ruim". Pior, o alvo
chegava a 1,9 — um número que softmax nunca alcança. A rede era empurrada para um
lugar onde não podia chegar, e os pesos cresciam sem parar.

O estrago está gravado no arquivo do modelo antigo, e é maior do que parece:

```
  pesos totais .................... 5.248
  maior peso ...................... +2,7 x 10^32
  menor peso ...................... -2,0 x 10^86
  pesos com |peso| acima de 100 ... 779  (14,8% da rede)
```

A inicialização Xavier nasce entre −0,8 e +0,8. **Um peso de 10⁸⁶ não é uma rede
mal treinada: é uma rede que divergiu**, e 15% dela estava nesse estado. Confira
com `node rede_neural/avaliarModelo.js --antigo`.

**2. A jogada vencedora nunca era premiada.** No fim da partida, o código
premiava `estadoAnterior`/`jogadaAnterior` — o turno *anterior*. A jogada que de
fato ganhou nunca recebia o +1.

**3. A memória de experiência guardava `recompensa: 0` sempre.** Vitória e
derrota jamais entravam no *replay*. O treino repetia 100 exemplos por episódio,
todos com recompensa zero — ruído puro.

**4. O alvo usava o estado errado.** `max(...previsao)` era o máximo do estado
**atual**, não do próximo, e a fórmula de Bellman pede o próximo. Em posição
terminal esse termo não pode nem existir.

**5. Heurística dentro da política de treino.** `escolherJogada` fechava vitória
e bloqueava ameaça **por regra fixa, antes de consultar a rede**. Consequência: a
rede nunca foi exposta a essas decisões e nunca as aprendeu. E o `JogarContraIA.js`
**não tinha** essa heurística — na hora de jogar, a rede ficava sozinha justamente
no que nunca treinou. **É a explicação direta de "perde em coisas bobas".**

**6. Treinava só começando.** No treino a IA sempre jogava primeiro; no jogo real
o humano começava. Metade do jogo era território desconhecido.

**7. Oponente sempre aleatório.** Nunca enfrentou ninguém que soubesse jogar.

**8. Nenhuma medição.** Terminava com "Treinamento concluído!" sem dizer se havia
ficado bom ou ruim.

---

## Como o treinamento novo funciona

### Fase 1 — imitação (≈16 s)

O `Minimax.js` resolve o jogo da velha por completo e produz a tabela **Q\***
exata: o valor verdadeiro de cada jogada em cada posição. A rede aprende a
reproduzir essa tabela nas 4.520 posições.

São duas etapas, e a segunda foi necessária por um motivo interessante:

- **regressão** — a rede aprende o *valor* de cada jogada. Chega a ~97,7% e
  **empaca**;
- **correção de margem** — porque quem decide a jogada é o **argmax**, não o
  valor. Duas jogadas que levam ao mesmo empate têm Q\* = 0 as duas; um errinho
  de 0,05 inverte a escolha sem quase mexer na perda. Foi exatamente isso que
  travou a rede: a perda continuava caindo e o acerto não subia — o erro "deixou
  de ganhar" chegou a **aumentar de 59 para 116** enquanto a perda ia de 0,42
  para 0,03. A correção percorre só as posições ainda erradas e abre uma margem
  entre a jogada certa e a que a rede escolheu. **Com ela, chega a 100,00%.**

### Fase 2 — reforço (DQN de verdade)

Agora o Q-learning está correto: saída linear, transições bem montadas, rede-alvo
separada, Double DQN, máscara de jogadas inválidas, auto-jogo, oponentes variados
(aleatório → ela mesma → perfeito) e a IA jogando **dos dois lados**.

Prova de que a correção é real: partindo de uma rede **crua**, sem nenhum
professor, o reforço sozinho sai de **11% e chega a 88%** em 3.000 episódios. O
antigo empacava em 56% com 10.000. Para ver isso rodando:

```
node rede_neural/treinarIA.js --so-reforco
```

> Observação honesta: como a Fase 1 já leva a rede a 100%, a Fase 2 **não tem de
> onde subir** depois dela — o próprio relatório do treino diz isso, e o melhor
> checkpoint é sempre restaurado. As duas fases existem porque o reforço é o
> coração do projeto; a imitação é o que garante o resultado.

---

## O recurso novo: ela aprende jogando com você

Arquivo: `rede_neural/AprendizadoOnline.js`.

Antes, o ciclo era *treinar → salvar → jogar*, e jogar não mudava nada. Agora:

- **após cada jogada** — um passo de aprendizado imediato (TD online);
- **após cada partida** — o aprendizado forte, com o resultado já conhecido, mais
  a lição dos erros que ela cometeu;
- **entre sessões** — tudo fica em `modelo/base_conhecimento.json`. Você fecha o
  jogo, volta amanhã, e ela continua de onde parou.

O `Minimax.js` **não é importado** por esse arquivo, de propósito: não existe
professor na hora de jogar. Se existisse, quem estaria jogando bem seria ele.

### Aprender com os próprios erros

No fim da partida ela relê o jogo e procura dois erros que dá para identificar
**só com as regras**, sem oráculo nenhum:

- **"deixou de ganhar"** — tinha 3 em linha e jogou outra coisa. Aqui o valor
  verdadeiro é conhecido: aquela jogada valia +1;
- **"não bloqueou"** — você ia fechar na próxima, ela não tinha vitória própria e
  não bloqueou.

Cada erro vira uma **lição gravada na base**, e errar a mesma coisa de novo pesa
mais (reincidência = mais repetições no treino).

### O problema difícil: ela não pode DESAPRENDER

Este foi o ponto que deu mais trabalho, e vale explicar porque é contraintuitivo.

Treinar uma rede neural só com as últimas partidas faz ela **esquecer o resto do
jogo** — é o *esquecimento catastrófico*. Sem tratamento, "aprender jogando"
virava literalmente "desaprender jogando". Medido, partindo do modelo perfeito:

| versão do aprendizado online | depois de 60 partidas |
|---|---|
| primeira tentativa | 100% → **96,84%**, e passou a **perder 5 de 100** para o jogo perfeito |
| + ensaio parcial (904 posições) | 100% → 98,96% |
| + ensaio completo (4.520) | 100% → 99,47% |
| + trava contra a partida anterior | 100% → 99,58% |
| **+ trava contra o melhor de todos** | **100% → 100,00%** |

Três mecanismos, cada um consertando o que o anterior deixou passar:

1. **Ensaio (*rehearsal*).** Junto com a partida nova, ela treina também com
   posições de referência que cobrem o jogo inteiro (`conjunto_referencia.json`,
   gravado pelo treinamento). O ensaio pesa **mais** que a partida nova.

2. **Autoexame.** Depois de aprender, ela se testa nessas mesmas posições — um
   caderno de exercícios já resolvido que ela carrega na própria base. Não é
   consulta a oráculo durante o jogo.

3. **Trava de segurança.** Se a partida a deixaria pior do que ela **já foi
   alguma vez**, a partida é **desfeita por inteiro**. A foto dos pesos é tirada
   no *início* da partida — o vazamento que faltava era justamente que os passos
   de aprendizado feitos *durante* a partida escapavam da trava.

Resultado: **a cada partida ela fica melhor ou igual. Nunca pior.**

### Dois modos, porque as duas situações pedem coisas opostas

| | quando | taxas | trava |
|---|---|---|---|
| **APRENDIZ** | ela não sabe nada (começou do zero) | altas — precisa aprender | não há o que proteger |
| **VETERANO** | ela já vem treinada | baixas — o risco é estragar | ativa |

Com um único conjunto de taxas não dava: as baixas mantinham o modelo perfeito
mas do zero só saíam de 54% para 60% em 400 partidas; as altas aprendiam do zero
mas derrubavam o modelo perfeito para 96,8%.

### Ver o aprendizado acontecendo

Contra a rede já treinada você não vai ver ela melhorar — ela já acerta as 4.520
posições, não existe jogada melhor para aprender. Para ver o aprendizado de
verdade:

```
node JogarContraIA.js --do-zero
```

Ela começa sem saber nada, joga mal, e vai aprendendo de você. Medido contra um
oponente simulado, partindo do zero: **50% → 71,9% de acerto ótimo em 400
partidas**, com as lições de erro acumulando na base.

---

## Os arquivos

| arquivo | o que faz | estado |
|---|---|---|
| `rede_neural/JogoDaVelha.js` | as regras, em um lugar só | **novo** |
| `rede_neural/Minimax.js` | o professor perfeito (só treino/avaliação) | **novo** |
| `rede_neural/Avaliador.js` | a régua: 4.520 posições + duelos | **novo** |
| `rede_neural/AprendizadoOnline.js` | aprender jogando + base de conhecimento | **novo** |
| `rede_neural/avaliarModelo.js` | "quão inteligente ela está agora?" | **novo** |
| `rede_neural/AgenteTreinamento.js` | o treinamento (2 fases) | **reescrito** |
| `rede_neural/treinarIA.js` | roda o treino e mede antes/depois | **reescrito** |
| `JogarContraIA.js` | o jogo | **reescrito** |
| `rede_neural/RedeNeural.js` | a rede | **ajustada** (saída linear, máscara, corte de gradiente, clonar) |
| `rede_neural/modeloUtils.js`, `Camada.js`, `Neuronio.js` | — | intocados |

### Nada foi apagado

Todo arquivo alterado tem uma cópia do original ao lado, com o sufixo
`.BACKUP-ORIGINAL-25-07-2026.NAO-APAGAR`, incluindo o modelo antigo
(`modelo/modelo_treinado_jogo_da_velha.json`). O modelo novo tem nome próprio
(`modelo_jogo_da_velha_v2.json`), então nada foi sobrescrito.

---

## Duas correções pequenas que apareceram no caminho

- **O cabeçalho contradizia o tabuleiro.** O original imprimia
  `"Você (O) Vs IA com X"` mas pintava as peças do humano como **X** e as da IA
  como **O**. Agora o símbolo vem do lado de cada um — não há como divergir.

- **Entrada podia ser perdida.** Com `rl.question`, uma linha que chega quando
  não há pergunta pendente é descartada em silêncio, e no fim da entrada
  (Ctrl+D) o jogo morria calado. Trocado por uma fila de entrada própria.

- **Gravação da base à prova de falha.** A base é reescrita depois de *cada*
  partida; agora a escrita é atômica (arquivo temporário + rename) com
  retentativa. Isso não é teoria: durante os testes o Windows travou o arquivo
  por um instante e derrubou o jogo.

---

*Autor: edersonfc7@gmail.com*
