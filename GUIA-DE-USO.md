# GUIA DE USO

> Jogo da velha com rede neural escrita à mão, sem nenhuma biblioteca.
> Ela treina, e depois **continua aprendendo enquanto você joga**.
>
> Este guia é o "como usar". Se você quer saber **o que mudou e por quê**
> (os 8 bugs do treino antigo, os números do antes/depois), está no
> [`LEIA-ME.md`](LEIA-ME.md).

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Comece por aqui (primeira vez)](#2-comece-por-aqui-primeira-vez)
3. [Os quatro comandos](#3-os-quatro-comandos)
4. [Como jogar](#4-como-jogar)
5. [Entendendo a tela durante a partida](#5-entendendo-a-tela-durante-a-partida)
6. [Entendendo o relatório no fim da partida](#6-entendendo-o-relatório-no-fim-da-partida)
7. [Ver a IA aprendendo de verdade (do zero)](#7-ver-a-ia-aprendendo-de-verdade-do-zero)
8. [Consultar a base de conhecimento](#8-consultar-a-base-de-conhecimento)
9. [Medir se ela está ficando mais inteligente](#9-medir-se-ela-está-ficando-mais-inteligente)
10. [Opções do treinamento](#10-opções-do-treinamento)
11. [Onde fica cada arquivo](#11-onde-fica-cada-arquivo)
12. [Problemas e dúvidas](#12-problemas-e-dúvidas)
13. [Como voltar ao estado original](#13-como-voltar-ao-estado-original)

---

## 1. Requisitos

- **Node.js** (testado no v25.5.0; qualquer versão recente serve).
- **Nenhuma dependência.** Não precisa `npm install` — não há biblioteca
  nenhuma, nem de IA, nem de matemática. Tudo é código do projeto.

Confira se o Node está instalado:

```
node --version
```

---

## 2. Comece por aqui (primeira vez)

O modelo treinado **já vem no repositório**, então você pode ir direto jogar:

```
node JogarContraIA.js
```

Se quiser treinar você mesmo (leva **~1 minuto**):

```
node rede_neural/treinarIA.js
```

O treino mostra a rede **antes** (pesos aleatórios), as duas fases acontecendo,
e a rede **depois** — com todos os números lado a lado. No fim ele grava:

- `modelo/modelo_jogo_da_velha_v2.json` — a rede treinada;
- `modelo/conjunto_referencia.json` — as 4.520 posições que o aprendizado
  online usa para não esquecer o que já sabe.

---

## 3. Os quatro comandos

| comando | o que faz |
|---|---|
| `node JogarContraIA.js` | joga contra a IA — **e ela aprende de você** |
| `node rede_neural/treinarIA.js` | treina a rede e mede o resultado |
| `node rede_neural/avaliarModelo.js` | "quão inteligente ela está agora?", em números |
| `node JogarContraIA.js --base` | mostra a base de conhecimento e sai |

Com `npm` (atalhos definidos no `package.json`):

```
npm run jogar
npm run jogar-do-zero
npm run base
npm run treinar
npm run treinar-rapido
npm run treinar-so-reforco
npm run avaliar
```

### Todos os parâmetros

**Jogar:**

| parâmetro | efeito |
|---|---|
| *(nenhum)* | joga e aprende, partindo do que ela já sabe |
| `--do-zero` | **zera** a base: ela não sabe nada e aprende só jogando com você |
| `--sem-aprender` | só joga; a base **não** é alterada |
| `--base` | mostra a base de conhecimento e sai (não joga) |

**Treinar:**

| parâmetro | efeito |
|---|---|
| *(nenhum)* | 25 épocas de imitação + 4.000 episódios de reforço (~1 min) |
| `--rapido` | versão curta, para testar (12 épocas + 800 episódios) |
| `--so-imitacao` | só a Fase 1 — o caminho mais rápido para 100% |
| `--so-reforco` | **só a Fase 2**, sem professor — para ver o reforço aprendendo sozinho |
| `--epocas=N` | quantas épocas na Fase 1 |
| `--episodios=N` | quantos episódios na Fase 2 |

**Avaliar:**

| parâmetro | efeito |
|---|---|
| *(nenhum)* | avalia a **base de conhecimento** (o que o jogo formou) |
| `--modelo` | avalia o modelo do **treinamento** |
| `--antigo` | avalia o **modelo antigo**, para você conferir o diagnóstico |

---

## 4. Como jogar

As casas do tabuleiro são numeradas de **0 a 8**:

```
   0 | 1 | 2
  ---+---+---
   3 | 4 | 5
  ---+---+---
   6 | 7 | 8
```

Digite o número da casa e aperte Enter. As casas livres aparecem com o número;
as ocupadas, com o símbolo de quem jogou.

- **Suas peças** aparecem em **vermelho**
- **As peças da IA** aparecem em **verde**

No início ele pergunta quem começa:

```
Quem comeca? [1] voce  [2] a IA  [3] alternar (padrao):
```

**A opção 3 (alternar) é a recomendada** — quem começa no jogo da velha tem
vantagem, então alternar é mais justo e faz a IA praticar os dois lados.

Para sair no meio de uma partida, digite `sair`.

---

## 5. Entendendo a tela durante a partida

A cada jogada dela aparece algo assim:

```
  IA jogou na posicao 4  valor que ela da a essa jogada: 0.769 [################..]
     ^ posicao NOVA para ela: acabou de entrar na base de conhecimento.
```

**O "valor que ela dá a essa jogada"** é a nota que a rede atribuiu àquela casa.
Vai de **−1 a +1**:

| valor | significado |
|---|---|
| perto de **+1** | "essa jogada me faz ganhar" |
| perto de **0** | "essa jogada leva a empate" |
| perto de **−1** | "essa jogada me faz perder" |

Isso é o **Q-value**, e é exatamente o que a rede aprendeu a calcular. Poder ver
esse número é ver a rede pensando.

> Curiosidade: no modelo antigo esse número **não podia ser negativo** — a saída
> era softmax. Era matematicamente impossível a rede dizer "essa jogada é ruim".
> Foi o bug mais grave do treinamento antigo.

**As duas mensagens sobre a posição:**

- `posicao NOVA para ela` — é a primeira vez que ela vê esse tabuleiro. Acabou
  de entrar na base de conhecimento.
- `ela ja tinha visto esta posicao 3x antes` — a base está sendo reaproveitada.

**Quando aparece "experimentando":**

```
  IA jogou na posicao 7  (experimentando -- e assim que ela descobre jogadas novas)
```

Só acontece no modo `--do-zero`. Ela joga uma casa aleatória de propósito, para
**descobrir** jogadas que nunca tentou. Sem isso, ela repetiria eternamente a
primeira jogada que achou razoável.

---

## 6. Entendendo o relatório no fim da partida

```
  O QUE ELA APRENDEU NESTA PARTIDA
  ----------------------------------------------------------------
  jogadas dela analisadas ..... 4
  erros bobos nesta partida ... 1
     ! tinha 3 em linha e nao fechou: jogou 8, o certo era 6  (licao gravada)
  passos de treino ............ 400
  autoexame ................... 71.240% -> 72.115%  (+0.875)
  veredito .................... MELHOROU -- ela sabe mais do que sabia antes.
  ----------------------------------------------------------------
  placar acumulado ............ voce 3 x 5 IA  (2 empates)
  posicoes na base ............ 187
  licoes guardadas ............ 24
  base gravada em modelo/base_conhecimento.json
```

Linha por linha:

**`erros bobos nesta partida`** — ela relê a partida e procura dois erros que dá
para identificar **só com as regras do jogo**, sem precisar de oráculo:

- *"tinha 3 em linha e não fechou"* — o valor verdadeiro daquela jogada era +1;
- *"você ia fechar e ela não bloqueou"* — a jogada de bloqueio era a certa.

Cada um vira uma **lição gravada na base**. Errar a mesma coisa de novo pesa
mais: reincidência = mais repetições no treino.

**`autoexame`** — depois de aprender, ela se testa nas 4.520 posições de
referência que carrega na própria base. É um caderno de exercícios já resolvido
(gravado no treinamento), não consulta a oráculo durante o jogo.

**`veredito`** — o resultado da **trava de segurança**:

| veredito | o que significa |
|---|---|
| **MELHOROU** | ela sabe mais do que sabia antes desta partida |
| **MANTIDO** | nada a corrigir nesta partida |
| **REVERTIDO** | esta partida a deixaria pior, então foi **desfeita por inteiro** |
| **aplicado** | modo APRENDIZ: sem trava, ela está descobrindo o jogo |

A garantia é: **a cada partida ela fica melhor ou igual. Nunca pior.**

> **Por que "REVERTIDO" aparece tanto contra a rede treinada?**
> Porque ela já acerta as 4.520 posições do jogo — **não existe jogada melhor
> para ela aprender**. Qualquer mudança só pode piorar, então é desfeita. Não é
> defeito: é a trava funcionando. Para ver o aprendizado de verdade, use
> `--do-zero` (próxima seção).

---

## 7. Ver a IA aprendendo de verdade (do zero)

Esta é a demonstração do recurso novo:

```
node JogarContraIA.js --do-zero
```

Ela começa **sem saber nada** — pesos aleatórios, nenhuma noção do jogo. Vai
jogar muito mal nas primeiras partidas, e vai melhorando conforme você joga.

O que esperar:

| partidas | o que você vê |
|---|---|
| 1 a 5 | jogadas sem sentido; ela deixa de fechar 3 em linha |
| 5 a 20 | começa a fechar quando tem chance; ainda esquece de bloquear |
| 20 a 50 | passa a bloquear; o placar dela melhora |
| 50+ | jogo razoável, com erros ocasionais |

Medido contra um oponente simulado, partindo do zero: **50% → 71,9% de acerto
ótimo em 400 partidas**, com as lições de erro acumulando na base.

Dois detalhes importantes desse modo:

- **Ela não usa o professor nem o caderno de referência.** Aprende *só* das suas
  partidas — se usasse a referência, estaria aprendendo dela e não de você, e a
  demonstração seria uma fraude. A base guarda essa marca para sempre: se você
  fechar e voltar amanhã, ela continua no aprendizado puro.
- **Ela entra no modo APRENDIZ**, com taxas de aprendizado altas (quem não sabe
  nada precisa aprender rápido, e não há conhecimento a proteger).

A base anterior não é apagada — vai para `modelo/base_conhecimento.json.anterior`.

---

## 8. Consultar a base de conhecimento

```
node JogarContraIA.js --base
```

```
  BASE DE CONHECIMENTO DA IA
  modo de aprendizado ......... APRENDIZ  (nao sabia nada: aprende forte)
  ----------------------------------------------------------------
  partidas jogadas ............ 37
     vitorias dela ............ 12  (32%)
     empates .................. 9   (24%)
     derrotas dela ............ 16  (43%)
  posicoes que ela conhece .... 187
  jogadas vistas .............. 412
  passos de aprendizado ....... 18163
  licoes de erro na base ...... 24
     "deixou de ganhar" ....... 15
     "nao bloqueou" ........... 9
  experiencias na memoria ..... 412
  ensaio anti-esquecimento .... 4520 posicoes de referencia
  ----------------------------------------------------------------
```

Para ver **quais erros ela mais teve de aprender**:

```
node rede_neural/avaliarModelo.js
```

```
  AS LICOES QUE ELA MAIS TEVE DE APRENDER JOGANDO:
    deixou de ganhar     3x   posicao MM..O..O.  -> o certo era 2
    nao bloqueou         2x   posicao M.OO..M..  -> o certo era 1
  (M = peca dela, O = peca do adversario, . = casa livre)
```

Aquela `posicao MM..O..O.` se lê como o tabuleiro:

```
   M | M | .        peca dela | peca dela | livre
  ---+---+---
   . | O | .        livre | peca do adversario | livre
  ---+---+---
   . | O | .
```

Ela tinha `M M .` na primeira linha e não fechou na casa 2. Essa é a lição.

---

## 9. Medir se ela está ficando mais inteligente

```
node rede_neural/avaliarModelo.js
```

O avaliador passa por **todas as 4.520 posições possíveis** do jogo da velha —
é exaustivo e determinístico, não tem sorte no meio. Três medidas:

**1. Acerto ótimo.** Em quantas das 4.520 posições ela escolhe uma jogada
perfeita? Junto vem a contagem dos dois erros bobos.

**2. Contra o jogo perfeito.** Jogo da velha é **empate** quando os dois jogam
certo. Então o alvo aqui é **100% de empates e zero derrotas** — 50 partidas
começando e 50 sem começar.

**3. Contra o aleatório.** O teste fácil. Alvo: vencer quase sempre e **nunca**
perder.

O modelo que vem no repositório:

```
  1) ACERTO OTIMO nas 4520 posicoes possiveis do jogo:
       jogadas perfeitas ....... 4520 de 4520  (100.00%)
       ERRO BOBO "deixou de ganhar" ... 0
       ERRO BOBO "nao bloqueou" ....... 0

  2) CONTRA O JOGO PERFEITO -- o alvo e SO empate:
       TOTAL ........:   0 vitorias | 100 empates |   0 derrotas

  3) CONTRA O ALEATORIO -- o alvo e vencer e nunca perder:
       TOTAL ........:  92 vitorias |   8 empates |   0 derrotas

  VEREDITO: joga PERFEITO. Nao existe jogada melhor em nenhuma posicao.
```

**Você não vai conseguir ganhar dela. O máximo possível é empatar** — e isso não
é limitação sua: é o jogo da velha sendo um empate quando os dois jogam certo.

Para comparar com o modelo antigo e conferir o diagnóstico:

```
node rede_neural/avaliarModelo.js --antigo
```

```
       jogadas perfeitas ....... 2557 de 4520  (56.57%)
       ERRO BOBO "deixou de ganhar" ... 1150
       ERRO BOBO "nao bloqueou" ....... 598
  VEREDITO: com falhas -- 91 derrota(s) para o jogo perfeito, 1748 erro(s) bobo(s)
  Maior peso em valor absoluto: 2.018e+86
```

> As medidas 1 (acerto ótimo) e o número de erros bobos são **exaustivos e
> sempre iguais**. Já as medidas 2 e 3 são partidas, e o jogo perfeito sorteia
> entre jogadas empatadas — então o número de derrotas varia um pouco de uma
> execução para outra (91, 94...). O que não varia é a conclusão.

---

## 10. Opções do treinamento

### O treino tem duas fases

**Fase 1 — imitação (~16 s).** O `Minimax.js` resolve o jogo da velha por
completo e produz a tabela de valores **exata**. A rede aprende a reproduzir
essa tabela nas 4.520 posições. São duas etapas:

- *regressão* — aprende o valor de cada jogada; chega a ~97,7% e **empaca**;
- *correção de margem* — porque quem decide a jogada é o **argmax**, não o
  valor. Percorre só as posições ainda erradas e abre margem entre a jogada
  certa e a que a rede escolheu. **Com ela, chega a 100,00%.**

**Fase 2 — reforço.** DQN de verdade: auto-jogo, oponentes variados
(aleatório → ela mesma → perfeito), rede-alvo separada, Double DQN, e a IA
jogando dos dois lados.

### Ver o reforço aprendendo sozinho

```
node rede_neural/treinarIA.js --so-reforco
```

Sem professor nenhum, partindo de uma rede crua, o reforço sai de **~11% e chega
a ~88%** em 3.000 episódios. (O treinamento antigo empacava em 56% com 10.000
episódios.)

### Só o professor, se você tem pressa

```
node rede_neural/treinarIA.js --so-imitacao
```

Chega a 100% em ~16 segundos.

### O professor NÃO joga contra você

O `Minimax.js` aparece em três lugares, todos de treino ou medição: gerar os
alvos da Fase 1, ser o oponente forte nos episódios, e ser o juiz da avaliação.

Ele **não é importado** pelo `JogarContraIA.js` nem pelo
`AprendizadoOnline.js`. Na hora de jogar, quem decide é a rede — se fosse o
minimax, a "inteligência" não seria dela e não haveria nada aprendido.

---

## 11. Onde fica cada arquivo

```
JOGO_DA_VELHA_COM_REDE_NEURAL/
├── JogarContraIA.js              ← o jogo (com aprendizado online)
├── GUIA-DE-USO.md                ← este arquivo
├── LEIA-ME.md                    ← o que mudou e por quê (com os números)
├── package.json                  ← atalhos npm
│
├── rede_neural/
│   ├── JogoDaVelha.js            as regras, em um lugar só
│   ├── RedeNeural.js             a rede (forward, backward e SGD, tudo à mão)
│   ├── Minimax.js                o professor perfeito (só treino/avaliação)
│   ├── Avaliador.js              a régua: 4.520 posições + duelos
│   ├── AgenteTreinamento.js      o treinamento (2 fases)
│   ├── treinarIA.js              roda o treino e mede antes/depois
│   ├── AprendizadoOnline.js      aprender jogando + base de conhecimento
│   ├── avaliarModelo.js          "quão inteligente ela está agora?"
│   ├── modeloUtils.js            salvar/carregar (original, intocado)
│   ├── Camada.js, Neuronio.js    (originais, intocados)
│   └── *.BACKUP-ORIGINAL-*       os arquivos originais, preservados
│
└── modelo/
    ├── modelo_jogo_da_velha_v2.json    a rede treinada (versionada)
    ├── conjunto_referencia.json        as 4.520 posições do anti-esquecimento
    ├── base_conhecimento.json          o que ELA aprendeu jogando (não versionada)
    └── modelo_treinado_jogo_da_velha.json   o modelo ANTIGO, preservado
```

**A base de conhecimento não vai para o git** (está no `.gitignore`): ela é sua,
muda a cada partida, e é pessoal de cada máquina. Quem clonar o projeto começa
do modelo treinado e forma a própria base.

---

## 12. Problemas e dúvidas

**"Ela nunca melhora, só aparece MANTIDO ou REVERTIDO."**
Ela já acerta as 4.520 posições — não existe jogada melhor para aprender. Use
`node JogarContraIA.js --do-zero` para ver o aprendizado acontecendo.

**"Não consigo ganhar dela nunca."**
Correto, e esperado. Jogo da velha é empate quando os dois jogam certo. O melhor
resultado possível contra ela é **empate**.

**"Quero que ela jogue mais fraco para eu ganhar."**
Use `--do-zero`. Uma rede que está aprendendo perde partidas.

**"AVISO: nao consegui gravar a base."**
Antivírus ou indexador do Windows travou o arquivo. O jogo **não** para por
isso, e a gravação tem 3 tentativas. Se persistir, o aprendizado da sessão fica
só na memória. Não é grave, mas vale conferir se a pasta `modelo/` é gravável.

**"O treino demora quanto?"**
~1 minuto no padrão. `--rapido` em ~30 s. `--so-imitacao` em ~16 s.

**"Preciso rodar `npm install`?"**
Não. Não há dependência nenhuma.

**"Posso treinar mais para ela ficar melhor que 100%?"**
Não existe melhor que 100% — é acerto perfeito em todas as posições possíveis do
jogo. Daí em diante, o aprendizado só tem como **proteger** o que ela sabe.

---

## 13. Como voltar ao estado original

Todo arquivo alterado tem uma cópia do original ao lado, com o sufixo
`.BACKUP-ORIGINAL-25-07-2026.NAO-APAGAR` — incluindo o modelo antigo. Nada foi
sobrescrito: o modelo novo tem nome próprio (`modelo_jogo_da_velha_v2.json`).

Para restaurar um arquivo:

```
cd rede_neural
cp AgenteTreinamento.js.BACKUP-ORIGINAL-25-07-2026.NAO-APAGAR AgenteTreinamento.js
```

Para zerar apenas o que a IA aprendeu jogando (mantendo o treino):

```
rm modelo/base_conhecimento.json
```

---

*Autor: edersonfc7@gmail.com*
