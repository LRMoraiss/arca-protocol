// ============================================================
// demo_apresentacao.js — Script de Demonstração do Protocolo ARCA
// Residência em TIC 29 – Web 3.0 | Luciano Rodrigues de Morais
//
// Executa ao vivo na Sepolia Testnet:
//   1. Leitura de estado inicial (saldos, preço ETH, staking)
//   2. Mint de NFT Badge (ARCABadge ERC-721)
//   3. Approve + Stake de tokens ARC (ARCAStaking)
//   4. Criação de proposta na DAO (ARCAGovernance)
//   5. Votação na proposta
//   6. Resumo final com links do Etherscan
//
// Execute com: node scripts/demo_apresentacao.js
// ============================================================

const { ethers } = require("ethers");
require("dotenv").config();

// ── Endereços dos contratos deployados na Sepolia ──────────────────────────
const ADDR = {
  ARCAToken:      "0x931Eb83a7E400C37DFE664D52aD240494651fCD3",
  ARCABadge:      "0xf5C0863fAA42FBa9B9052329d3Fac5eB30B8807a",
  ARCAStaking:    "0xc210A0661081C0F65e51Cee13825631a2c742A0E",
  ARCAGovernance: "0x0D361Db7c0d1e2750f51d2E48B35b0Acb13C78A6",
};

// ── ABIs mínimas ───────────────────────────────────────────────────────────
const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

const BADGE_ABI = [
  "function mintBadge(address osc, uint8 nivel) returns (uint256)",
  "function possuiBadge(address) view returns (bool)",
  "function badgeDeOSC(address) view returns (uint256)",
  "function nivelBadge(uint256) view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "event BadgeMintado(address indexed osc, uint256 tokenId, uint8 nivel)",
];

const STAKING_ABI = [
  "function stake(uint256 quantidade)",
  "function unstake()",
  "function stakes(address) view returns (uint256 quantidade, uint256 dataInicio)",
  "function recompensaPendente(address) view returns (uint256)",
  "function getPrecoETH() view returns (int256)",
  "function getTaxaRecompensa() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "event Staked(address indexed usuario, uint256 quantidade)",
];

const GOV_ABI = [
  "function criarProposta(string descricao)",
  "function votar(uint256 propostaId, bool apoio)",
  "function finalizarProposta(uint256 propostaId)",
  "function totalPropostas() view returns (uint256)",
  "function propostas(uint256) view returns (uint256 id, address proponente, string descricao, uint256 votosSim, uint256 votosNao, uint256 dataInicio, uint256 dataFim, uint8 status, bool executada)",
  "function votou(uint256, address) view returns (bool)",
  "event PropostaCriada(uint256 indexed id, address proponente, string descricao)",
  "event VotoRegistrado(uint256 indexed propostaId, address votante, bool apoio, uint256 peso)",
];

// ── Utilitários ────────────────────────────────────────────────────────────
const EXPLORER = "https://sepolia.etherscan.io";
const sep = "─".repeat(60);

function titulo(texto) {
  console.log("\n" + "═".repeat(60));
  console.log(`  ${texto}`);
  console.log("═".repeat(60));
}

function info(label, valor) {
  console.log(`  ${label.padEnd(30)} ${valor}`);
}

function txLink(hash) {
  return `${EXPLORER}/tx/${hash}`;
}

async function aguardar(tx, descricao) {
  process.stdout.write(`  ⏳ ${descricao}...`);
  const receipt = await tx.wait();
  console.log(` ✅ Confirmado! Bloco: ${receipt.blockNumber}`);
  console.log(`     🔗 ${txLink(receipt.hash)}`);
  return receipt;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  // Conectar à Sepolia
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const wallet   = signer.address;

  // Instanciar contratos
  const token   = new ethers.Contract(ADDR.ARCAToken,      TOKEN_ABI,   signer);
  const badge   = new ethers.Contract(ADDR.ARCABadge,      BADGE_ABI,   signer);
  const staking = new ethers.Contract(ADDR.ARCAStaking,    STAKING_ABI, signer);
  const gov     = new ethers.Contract(ADDR.ARCAGovernance, GOV_ABI,     signer);

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   PROTOCOLO ARCA — DEMONSTRAÇÃO AO VIVO (SEPOLIA)        ║");
  console.log("║   Residência em TIC 29 – Web 3.0                         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // ── ETAPA 0: Estado inicial ──────────────────────────────────────────────
  titulo("ETAPA 0 — Estado Inicial dos Contratos");

  const saldoETH    = await provider.getBalance(wallet);
  const saldoARC    = await token.balanceOf(wallet);
  const totalSupply = await token.totalSupply();
  const precoETH    = await staking.getPrecoETH();
  const taxaRecomp  = await staking.getTaxaRecompensa();
  const totalStaked = await staking.totalStaked();
  const possuiBadge = await badge.possuiBadge(wallet);
  const totalProp   = await gov.totalPropostas();

  info("Carteira:", wallet);
  info("Saldo ETH:", ethers.formatEther(saldoETH) + " ETH");
  info("Saldo ARC:", ethers.formatEther(saldoARC) + " ARC");
  info("Total Supply ARC:", ethers.formatEther(totalSupply) + " ARC");
  info("Preço ETH/USD (Chainlink):", "$" + (Number(precoETH) / 1e8).toFixed(2));
  info("Taxa de recompensa staking:", taxaRecomp.toString() + " ARC/bloco");
  info("Total em staking:", ethers.formatEther(totalStaked) + " ARC");
  info("Possui Badge NFT:", possuiBadge ? "✅ Sim" : "❌ Não");
  info("Total de propostas DAO:", totalProp.toString());

  // ── ETAPA 1: Mint de NFT Badge ───────────────────────────────────────────
  titulo("ETAPA 1 — Mint de NFT Badge (ERC-721)");
  console.log(`  Mintando Badge Nível 1 (Bronze) para: ${wallet}`);

  if (possuiBadge) {
    const tokenId = await badge.badgeDeOSC(wallet);
    const nivel   = await badge.nivelBadge(tokenId);
    console.log(`  ℹ️  Carteira já possui Badge NFT!`);
    info("  Token ID:", tokenId.toString());
    let nivelNome = "Ouro";
    if (nivel === 1n) nivelNome = "Bronze";
    else if (nivel === 2n) nivelNome = "Prata";
    info("  Nível:", nivelNome);
    console.log(`  🔗 ${EXPLORER}/token/${ADDR.ARCABadge}?a=${wallet}`);
  } else {
    const txMint = await badge.mintBadge(wallet, 1);
    await aguardar(txMint, "Mintando Badge Bronze");
    const tokenId = await badge.badgeDeOSC(wallet);
    info("  Token ID mintado:", tokenId.toString());
    console.log(`  🔗 NFT: ${EXPLORER}/token/${ADDR.ARCABadge}?a=${wallet}`);
  }

  // ── ETAPA 2: Approve + Stake de tokens ──────────────────────────────────
  titulo("ETAPA 2 — Stake de Tokens ARC (ARCAStaking + Chainlink)");

  const stakeAtual = await staking.stakes(wallet);
  if (stakeAtual.quantidade > 0n) {
    console.log(`  ℹ️  Já possui stake ativo!`);
    info("  Quantidade em stake:", ethers.formatEther(stakeAtual.quantidade) + " ARC");
    const recompPend = await staking.recompensaPendente(wallet);
    info("  Recompensa pendente:", ethers.formatEther(recompPend) + " ARC");
    console.log(`  🔗 ${EXPLORER}/address/${ADDR.ARCAStaking}`);
  } else {
    const STAKE_AMOUNT = ethers.parseEther("100"); // 100 ARC

    console.log(`  Aprovando ${ethers.formatEther(STAKE_AMOUNT)} ARC para o contrato de staking...`);
    const txApprove = await token.approve(ADDR.ARCAStaking, STAKE_AMOUNT);
    await aguardar(txApprove, "Aprovando allowance");

    console.log(`  Fazendo stake de ${ethers.formatEther(STAKE_AMOUNT)} ARC...`);
    const txStake = await staking.stake(STAKE_AMOUNT);
    await aguardar(txStake, "Executando stake");

    const stakeNovo = await staking.stakes(wallet);
    info("  Quantidade em stake:", ethers.formatEther(stakeNovo.quantidade) + " ARC");
    console.log(`  🔗 ${EXPLORER}/address/${ADDR.ARCAStaking}`);
  }

  // ── ETAPA 3: Criar proposta na DAO ──────────────────────────────────────
  titulo("ETAPA 3 — Criar Proposta na DAO (ARCAGovernance)");

  const descricao = "Aprovar financiamento de R$50.000 para OSC Esperança — milestone: 100 famílias atendidas";
  console.log(`  Proposta: "${descricao}"`);

  const txProposta = await gov.criarProposta(descricao);
  await aguardar(txProposta, "Criando proposta na DAO");

  const totalPropostasNovo = await gov.totalPropostas();
  const propostaId = totalPropostasNovo - 1n;
  info("  ID da proposta:", propostaId.toString());
  console.log(`  🔗 ${EXPLORER}/address/${ADDR.ARCAGovernance}`);

  // ── ETAPA 4: Votar na proposta ───────────────────────────────────────────
  titulo("ETAPA 4 — Votação na DAO");

  const jaVotou = await gov.votou(propostaId, wallet);
  if (jaVotou) {
    console.log(`  ℹ️  Já votou nesta proposta!`);
  } else {
    console.log(`  Votando SIM na proposta #${propostaId}...`);
    const txVoto = await gov.votar(propostaId, true);
    await aguardar(txVoto, "Registrando voto");
  }

  // Ler estado da proposta após voto
  const proposta = await gov.propostas(propostaId);
  info("  Votos SIM:", ethers.formatEther(proposta.votosSim) + " ARC");
  info("  Votos NÃO:", ethers.formatEther(proposta.votosNao) + " ARC");
  console.log(`  🔗 ${EXPLORER}/address/${ADDR.ARCAGovernance}`);

  // ── RESUMO FINAL ─────────────────────────────────────────────────────────
  titulo("RESUMO FINAL — Protocolo ARCA na Sepolia");

  console.log("\n  📋 CONTRATOS DEPLOYADOS:");
  info("  ARCAToken  (ERC-20):", ADDR.ARCAToken);
  info("  ARCABadge  (ERC-721):", ADDR.ARCABadge);
  info("  ARCAStaking:", ADDR.ARCAStaking);
  info("  ARCAGovernance (DAO):", ADDR.ARCAGovernance);

  console.log("\n  🔗 LINKS DO ETHERSCAN:");
  console.log(`     Token:      ${EXPLORER}/token/${ADDR.ARCAToken}`);
  console.log(`     Badge NFT:  ${EXPLORER}/token/${ADDR.ARCABadge}`);
  console.log(`     Staking:    ${EXPLORER}/address/${ADDR.ARCAStaking}`);
  console.log(`     Governance: ${EXPLORER}/address/${ADDR.ARCAGovernance}`);

  console.log("\n  ✅ DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("  GitHub: https://github.com/LRMoraiss/arca-protocol\n");
}

main().catch((err) => {
  console.error("\n❌ Erro:", err.message);
  process.exit(1);
});
