// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ERC-721 é o padrão para tokens não-fungíveis (NFTs) — cada token é único
// e possui um ID próprio. Usamos ERC-721 (e não ERC-1155) pois cada badge
// de reputação é individual e intransferível entre OSCs.
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * ARCABadge — NFT de reputação para OSCs na plataforma ARCA.
 *
 * Cada OSC que atinge um nível de impacto social recebe um Badge NFT
 * que certifica sua reputação on-chain. Os badges são:
 * - Nível 1 (Bronze): 1 milestone cumprido
 * - Nível 2 (Prata):  5 milestones cumpridos
 * - Nível 3 (Ouro):  10 milestones cumpridos
 *
 * O NFT funciona como certificado digital imutável — financiadores podem
 * verificar a reputação de qualquer OSC consultando seus badges na blockchain.
 */
contract ARCABadge is ERC721, Ownable {

    // Contador de IDs — cada NFT mintado recebe um ID único sequencial
    uint256 private _tokenIdCounter;

    // Mapping de tokenId para o nível do badge (1, 2 ou 3)
    mapping(uint256 => uint8) public nivelBadge;

    // Mapping de endereço para tokenId — cada OSC pode ter apenas 1 badge ativo
    mapping(address => uint256) public badgeDeOSC;

    // Mapping para verificar se uma OSC já possui badge
    mapping(address => bool) public possuiBadge;

    // URI base para metadados dos NFTs (IPFS ou servidor centralizado)
    string private _baseTokenURI;

    event BadgeMintado(address indexed osc, uint256 tokenId, uint8 nivel);
    event NivelAtualizado(uint256 indexed tokenId, uint8 novoNivel);

    constructor(string memory baseURI) ERC721("ARCA Badge", "ARCAB") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    /**
     * Minteia um badge para uma OSC.
     * Somente o owner (contrato de governança ou admin) pode mintar.
     * Cada OSC recebe apenas 1 badge — se já possui, atualiza o nível.
     */
    function mintBadge(address osc, uint8 nivel) external onlyOwner {
        require(nivel >= 1 && nivel <= 3, "Nivel invalido: deve ser 1, 2 ou 3.");
        require(!possuiBadge[osc], "OSC ja possui badge. Use atualizarNivel().");

        _tokenIdCounter++;
        uint256 novoId = _tokenIdCounter;

        _safeMint(osc, novoId);
        nivelBadge[novoId] = nivel;
        badgeDeOSC[osc] = novoId;
        possuiBadge[osc] = true;

        emit BadgeMintado(osc, novoId, nivel);
    }

    /**
     * Atualiza o nível de um badge existente quando a OSC evolui.
     * Reutiliza o mesmo NFT — apenas o atributo de nível muda.
     */
    function atualizarNivel(address osc, uint8 novoNivel) external onlyOwner {
        require(possuiBadge[osc], "OSC nao possui badge registrado.");
        require(novoNivel >= 1 && novoNivel <= 3, "Nivel invalido.");

        uint256 tokenId = badgeDeOSC[osc];
        nivelBadge[tokenId] = novoNivel;

        emit NivelAtualizado(tokenId, novoNivel);
    }

    // Retorna a URI base para metadados — usada internamente pelo ERC-721
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // Retorna o total de badges mintados
    function totalMintado() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
