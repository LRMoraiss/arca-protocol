# Protocolo ARCA — Web3 MVP
**Residência em TIC 29 – Web 3.0 | Unidade 1, Capítulo 5**
**Autor:** Luciano Rodrigues de Morais

🌍 **Deploy em Produção (Vercel):** [https://arca-mvp.vercel.app](https://arca-mvp.vercel.app)

---

## Problema que o protocolo resolve

O terceiro setor brasileiro enfrenta uma crise de confiança estrutural: financiadores não confiam em relatórios de OSCs, OSCs não têm histórico verificável de impacto, e o governo não tem visibilidade sobre o uso real dos recursos públicos destinados a projetos sociais.

O Protocolo ARCA resolve esse problema criando uma infraestrutura de reputação e governança descentralizada, onde:
- OSCs acumulam reputação on-chain por meio de badges NFT
- Financiadores fazem staking de tokens para participar da governança
- Decisões sobre aprovação de projetos são tomadas de forma transparente via DAO
- Recompensas de staking são ajustadas dinamicamente via oráculo Chainlink

---

## Arquitetura do Protocolo

```
┌─────────────────────────────────────────────────────────┐
│                    PROTOCOLO ARCA                        │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐                     │
│  │  ARCAToken  │───▶│ ARCAStaking │◀── Chainlink ETH/USD│
│  │   (ERC-20)  │    │  (Staking)  │     (Oráculo)       │
│  └──────┬──────┘    └─────────────┘                     │
│         │                                               │
│         ▼                                               │
│  ┌─────────────┐    ┌─────────────┐                     │
│  │  ARCABadge  │    │ARCAGovernance│                    │
│  │  (ERC-721)  │    │    (DAO)    │                     │
│  └─────────────┘    └─────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │
         ▼
   deploy.js (ethers.js) ──▶ Sepolia Testnet
```

### Fluxo de uso

1. **OSC se cadastra** → recebe Badge NFT (ERC-721) de nível Bronze
2. **Financiador compra ARC** (ERC-20) e faz **staking** → acumula recompensas
3. **Taxa de recompensa** é ajustada pelo preço ETH/USD via **Chainlink**
4. **Financiador vota** na DAO para aprovar projetos de impacto
5. **OSC cumpre milestone** → nível do Badge atualizado (Prata → Ouro)

---

## Contratos

| Contrato | Padrão | Descrição |
|---|---|---|
| `ARCAToken.sol` | ERC-20 (OpenZeppelin) | Token de governança e recompensa |
| `ARCABadge.sol` | ERC-721 (OpenZeppelin) | NFT de reputação para OSCs |
| `ARCAStaking.sol` | Custom + Chainlink | Staking com recompensa dinâmica |
| `ARCAGovernance.sol` | DAO simplificada | Votação e execução de propostas |

### Justificativa dos padrões ERC

- **ERC-20** para o token ARC: tokens fungíveis são o padrão para moedas de governança e recompensa. Compatível com todas as carteiras e exchanges.
- **ERC-721** (e não ERC-1155) para os badges: cada badge é único e pertence a uma única OSC. ERC-1155 seria mais adequado para itens em massa — não é o caso aqui.

---

## Segurança

- **ReentrancyGuard** (OpenZeppelin) em `stake()`, `unstake()` e `executarProposta()`
- **Checks-Effects-Interactions**: estado sempre atualizado antes de transferências externas
- **Ownable** (OpenZeppelin): controle de acesso em funções administrativas
- **immutable** em variáveis de configuração: owner, arcaToken, priceFeed
- **require()** com mensagens descritivas em todos os pontos de validação
- **Solidity ^0.8.24**: versão estável com proteção nativa contra overflow/underflow

---

## Deploy na Sepolia

### Pré-requisitos

```bash
npm install
```

### Variáveis de ambiente (.env)

```
PRIVATE_KEY=sua_chave_privada_aqui
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/sua_chave_alchemy
```

### Executar deploy

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

### Endereços deployados (Sepolia)

Deploy realizado em: `2026-04-20T03:53:53Z`

| Contrato | Endereço | Explorer |
|---|---|---|
| ARCAToken | `0x931Eb83a7E400C37DFE664D52aD240494651fCD3` | [Ver no Etherscan](https://sepolia.etherscan.io/address/0x931Eb83a7E400C37DFE664D52aD240494651fCD3) |
| ARCABadge | `0xf5C0863fAA42FBa9B9052329d3Fac5eB30B8807a` | [Ver no Etherscan](https://sepolia.etherscan.io/address/0xf5C0863fAA42FBa9B9052329d3Fac5eB30B8807a) |
| ARCAStaking | `0xc210A0661081C0F65e51Cee13825631a2c742A0E` | [Ver no Etherscan](https://sepolia.etherscan.io/address/0xc210A0661081C0F65e51Cee13825631a2c742A0E) |
| ARCAGovernance | `0x0D361Db7c0d1e2750f51d2E48B35b0Acb13C78A6` | [Ver no Etherscan](https://sepolia.etherscan.io/address/0x0D361Db7c0d1e2750f51d2E48B35b0Acb13C78A6) |

---

## Oráculo Chainlink

Feed utilizado: **ETH/USD** na Sepolia
Endereço: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

A taxa de recompensa de staking é ajustada dinamicamente:
- ETH > $3.000 → 1% ao ano
- ETH $2.000–$3.000 → 0,75% ao ano
- ETH < $2.000 → 0,5% ao ano

---

## Como testar no Remix

1. Acesse [remix.ethereum.org](https://remix.ethereum.org)
2. Importe os 4 arquivos `.sol`
3. Instale as dependências OpenZeppelin via npm plugin
4. Compile com Solidity 0.8.24
5. Em **Deploy & Run** → Environment: **Injected Provider (MetaMask)** → rede Sepolia
6. Deploy na ordem: ARCAToken → ARCABadge → ARCAStaking → ARCAGovernance

---

*Projeto desenvolvido para a Residência em TIC 29 – Web 3.0*
