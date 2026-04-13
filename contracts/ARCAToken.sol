// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Importamos o padrão ERC-20 da OpenZeppelin — biblioteca auditada e amplamente
// utilizada na indústria para implementação segura de tokens fungíveis.
// ERC-20 define a interface padrão para tokens intercambiáveis na rede Ethereum.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * ARCAToken — Token de governança e recompensa da plataforma ARCA.
 *
 * O token ARCA (ARC) é utilizado para:
 * - Recompensar OSCs que cumprem milestones de impacto social
 * - Participar de votações na DAO de governança
 * - Fazer staking para obter recompensas adicionais
 *
 * Por herdar de ERC20 (OpenZeppelin), o contrato já implementa automaticamente:
 * transfer, transferFrom, approve, allowance, balanceOf, totalSupply.
 */
contract ARCAToken is ERC20, Ownable {

    // Supply máximo de tokens — 10 milhões de ARC
    // Isso limita a inflação e protege o valor do token a longo prazo
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10 ** 18;

    // Evento emitido a cada mint de novos tokens
    event TokensMinted(address indexed destinatario, uint256 quantidade);

    // O construtor define o nome, símbolo e minteia o supply inicial para o owner
    // O owner será o contrato de Staking/Governança após o deploy
    constructor(uint256 supplyInicial) ERC20("ARCA Token", "ARC") Ownable(msg.sender) {
        require(supplyInicial <= MAX_SUPPLY, "Supply inicial excede o maximo permitido.");
        _mint(msg.sender, supplyInicial);
        emit TokensMinted(msg.sender, supplyInicial);
    }

    /**
     * Permite ao owner mintar novos tokens (ex: recompensas de staking).
     * Somente o owner pode chamar — controle de acesso via Ownable (OpenZeppelin).
     * O require garante que o MAX_SUPPLY nunca seja ultrapassado.
     */
    function mint(address destinatario, uint256 quantidade) external onlyOwner {
        require(totalSupply() + quantidade <= MAX_SUPPLY, "Mint excederia o supply maximo.");
        _mint(destinatario, quantidade);
        emit TokensMinted(destinatario, quantidade);
    }
}
