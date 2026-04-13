// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * ARCAGovernance — DAO simplificada para governança da plataforma ARCA.
 *
 * Mecanismo de governança:
 * 1. Qualquer holder de ARC com saldo mínimo pode criar uma proposta
 * 2. Holders votam SIM ou NAO com peso proporcional ao saldo de tokens
 * 3. Após o período de votação (3 dias), a proposta pode ser executada
 * 4. Proposta aprovada se: votos_sim > votos_nao E quórum mínimo atingido
 *
 * Este modelo é uma DAO simplificada — em produção, usaríamos o padrão
 * Governor da OpenZeppelin com timelock para maior segurança.
 *
 * Segurança:
 * - ReentrancyGuard em execute()
 * - Controle de acesso: somente holders com saldo mínimo propõem
 * - Voto único por endereço por proposta
 */
contract ARCAGovernance is Ownable, ReentrancyGuard {

    IERC20 public immutable arcaToken;

    // Saldo mínimo de ARC para criar uma proposta (1000 tokens)
    uint256 public constant SALDO_MINIMO_PROPOSTA = 1000 * 10 ** 18;

    // Quórum mínimo: 5% do total supply deve participar da votação
    uint256 public constant QUORUM_PERCENT = 5;

    // Período de votação: 3 dias
    uint256 public constant PERIODO_VOTACAO = 3 days;

    // Contador de propostas
    uint256 public totalPropostas;

    // Estados possíveis de uma proposta
    enum StatusProposta { Ativa, Aprovada, Rejeitada, Executada }

    // Estrutura de uma proposta
    struct Proposta {
        uint256 id;
        address proponente;
        string descricao;
        uint256 votosSim;
        uint256 votosNao;
        uint256 dataInicio;
        uint256 dataFim;
        StatusProposta status;
        bool executada;
    }

    // Mapping de ID para proposta
    mapping(uint256 => Proposta) public propostas;

    // Mapping de propostaId => endereço => votou? (evita voto duplo)
    mapping(uint256 => mapping(address => bool)) public votou;

    event PropostaCriada(uint256 indexed id, address proponente, string descricao);
    event VotoRegistrado(uint256 indexed propostaId, address votante, bool apoio, uint256 peso);
    event PropostaFinalizada(uint256 indexed id, StatusProposta status);

    constructor(address _arcaToken) Ownable(msg.sender) {
        arcaToken = IERC20(_arcaToken);
    }

    /**
     * Cria uma nova proposta de governança.
     * O proponente deve ter saldo mínimo de ARC para evitar spam.
     */
    function criarProposta(string memory descricao) external {
        require(
            arcaToken.balanceOf(msg.sender) >= SALDO_MINIMO_PROPOSTA,
            "Saldo insuficiente para criar proposta."
        );
        require(bytes(descricao).length > 0, "Descricao nao pode ser vazia.");

        totalPropostas++;

        propostas[totalPropostas] = Proposta({
            id: totalPropostas,
            proponente: msg.sender,
            descricao: descricao,
            votosSim: 0,
            votosNao: 0,
            dataInicio: block.timestamp,
            dataFim: block.timestamp + PERIODO_VOTACAO,
            status: StatusProposta.Ativa,
            executada: false
        });

        emit PropostaCriada(totalPropostas, msg.sender, descricao);
    }

    /**
     * Registra um voto em uma proposta ativa.
     * O peso do voto é proporcional ao saldo de ARC do votante.
     * Cada endereço pode votar apenas uma vez por proposta.
     */
    function votar(uint256 propostaId, bool apoio) external {
        Proposta storage p = propostas[propostaId];

        require(p.id != 0, "Proposta nao existe.");
        require(p.status == StatusProposta.Ativa, "Proposta nao esta ativa.");
        require(block.timestamp <= p.dataFim, "Periodo de votacao encerrado.");
        require(!votou[propostaId][msg.sender], "Voto duplicado: ja votou nesta proposta.");

        uint256 peso = arcaToken.balanceOf(msg.sender);
        require(peso > 0, "Sem tokens ARC para votar.");

        votou[propostaId][msg.sender] = true;

        if (apoio) {
            p.votosSim += peso;
        } else {
            p.votosNao += peso;
        }

        emit VotoRegistrado(propostaId, msg.sender, apoio, peso);
    }

    /**
     * Finaliza uma proposta após o período de votação.
     * Verifica quórum e maioria para determinar aprovação ou rejeição.
     */
    function finalizarProposta(uint256 propostaId) external {
        Proposta storage p = propostas[propostaId];

        require(p.id != 0, "Proposta nao existe.");
        require(p.status == StatusProposta.Ativa, "Proposta ja foi finalizada.");
        require(block.timestamp > p.dataFim, "Periodo de votacao ainda em andamento.");

        uint256 totalVotos = p.votosSim + p.votosNao;
        uint256 totalSupply = arcaToken.totalSupply();
        uint256 quorumNecessario = (totalSupply * QUORUM_PERCENT) / 100;

        if (totalVotos >= quorumNecessario && p.votosSim > p.votosNao) {
            p.status = StatusProposta.Aprovada;
        } else {
            p.status = StatusProposta.Rejeitada;
        }

        emit PropostaFinalizada(propostaId, p.status);
    }

    /**
     * Marca uma proposta aprovada como executada.
     * Em uma DAO real, aqui seria feita a execução on-chain da proposta
     * (ex: chamar outra função, liberar fundos, etc.) via delegatecall.
     */
    function executarProposta(uint256 propostaId) external nonReentrant onlyOwner {
        Proposta storage p = propostas[propostaId];

        require(p.status == StatusProposta.Aprovada, "Proposta nao foi aprovada.");
        require(!p.executada, "Proposta ja executada.");

        p.executada = true;
        p.status = StatusProposta.Executada;

        emit PropostaFinalizada(propostaId, StatusProposta.Executada);
    }
}
