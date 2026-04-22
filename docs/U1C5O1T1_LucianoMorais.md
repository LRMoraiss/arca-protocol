# Protocolo ARCA — Relatório Técnico Final
## Desenvolvimento de Protocolo Web3 Completo com Deploy em Testnet

**Unidade 1 | Capítulo 5 — Residência em TIC 29 – Web 3.0**  
**Autor:** Luciano Rodrigues de Morais  
**Data:** 22/04/2026  
**Professor:** Bruno Portes  
**Repositório:** https://github.com/LRMoraiss/arca-protocol

---

## 1. Problema que o Protocolo Resolve

O terceiro setor brasileiro enfrenta uma crise de confiança estrutural: financiadores não confiam em relatórios de OSCs (Organizações da Sociedade Civil), OSCs não têm histórico verificável de impacto, e o governo não tem visibilidade sobre o uso real dos recursos públicos destinados a projetos sociais.

O **Protocolo ARCA** (Accountability, Reputação e Credibilidade em Ação) resolve esse problema criando uma infraestrutura de reputação e governança descentralizada, onde:

- OSCs acumulam reputação on-chain por meio de **badges NFT** verificáveis publicamente
- Financiadores fazem **staking de tokens ARC** para participar da governança
- Decisões sobre aprovação de projetos são tomadas de forma transparente via **DAO**
- Recompensas de staking são ajustadas dinamicamente via **oráculo Chainlink** (preço ETH/USD)

---

## 2. Arquitetura do Protocolo

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
└─────────────────────────────────────────────────────────┘
         │
         ▼
   deploy.js (ethers.js) ──▶ Sepolia Testnet
```

### Fluxo de Uso

1. **OSC se cadastra** → recebe Badge NFT (ERC-721) de nível Bronze
2. **Financiador compra ARC** (ERC-20) e faz **staking** → acumula recompensas
3. **Taxa de recompensa** é ajustada pelo preço ETH/USD via **Chainlink**
4. **Financiador vota** na DAO para aprovar projetos de impacto
5. **OSC cumpre milestone** → nível do Badge atualizado (Prata → Ouro)

---

## 3. Contratos Implementados

| Contrato | Padrão | Biblioteca | Descrição |
|---|---|---|---|
| `ARCAToken.sol` | ERC-20 | OpenZeppelin v5 | Token de governança e recompensa (ARC) |
| `ARCABadge.sol` | ERC-721 | OpenZeppelin v5 | NFT de reputação para OSCs |
| `ARCAStaking.sol` | Custom | OpenZeppelin + Chainlink | Staking com recompensa dinâmica via oráculo |
| `ARCAGovernance.sol` | DAO | OpenZeppelin v5 | Votação e execução de propostas |

### Justificativa dos Padrões ERC

- **ERC-20 (ARCAToken):** Escolhido por ser o padrão universal para tokens fungíveis. Permite integração com qualquer DEX, carteira e protocolo DeFi. A fungibilidade é essencial para o token de governança — cada ARC tem o mesmo valor e poder de voto.

- **ERC-721 (ARCABadge):** Escolhido em vez do ERC-1155 porque cada badge de reputação é único e individual — representa a identidade on-chain de uma OSC específica. A não-fungibilidade garante que reputações não possam ser transferidas ou divididas.

---

## 4. Implementação Técnica

### 4.1 ARCAToken (ERC-20)

- Supply máximo: **10.000.000 ARC**
- Supply inicial deployado: **1.000.000 ARC**
- Funções: `mint` (onlyOwner), `transfer`, `approve`, `balanceOf`
- Proteção: `Ownable` (OpenZeppelin) — apenas o owner pode mintar novos tokens

### 4.2 ARCABadge (ERC-721)

- Níveis de badge: **Bronze (1)**, **Prata (2)**, **Ouro (3)**
- Cada OSC pode ter apenas **1 badge ativo** (mapping `possuiBadge`)
- Funções: `mintBadge(address osc, uint8 nivel)`, `atualizarNivel`
- Proteção: `Ownable` — apenas o admin pode mintar/atualizar badges

### 4.3 ARCAStaking (Staking + Oráculo Chainlink)

- Período de lock: **7 dias** (LOCK_PERIOD)
- Taxa de recompensa dinâmica baseada no preço ETH/USD:
  - ETH > $3.000 → **100 ARC/bloco**
  - ETH > $2.000 → **75 ARC/bloco**
  - ETH ≤ $2.000 → **50 ARC/bloco**
- Oráculo: Chainlink ETH/USD na Sepolia (`0x694AA1769357215DE4FAC081bf1f309aDC325306`)
- Proteção: `ReentrancyGuard` (OpenZeppelin)

### 4.4 ARCAGovernance (DAO)

- Período de votação: **3 dias** por proposta
- Quórum: **10% do total de ARC em staking**
- Peso do voto: proporcional ao saldo ARC do votante
- Funções: `criarProposta`, `votar`, `finalizarProposta`, `executarProposta`
- Proteção: `ReentrancyGuard` + `Ownable`

---

## 5. Etapa de Segurança

### 5.1 Proteções Implementadas

| Proteção | Contrato | Mecanismo |
|---|---|---|
| Anti-reentrância | ARCAStaking, ARCAGovernance | `ReentrancyGuard` (OpenZeppelin) |
| Controle de acesso | Todos | `Ownable` (OpenZeppelin) |
| Overflow/Underflow | Todos | Solidity ^0.8.24 (built-in) |
| Oráculo seguro | ARCAStaking | Chainlink AggregatorV3Interface |
| Período de lock | ARCAStaking | `LOCK_PERIOD = 7 dias` |

### 5.2 Auditoria com Slither

A análise estática com Slither foi executada em todos os 4 contratos. **Nenhuma vulnerabilidade crítica ou de alta severidade foi encontrada.** Os principais alertas identificados:

- **Reentrancy (média)** no `ARCABadge.mintBadge`: mitigado pelo `onlyOwner`
- **Uso de `block.timestamp` (média)** no ARCAGovernance e ARCAStaking: aceitável para MVP
- **Literais grandes (baixa)** no ARCAStaking: questão de legibilidade, sem impacto funcional

---

## 6. Integração com Oráculo (Etapa 4)

O contrato `ARCAStaking` integra o **Chainlink Price Feed** para obter o preço ETH/USD em tempo real na Sepolia:

```solidity
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

AggregatorV3Interface internal priceFeed;

constructor(address _token) {
    // Chainlink ETH/USD na Sepolia
    priceFeed = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);
}

function getPrecoETH() public view returns (int256) {
    (, int256 preco,,,) = priceFeed.latestRoundData();
    return preco; // 8 decimais (ex: 241547000000 = $2415.47)
}
```

**Resultado ao vivo (22/04/2026):** Preço ETH/USD = **$2.415,47** → Taxa de recompensa: **75 ARC/bloco**

---

## 7. Integração Web3 (Etapa 5)

Foi criado o script `scripts/demo_apresentacao.js` usando **ethers.js** que demonstra ao vivo:

1. Leitura de estado dos contratos (saldos, preço ETH, staking ativo)
2. Mint de NFT Badge (ERC-721) para uma OSC
3. Approve + Stake de 100 ARC no ARCAStaking
4. Criação de proposta na DAO com descrição real
5. Votação na proposta com peso proporcional ao saldo ARC

O script foi executado com sucesso na Sepolia, gerando transações verificáveis no Etherscan.

---

## 8. Deploy em Testnet (Etapa 6)

Todos os 4 contratos foram deployados na **Sepolia Testnet** em 20/04/2026:

| Contrato | Endereço na Sepolia |
|---|---|
| ARCAToken (ERC-20) | `0x931Eb83a7E400C37DFE664D52aD240494651fCD3` |
| ARCABadge (ERC-721) | `0xf5C0863fAA42FBa9B9052329d3Fac5eB30B8807a` |
| ARCAStaking | `0xc210A0661081C0F65e51Cee13825631a2c742A0E` |
| ARCAGovernance (DAO) | `0x0D361Db7c0d1e2750f51d2E48B35b0Acb13C78A6` |

**Links do Etherscan:**
- Token: https://sepolia.etherscan.io/token/0x931Eb83a7E400C37DFE664D52aD240494651fCD3
- Badge NFT: https://sepolia.etherscan.io/token/0xf5C0863fAA42FBa9B9052329d3Fac5eB30B8807a
- Staking: https://sepolia.etherscan.io/address/0xc210A0661081C0F65e51Cee13825631a2c742A0E
- Governance: https://sepolia.etherscan.io/address/0x0D361Db7c0d1e2750f51d2E48B35b0Acb13C78A6

---

## 9. Estado Atual do Protocolo (22/04/2026)

| Métrica | Valor |
|---|---|
| Total Supply ARC | 1.000.000 ARC |
| ARC em staking | 500 ARC |
| Preço ETH/USD (Chainlink) | $2.415,47 |
| Taxa de recompensa | 75 ARC/bloco |
| Badges NFT mintados | 1 (Bronze) |
| Propostas na DAO | 2 |
| Votos SIM na proposta ativa | 999.500 ARC |

---

## 10. Estrutura do Repositório

```
arca-protocol/
├── contracts/
│   ├── ARCAToken.sol         # ERC-20 token
│   ├── ARCABadge.sol         # ERC-721 NFT
│   ├── ARCAStaking.sol       # Staking + Chainlink
│   └── ARCAGovernance.sol    # DAO
├── scripts/
│   ├── deploy.js             # Script de deploy (Hardhat + ethers.js)
│   ├── interact.js           # Script de interação básica
│   └── demo_apresentacao.js  # Script de demonstração ao vivo
├── docs/
│   ├── U1C5O1T1_LucianoMorais.pdf    # Este relatório
│   ├── Relatorio_Auditoria_Slither.pdf # Auditoria Slither
│   ├── arquitetura_arca.png           # Diagrama de arquitetura
│   └── Simulacao_ARCA_Resultado.md    # Resultado da simulação
├── deployed-addresses.json   # Endereços reais na Sepolia
├── hardhat.config.js         # Configuração Hardhat (evmVersion: cancun)
├── .env.example              # Exemplo de variáveis de ambiente
└── README.md                 # Documentação completa
```

---

## 11. Tecnologias Utilizadas

| Tecnologia | Versão | Uso |
|---|---|---|
| Solidity | ^0.8.24 | Linguagem dos contratos |
| Hardhat | v2 | Framework de desenvolvimento |
| OpenZeppelin | v5 | Contratos base (ERC-20, ERC-721, Ownable, ReentrancyGuard) |
| Chainlink | v0.8 | Oráculo de preço ETH/USD |
| ethers.js | v6 | Integração Web3 (scripts) |
| Node.js | v22 | Ambiente de execução |
| Sepolia Testnet | — | Rede de deploy |
| Alchemy | — | RPC Provider |

---

## Conclusão

O Protocolo ARCA foi desenvolvido com sucesso como MVP funcional de um protocolo descentralizado completo, integrando todos os conteúdos da Fase 2 Avançada: token ERC-20, NFT ERC-721, staking com oráculo Chainlink, governança DAO, auditoria de segurança e deploy em testnet. O protocolo resolve um problema real do terceiro setor brasileiro, demonstrando a aplicabilidade prática da tecnologia Web3 em contextos de impacto social.

**Repositório GitHub:** https://github.com/LRMoraiss/arca-protocol
