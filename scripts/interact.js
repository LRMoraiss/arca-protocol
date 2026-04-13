// interact.js — Script de interação com o protocolo ARCA já deployado
// Execute após o deploy: node scripts/interact.js
// Preencha o arquivo deployed-addresses.json com os endereços reais

require("dotenv").config();
const { ethers } = require("ethers");
const addresses = require("../deployed-addresses.json");

const ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

const NFT_ABI = [
  "function mintBadge(address osc, uint8 nivel) external",
  "function possuiBadge(address osc) external view returns (bool)",
  "function totalMintado() external view returns (uint256)",
  "function nivelBadge(uint256 tokenId) external view returns (uint8)",
  "function badgeDeOSC(address osc) external view returns (uint256)",
];

const STAKING_ABI = [
  "function stake(uint256 quantidade) external",
  "function unstake() external",
  "function recompensaPendente(address usuario) external view returns (uint256)",
  "function getPrecoETH() external view returns (int256)",
  "function getTaxaRecompensa() external view returns (uint256)",
  "function stakes(address usuario) external view returns (uint256, uint256, uint256, uint256)",
];

const GOVERNANCE_ABI = [
  "function criarProposta(string descricao) external",
  "function votar(uint256 propostaId, bool apoio) external",
  "function finalizarProposta(uint256 propostaId) external",
  "function totalPropostas() external view returns (uint256)",
  "function propostas(uint256 id) external view returns (uint256, address, string, uint256, uint256, uint256, uint256, uint8, bool)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("=== Interação com Protocolo ARCA ===");
  console.log("Wallet:", signer.address);

  const token = new ethers.Contract(addresses.ARCAToken, ERC20_ABI, signer);
  const badge = new ethers.Contract(addresses.ARCABadge, NFT_ABI, signer);
  const staking = new ethers.Contract(addresses.ARCAStaking, STAKING_ABI, signer);
  const gov = new ethers.Contract(addresses.ARCAGovernance, GOVERNANCE_ABI, signer);

  // Consulta saldo
  const saldo = await token.balanceOf(signer.address);
  console.log("\nSaldo ARC:", ethers.formatEther(saldo), "ARC");

  // Consulta preço ETH via Chainlink
  const preco = await staking.getPrecoETH();
  const taxa = await staking.getTaxaRecompensa();
  console.log("Preço ETH/USD (Chainlink):", (Number(preco) / 1e8).toFixed(2), "USD");
  console.log("Taxa de recompensa atual:", (Number(taxa) / 100).toFixed(2), "% ao ano");

  // Verifica se possui badge
  const temBadge = await badge.possuiBadge(signer.address);
  console.log("\nPossui Badge NFT:", temBadge);

  // Consulta recompensa pendente de staking
  const recompensa = await staking.recompensaPendente(signer.address);
  console.log("Recompensa pendente de staking:", ethers.formatEther(recompensa), "ARC");

  // Consulta total de propostas na DAO
  const totalProps = await gov.totalPropostas();
  console.log("\nTotal de propostas na DAO:", totalProps.toString());
}

main().catch(console.error);
