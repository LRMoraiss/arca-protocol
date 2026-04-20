// simulacao_arca.js — Simulação de staking e proposta na DAO do Protocolo ARCA
// Usa os contratos reais deployados na Sepolia Testnet
// Execute com: node docs/simulacao_arca.js

const { ethers } = require("ethers");
require("dotenv").config();

// ============================================================
// ENDEREÇOS DOS CONTRATOS DEPLOYADOS NA SEPOLIA
// ============================================================
const ENDERECOS = {
  ARCAToken:      "0x931Eb83a7E400C37DFE664D52aD240494651fCD3",
  ARCABadge:      "0xf5C0863fAA42FBa9B9052329d3Fac5eB30B8807a",
  ARCAStaking:    "0xc210A0661081C0F65e51Cee13825631a2c742A0E",
  ARCAGovernance: "0x0D361Db7c0d1e2750f51d2E48B35b0Acb13C78A6",
};

// ABIs mínimos para leitura e interação
const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];
const BADGE_ABI = [
  "function possuiBadge(address) view returns (bool)",
  "function totalMintado() view returns (uint256)",
  "function tokenIdDe(address) view returns (uint256)",
];
const STAKING_ABI = [
  "function stakes(address) view returns (uint256 quantidade, uint256 dataInicio)",
  "function recompensaPendente(address) view returns (uint256)",
  "function getPrecoETH() view returns (int256)",
  "function getTaxaRecompensa() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function stake(uint256 quantidade)",
];
const GOV_ABI = [
  "function totalPropostas() view returns (uint256)",
  "function propostas(uint256) view returns (uint256 id, address proponente, string descricao, uint256 votosSim, uint256 votosNao, uint256 dataInicio, uint256 dataFim, uint8 status, bool executada)",
  "function votou(uint256, address) view returns (bool)",
  "function criarProposta(string descricao)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const deployer = signer.address;

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║       SIMULAÇÃO DO PROTOCOLO ARCA — SEPOLIA TESTNET      ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log("Carteira:", deployer);

  // Instanciar contratos
  const token   = new ethers.Contract(ENDERECOS.ARCAToken,      TOKEN_ABI,   signer);
  const badge   = new ethers.Contract(ENDERECOS.ARCABadge,      BADGE_ABI,   signer);
  const staking = new ethers.Contract(ENDERECOS.ARCAStaking,    STAKING_ABI, signer);
  const gov     = new ethers.Contract(ENDERECOS.ARCAGovernance, GOV_ABI,     signer);

  // ─────────────────────────────────────────────────────────
  // BLOCO 1: Estado atual dos contratos
  // ─────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 BLOCO 1 — ESTADO ATUAL DOS CONTRATOS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const totalSupply  = await token.totalSupply();
  const saldoToken   = await token.balanceOf(deployer);
  const totalBadges  = await badge.totalMintado();
  const possuiBadge  = await badge.possuiBadge(deployer);
  const totalStaked  = await staking.totalStaked();
  const precoETH     = await staking.getPrecoETH();
  const taxaRecomp   = await staking.getTaxaRecompensa();
  const totalProps   = await gov.totalPropostas();

  console.log("🪙  ARCAToken");
  console.log(`    Total Supply  : ${ethers.formatEther(totalSupply)} ARC`);
  console.log(`    Saldo Deployer: ${ethers.formatEther(saldoToken)} ARC\n`);

  console.log("🏅  ARCABadge");
  console.log(`    Total Mintado : ${totalBadges} badges`);
  console.log(`    Deployer tem badge? ${possuiBadge ? "✅ Sim" : "❌ Não"}\n`);

  console.log("📈  ARCAStaking");
  console.log(`    Total em Stake: ${ethers.formatEther(totalStaked)} ARC`);
  console.log(`    Preço ETH/USD : $${(Number(precoETH) / 1e8).toFixed(2)}`);
  console.log(`    Taxa Recompensa: ${taxaRecomp}/10000 (${(Number(taxaRecomp)/100).toFixed(2)}% ao ano)\n`);

  console.log("🗳️   ARCAGovernance");
  console.log(`    Total Propostas: ${totalProps}\n`);

  // ─────────────────────────────────────────────────────────
  // BLOCO 2: Detalhes do stake atual do deployer
  // ─────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📈 BLOCO 2 — POSIÇÃO DE STAKING DO DEPLOYER");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const stakeInfo = await staking.stakes(deployer);
  const recompensa = await staking.recompensaPendente(deployer);

  if (stakeInfo.quantidade > 0n) {
    const dataInicio = new Date(Number(stakeInfo.dataInicio) * 1000);
    console.log(`    Tokens em Stake   : ${ethers.formatEther(stakeInfo.quantidade)} ARC`);
    console.log(`    Data de Início    : ${dataInicio.toISOString()}`);
    console.log(`    Recompensa Pendente: ${ethers.formatEther(recompensa)} ARC`);
  } else {
    console.log("    Nenhum stake ativo para este endereço.");
  }

  // ─────────────────────────────────────────────────────────
  // BLOCO 3: Detalhes das propostas na DAO
  // ─────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🗳️  BLOCO 3 — PROPOSTAS NA DAO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const STATUS = ["Ativa", "Aprovada", "Rejeitada", "Executada"];

  for (let i = 1; i <= Number(totalProps); i++) {
    const p = await gov.propostas(i);
    const jaVotou = await gov.votou(i, deployer);
    const dataFim = new Date(Number(p.dataFim) * 1000);
    console.log(`    Proposta #${p.id}`);
    console.log(`    Descrição  : ${p.descricao}`);
    console.log(`    Status     : ${STATUS[p.status]}`);
    console.log(`    Votos SIM  : ${ethers.formatEther(p.votosSim)} ARC`);
    console.log(`    Votos NÃO  : ${ethers.formatEther(p.votosNao)} ARC`);
    console.log(`    Encerra em : ${dataFim.toISOString()}`);
    console.log(`    Deployer votou? ${jaVotou ? "✅ Sim" : "❌ Não"}\n`);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Simulação concluída com sucesso!");
  console.log("🔍 Verifique as transações em: https://sepolia.etherscan.io");
  console.log(`   Deployer: https://sepolia.etherscan.io/address/${deployer}`);
}

main().catch(console.error);
