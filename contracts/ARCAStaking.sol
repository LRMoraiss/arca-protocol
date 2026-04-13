// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Chainlink — interface para consumo de dados externos (oráculo)
// O oráculo Chainlink fornece preços de ativos em tempo real de forma
// descentralizada, eliminando a necessidade de confiar em uma única fonte.
// Aqui usamos o feed ETH/USD da Sepolia para ajustar dinamicamente
// a taxa de recompensa de staking conforme o preço de mercado.
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * ARCAStaking — Contrato de staking de tokens ARC com recompensa dinâmica.
 *
 * Funcionamento:
 * 1. Usuário faz stake de tokens ARC (lock por período mínimo)
 * 2. A cada bloco, recompensas são acumuladas proporcionalmente ao stake
 * 3. A taxa de recompensa é ajustada pelo preço ETH/USD via Chainlink:
 *    - ETH > $3000: taxa base (1%)
 *    - ETH > $2000: taxa reduzida (0.75%)
 *    - ETH <= $2000: taxa mínima (0.5%)
 * 4. Usuário pode sacar tokens + recompensas após período mínimo
 *
 * Segurança:
 * - ReentrancyGuard: previne ataques de reentrância no saque
 * - checks-effects-interactions: padrão aplicado em todas as funções de saque
 */
contract ARCAStaking is Ownable, ReentrancyGuard {

    IERC20 public immutable arcaToken;

    // Interface do oráculo Chainlink ETH/USD
    // Endereço do feed na Sepolia: 0x694AA1769357215DE4FAC081bf1f309aDC325306
    AggregatorV3Interface public immutable priceFeed;

    // Período mínimo de lock em segundos (7 dias)
    uint256 public constant LOCK_PERIOD = 7 days;

    // Precisão das taxas (base 10000 = 100%)
    uint256 public constant PRECISION = 10000;

    // Estrutura que armazena o stake de cada usuário
    struct StakeInfo {
        uint256 quantidade;       // Tokens em stake
        uint256 timestamp;        // Momento do depósito
        uint256 recompensaAcumulada; // Recompensas ainda não sacadas
        uint256 ultimoCalculo;    // Último bloco de cálculo de recompensa
    }

    // Mapping de endereço para informações de stake
    mapping(address => StakeInfo) public stakes;

    // Total de tokens em stake no contrato
    uint256 public totalStaked;

    event Staked(address indexed usuario, uint256 quantidade);
    event Unstaked(address indexed usuario, uint256 quantidade, uint256 recompensa);
    event RecompensaSacada(address indexed usuario, uint256 recompensa);

    constructor(address _arcaToken, address _priceFeed) Ownable(msg.sender) {
        arcaToken = IERC20(_arcaToken);
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /**
     * Deposita tokens ARC em stake.
     * O usuário deve primeiro aprovar este contrato para gastar seus tokens
     * (arcaToken.approve(enderecoStaking, quantidade)) antes de chamar stake().
     */
    function stake(uint256 quantidade) external nonReentrant {
        require(quantidade > 0, "Quantidade deve ser maior que zero.");

        // Calcula recompensas pendentes antes de atualizar o stake
        _atualizarRecompensa(msg.sender);

        // Transfere tokens do usuário para o contrato (padrão checks-effects-interactions)
        stakes[msg.sender].quantidade += quantidade;
        stakes[msg.sender].timestamp = block.timestamp;
        stakes[msg.sender].ultimoCalculo = block.timestamp;
        totalStaked += quantidade;

        // A transferência ocorre APÓS atualizar o estado (previne reentrância)
        require(arcaToken.transferFrom(msg.sender, address(this), quantidade), "Transferencia falhou.");

        emit Staked(msg.sender, quantidade);
    }

    /**
     * Saca tokens + recompensas após o período de lock.
     * nonReentrant garante que a função não pode ser chamada recursivamente
     * — proteção fundamental contra ataques de reentrância.
     */
    function unstake() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        require(info.quantidade > 0, "Nenhum token em stake.");
        require(
            block.timestamp >= info.timestamp + LOCK_PERIOD,
            "Periodo de lock ainda ativo."
        );

        _atualizarRecompensa(msg.sender);

        uint256 quantidade = info.quantidade;
        uint256 recompensa = info.recompensaAcumulada;

        // Zeramos o estado ANTES de transferir (padrão checks-effects-interactions)
        info.quantidade = 0;
        info.recompensaAcumulada = 0;
        totalStaked -= quantidade;

        // Transferências ocorrem por último
        require(arcaToken.transfer(msg.sender, quantidade), "Transferencia do principal falhou.");
        if (recompensa > 0) {
            require(arcaToken.transfer(msg.sender, recompensa), "Transferencia da recompensa falhou.");
        }

        emit Unstaked(msg.sender, quantidade, recompensa);
    }

    /**
     * Consulta o preço ETH/USD via oráculo Chainlink.
     * Retorna o preço com 8 casas decimais (padrão Chainlink).
     */
    function getPrecoETH() public view returns (int256) {
        (
            /* uint80 roundID */,
            int256 preco,
            /* uint startedAt */,
            /* uint timeStamp */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        return preco;
    }

    /**
     * Calcula a taxa de recompensa anual com base no preço ETH/USD.
     * Retorna um valor em base PRECISION (10000 = 100%).
     */
    function getTaxaRecompensa() public view returns (uint256) {
        int256 preco = getPrecoETH();
        // Chainlink retorna com 8 decimais: $3000 = 300000000000
        if (preco > 300000000000) {
            return 100; // 1% ao ano
        } else if (preco > 200000000000) {
            return 75;  // 0.75% ao ano
        } else {
            return 50;  // 0.5% ao ano
        }
    }

    /**
     * Calcula e acumula recompensas pendentes para um usuário.
     * Chamado internamente antes de qualquer operação de stake/unstake.
     */
    function _atualizarRecompensa(address usuario) internal {
        StakeInfo storage info = stakes[usuario];
        if (info.quantidade == 0) return;

        uint256 tempoDecorrido = block.timestamp - info.ultimoCalculo;
        uint256 taxa = getTaxaRecompensa();

        // Recompensa = quantidade * taxa * tempo / (365 dias * PRECISION)
        uint256 recompensa = (info.quantidade * taxa * tempoDecorrido) / (365 days * PRECISION);
        info.recompensaAcumulada += recompensa;
        info.ultimoCalculo = block.timestamp;
    }

    // Consulta recompensa pendente de um usuário (sem modificar estado)
    function recompensaPendente(address usuario) external view returns (uint256) {
        StakeInfo memory info = stakes[usuario];
        if (info.quantidade == 0) return 0;

        uint256 tempoDecorrido = block.timestamp - info.ultimoCalculo;
        uint256 taxa = getTaxaRecompensa();
        uint256 recompensa = (info.quantidade * taxa * tempoDecorrido) / (365 days * PRECISION);
        return info.recompensaAcumulada + recompensa;
    }
}
