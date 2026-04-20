# Simulação do Protocolo ARCA — Sepolia Testnet

**Data:** 20 de Abril de 2026
**Rede:** Ethereum Sepolia Testnet
**Carteira do Deployer:** `0x38c3935bae4Be3AD9c9305987B1C5AAd91aE1707`

Este documento apresenta os resultados da simulação ao vivo dos contratos inteligentes do Protocolo ARCA, consultando os dados reais registrados na blockchain da Sepolia Testnet.

---

## Bloco 1 — Estado Atual dos Contratos

### ARCAToken (ERC-20)

| Campo | Valor |
|---|---|
| Total Supply | `1.000.000,00 ARC` |
| Saldo do Deployer | `999.500,00 ARC` |
| Tokens em Staking | `500,00 ARC` |

O fornecimento total de 1 milhão de tokens ARC foi mintado no momento do deploy. Desse total, 500 tokens foram colocados em staking pelo deployer, resultando em um saldo livre de 999.500 ARC.

### ARCABadge (ERC-721 Soulbound)

| Campo | Valor |
|---|---|
| Total de Badges Mintados | `1` |
| Deployer possui Badge? | ✅ Sim |

Um badge NFT de reputação foi emitido durante o deploy para o endereço do deployer, simulando o cadastro de uma OSC no protocolo.

### ARCAStaking

| Campo | Valor |
|---|---|
| Total em Stake | `500,00 ARC` |
| Preço ETH/USD (Chainlink) | `$2.278,58` |
| Taxa de Recompensa | `75 / 10.000 = 0,75% ao ano` |

O oráculo da Chainlink retornou o preço de **$2.278,58** para o par ETH/USD no momento da consulta. Como este valor se enquadra na faixa entre $2.000 e $3.000, a taxa de recompensa dinâmica do protocolo foi automaticamente ajustada para **0,75% ao ano**, conforme a lógica implementada no contrato `ARCAStaking`.

---

## Bloco 2 — Posição de Staking do Deployer

| Campo | Valor |
|---|---|
| Tokens em Stake | `500,00 ARC` |
| Data de Início do Stake | `2026-04-20T03:53:24Z` |
| Recompensa Pendente | `~0,00003 ARC` |

A recompensa pendente é calculada de forma proporcional ao tempo decorrido desde o início do stake. Como o deploy foi realizado há poucos minutos, o valor acumulado ainda é mínimo. Com o passar do tempo, esta recompensa crescerá de acordo com a taxa de 0,75% ao ano sobre os 500 ARC em stake.

**Cálculo estimado:**
- 500 ARC × 0,75% ao ano = 3,75 ARC por ano
- 3,75 ARC ÷ 365 dias = ~0,01027 ARC por dia
- ~0,01027 ARC ÷ 24 horas = ~0,000428 ARC por hora

---

## Bloco 3 — Propostas na DAO

### Proposta #1: Aumentar limite de OSCs

| Campo | Valor |
|---|---|
| ID | `1` |
| Descrição | `"Aumentar limite de OSCs de 100 para 500"` |
| Status | `Ativa` |
| Votos SIM | `999.500,00 ARC` |
| Votos NÃO | `0,00 ARC` |
| Encerramento | `2026-04-23T03:53:36Z` (3 dias após o deploy) |
| Deployer votou? | ✅ Sim |

A proposta foi criada durante o deploy e o deployer já registrou seu voto favorável com um peso de **999.500 ARC** (equivalente ao seu saldo de tokens no momento da votação). O período de votação se encerra em 23 de Abril de 2026.

Para que a proposta seja aprovada, é necessário atingir o quórum mínimo de **5% do total supply** (50.000 ARC). Com os 999.500 ARC já votados a favor, o quórum está amplamente satisfeito. Após o encerramento do período, qualquer endereço poderá chamar a função `finalizarProposta(1)` para registrar a aprovação na blockchain.

---

## Links no Etherscan (Sepolia)

| Contrato | Link |
|---|---|
| ARCAToken | [0x931Eb83...](https://sepolia.etherscan.io/address/0x931Eb83a7E400C37DFE664D52aD240494651fCD3) |
| ARCABadge | [0xf5C0863...](https://sepolia.etherscan.io/address/0xf5C0863fAA42FBa9B9052329d3Fac5eB30B8807a) |
| ARCAStaking | [0xc210A06...](https://sepolia.etherscan.io/address/0xc210A0661081C0F65e51Cee13825631a2c742A0E) |
| ARCAGovernance | [0x0D361Db...](https://sepolia.etherscan.io/address/0x0D361Db7c0d1e2750f51d2E48B35b0Acb13C78A6) |
| Deployer | [0x38c3935...](https://sepolia.etherscan.io/address/0x38c3935bae4Be3AD9c9305987B1C5AAd91aE1707) |
