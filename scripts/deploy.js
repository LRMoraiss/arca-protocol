// deploy.js — Script de deploy e interação com o protocolo ARCA na Sepolia
// Utiliza ethers.js v6 para comunicação com a blockchain
// Execute com: node deploy.js

const { ethers } = require("ethers");
const fs = require("fs");

// =============================================================================
// CONFIGURAÇÃO — preencha antes de executar
// =============================================================================
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Nunca exponha a chave privada no código
const RPC_URL = process.env.SEPOLIA_RPC_URL;  // Ex: https://sepolia.infura.io/v3/SEU_ID

// Endereço do feed Chainlink ETH/USD na Sepolia
const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

// =============================================================================
// ABIs simplificados para interação
// =============================================================================
const ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
];

const NFT_ABI = [
  "function mintBadge(address osc, uint8 nivel) external",
  "function possuiBadge(address osc) external view returns (bool)",
  "function totalMintado() external view returns (uint256)",
];

const STAKING_ABI = [
  "function stake(uint256 quantidade) external",
  "function unstake() external",
  "function recompensaPendente(address usuario) external view returns (uint256)",
  "function getPrecoETH() external view returns (int256)",
  "function getTaxaRecompensa() external view returns (uint256)",
];

const GOVERNANCE_ABI = [
  "function criarProposta(string descricao) external",
  "function votar(uint256 propostaId, bool apoio) external",
  "function finalizarProposta(uint256 propostaId) external",
  "function totalPropostas() external view returns (uint256)",
];

// =============================================================================
// FUNÇÃO PRINCIPAL
// =============================================================================
async function main() {
  // Conecta ao provider da Sepolia via RPC
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("=== Deploy do Protocolo ARCA na Sepolia ===");
  console.log("Deployer:", signer.address);

  const saldo = await provider.getBalance(signer.address);
  console.log("Saldo ETH:", ethers.formatEther(saldo), "ETH\n");

  // ---------------------------------------------------------------------------
  // 1. Deploy do ARCAToken (ERC-20)
  // ---------------------------------------------------------------------------
  console.log("1. Deployando ARCAToken...");
  const ARCATokenFactory = new ethers.ContractFactory(
    ERC20_ABI,
    fs.readFileSync("./bytecode/ARCAToken.bin", "utf8"),
    signer
  );
  const arcaToken = await ARCATokenFactory.deploy(
    ethers.parseEther("1000000") // 1 milhão de tokens iniciais
  );
  await arcaToken.waitForDeployment();
  const arcaTokenAddr = await arcaToken.getAddress();
  console.log("ARCAToken deployado em:", arcaTokenAddr);

  // ---------------------------------------------------------------------------
  // 2. Deploy do ARCABadge (ERC-721)
  // ---------------------------------------------------------------------------
  console.log("\n2. Deployando ARCABadge (NFT)...");
  const ARCABadgeFactory = new ethers.ContractFactory(
    NFT_ABI,
    fs.readFileSync("./bytecode/ARCABadge.bin", "utf8"),
    signer
  );
  const arcaBadge = await ARCABadgeFactory.deploy("ipfs://arca-badges/");
  await arcaBadge.waitForDeployment();
  const arcaBadgeAddr = await arcaBadge.getAddress();
  console.log("ARCABadge deployado em:", arcaBadgeAddr);

  // ---------------------------------------------------------------------------
  // 3. Deploy do ARCAStaking com oráculo Chainlink
  // ---------------------------------------------------------------------------
  console.log("\n3. Deployando ARCAStaking (com Chainlink ETH/USD)...");
  const ARCAStakingFactory = new ethers.ContractFactory(
    STAKING_ABI,
    fs.readFileSync("./bytecode/ARCAStaking.bin", "utf8"),
    signer
  );
  const arcaStaking = await ARCAStakingFactory.deploy(
    arcaTokenAddr,
    CHAINLINK_ETH_USD_SEPOLIA
  );
  await arcaStaking.waitForDeployment();
  const arcaStakingAddr = await arcaStaking.getAddress();
  console.log("ARCAStaking deployado em:", arcaStakingAddr);

  // ---------------------------------------------------------------------------
  // 4. Deploy da ARCAGovernance (DAO)
  // ---------------------------------------------------------------------------
  console.log("\n4. Deployando ARCAGovernance (DAO)...");
  const ARCAGovernanceFactory = new ethers.ContractFactory(
    GOVERNANCE_ABI,
    fs.readFileSync("./bytecode/ARCAGovernance.bin", "utf8"),
    signer
  );
  const arcaGov = await ARCAGovernanceFactory.deploy(arcaTokenAddr);
  await arcaGov.waitForDeployment();
  const arcaGovAddr = await arcaGov.getAddress();
  console.log("ARCAGovernance deployado em:", arcaGovAddr);

  // ---------------------------------------------------------------------------
  // 5. Demonstração: Mint de NFT
  // ---------------------------------------------------------------------------
  console.log("\n5. Mintando Badge NFT para endereço de teste...");
  const enderecoOSC = signer.address; // Usando o próprio deployer como OSC de teste
  const txMint = await arcaBadge.mintBadge(enderecoOSC, 1);
  await txMint.wait();
  console.log("Badge Nivel 1 (Bronze) mintado para:", enderecoOSC);
  console.log("Total de badges mintados:", (await arcaBadge.totalMintado()).toString());

  // ---------------------------------------------------------------------------
  // 6. Demonstração: Stake de tokens
  // ---------------------------------------------------------------------------
  console.log("\n6. Fazendo stake de 500 tokens ARC...");
  const qtdStake = ethers.parseEther("500");

  // Aprovação necessária antes do stake
  const txApprove = await arcaToken.approve(arcaStakingAddr, qtdStake);
  await txApprove.wait();
  console.log("Aprovação concedida ao contrato de staking.");

  const txStake = await arcaStaking.stake(qtdStake);
  await txStake.wait();
  console.log("Stake realizado com sucesso!");

  const precoETH = await arcaStaking.getPrecoETH();
  const taxa = await arcaStaking.getTaxaRecompensa();
  console.log("Preco ETH/USD (Chainlink):", precoETH.toString());
  console.log("Taxa de recompensa atual:", taxa.toString(), "/ 10000");

  // ---------------------------------------------------------------------------
  // 7. Demonstração: Votação na DAO
  // ---------------------------------------------------------------------------
  console.log("\n7. Criando proposta na DAO...");
  const txProposta = await arcaGov.criarProposta(
    "Aumentar limite de OSCs registradas de 100 para 500"
  );
  await txProposta.wait();
  console.log("Proposta criada! Total de propostas:", (await arcaGov.totalPropostas()).toString());

  const txVoto = await arcaGov.votar(1, true); // Vota SIM na proposta 1
  await txVoto.wait();
  console.log("Voto SIM registrado na proposta 1.");

  // ---------------------------------------------------------------------------
  // 8. Resumo dos endereços deployados
  // ---------------------------------------------------------------------------
  console.log("\n=== RESUMO DO DEPLOY ===");
  console.log("ARCAToken    :", arcaTokenAddr);
  console.log("ARCABadge    :", arcaBadgeAddr);
  console.log("ARCAStaking  :", arcaStakingAddr);
  console.log("ARCAGovernance:", arcaGovAddr);
  console.log("\nVerifique em: https://sepolia.etherscan.io/address/<endereco>");

  // Salva os endereços em arquivo para referência
  const enderecos = {
    network: "sepolia",
    ARCAToken: arcaTokenAddr,
    ARCABadge: arcaBadgeAddr,
    ARCAStaking: arcaStakingAddr,
    ARCAGovernance: arcaGovAddr,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(enderecos, null, 2));
  console.log("\nEnderecos salvos em deployed-addresses.json");
}

main().catch((error) => {
  console.error("Erro no deploy:", error);
  process.exit(1);
});
