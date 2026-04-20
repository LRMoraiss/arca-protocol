// deploy.js — Script de deploy do Protocolo ARCA na Sepolia via Hardhat
// Execute com: npx hardhat run scripts/deploy.js --network sepolia

const hre = require("hardhat");

const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=== Deploy do Protocolo ARCA na Sepolia ===");
  console.log("Deployer:", deployer.address);

  const saldo = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Saldo ETH:", hre.ethers.formatEther(saldo), "ETH\n");

  // 1. ARCAToken (ERC-20)
  console.log("1. Deployando ARCAToken...");
  const ARCAToken = await hre.ethers.getContractFactory("ARCAToken");
  const arcaToken = await ARCAToken.deploy(hre.ethers.parseEther("1000000"));
  await arcaToken.waitForDeployment();
  const arcaTokenAddr = await arcaToken.getAddress();
  console.log("ARCAToken deployado em:", arcaTokenAddr);

  // 2. ARCABadge (ERC-721)
  console.log("\n2. Deployando ARCABadge (NFT)...");
  const ARCABadge = await hre.ethers.getContractFactory("ARCABadge");
  const arcaBadge = await ARCABadge.deploy("ipfs://arca-badges/");
  await arcaBadge.waitForDeployment();
  const arcaBadgeAddr = await arcaBadge.getAddress();
  console.log("ARCABadge deployado em:", arcaBadgeAddr);

  // 3. ARCAStaking (com Chainlink)
  console.log("\n3. Deployando ARCAStaking...");
  const ARCAStaking = await hre.ethers.getContractFactory("ARCAStaking");
  const arcaStaking = await ARCAStaking.deploy(arcaTokenAddr, CHAINLINK_ETH_USD_SEPOLIA);
  await arcaStaking.waitForDeployment();
  const arcaStakingAddr = await arcaStaking.getAddress();
  console.log("ARCAStaking deployado em:", arcaStakingAddr);

  // 4. ARCAGovernance (DAO)
  console.log("\n4. Deployando ARCAGovernance...");
  const ARCAGovernance = await hre.ethers.getContractFactory("ARCAGovernance");
  const arcaGov = await ARCAGovernance.deploy(arcaTokenAddr);
  await arcaGov.waitForDeployment();
  const arcaGovAddr = await arcaGov.getAddress();
  console.log("ARCAGovernance deployado em:", arcaGovAddr);

  // 5. Mint de NFT Badge
  console.log("\n5. Mintando Badge NFT nivel 1 (Bronze)...");
  const txMint = await arcaBadge.mintBadge(deployer.address, 1);
  await txMint.wait();
  console.log("Badge mintado. Hash:", txMint.hash);

  // 6. Stake de tokens
  console.log("\n6. Fazendo stake de 500 tokens ARC...");
  const qtdStake = hre.ethers.parseEther("500");
  const txApprove = await arcaToken.approve(arcaStakingAddr, qtdStake);
  await txApprove.wait();
  console.log("Aprovacao concedida. Hash:", txApprove.hash);
  const txStake = await arcaStaking.stake(qtdStake);
  await txStake.wait();
  console.log("Stake realizado. Hash:", txStake.hash);

  // 7. Proposta na DAO
  console.log("\n7. Criando proposta na DAO...");
  const txProposta = await arcaGov.criarProposta("Aumentar limite de OSCs de 100 para 500");
  await txProposta.wait();
  console.log("Proposta criada. Hash:", txProposta.hash);
  const txVoto = await arcaGov.votar(1, true);
  await txVoto.wait();
  console.log("Voto SIM registrado. Hash:", txVoto.hash);

  // Resumo
  console.log("\n=== RESUMO DO DEPLOY ===");
  console.log("ARCAToken     :", arcaTokenAddr);
  console.log("ARCABadge     :", arcaBadgeAddr);
  console.log("ARCAStaking   :", arcaStakingAddr);
  console.log("ARCAGovernance:", arcaGovAddr);
  console.log("\nVerifique em: https://sepolia.etherscan.io");

  const fs = require("fs");
  const enderecos = {
    network: "sepolia",
    ARCAToken: arcaTokenAddr,
    ARCABadge: arcaBadgeAddr,
    ARCAStaking: arcaStakingAddr,
    ARCAGovernance: arcaGovAddr,
    chainlinkEthUsd: CHAINLINK_ETH_USD_SEPOLIA,
    deployedAt: new Date().toISOString(),
    explorer: "https://sepolia.etherscan.io",
  };
  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(enderecos, null, 2));
  console.log("Enderecos salvos em deployed-addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
