// ── Endereços dos Contratos (Sepolia) ──────────────────────────────────────
const ADDR = {
  ARCAToken: "0x931Eb83a7E400C37DFE664D52aD240494651fCD3",
  ARCABadge: "0xf5C0863fAA42FBa9B9052329d3Fac5eB30B8807a",
  ARCAStaking: "0xc210A0661081C0F65e51Cee13825631a2c742A0E",
  ARCAGovernance: "0x0D361Db7c0d1e2750f51d2E48B35b0Acb13C78A6"
};

// ── ABIs ───────────────────────────────────────────────────────────────────
const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];

const BADGE_ABI = [
  "function possuiBadge(address) view returns (bool)",
  "function badgeDeOSC(address) view returns (uint256)",
  "function nivelBadge(uint256) view returns (uint8)"
];

const STAKING_ABI = [
  "function stakes(address) view returns (uint256 quantidade, uint256 dataInicio)",
  "function getPrecoETH() view returns (int256)",
  "function totalStaked() view returns (uint256)"
];

const GOV_ABI = [
  "function totalPropostas() view returns (uint256)"
];

// ── Elementos DOM ─────────────────────────────────────────────────────────
const btnConnect = document.getElementById("btn-connect");
const networkLed = document.getElementById("network-led");
const networkName = document.getElementById("network-name");
const walletAddressEl = document.getElementById("wallet-address");
const badgeLevelEl = document.getElementById("badge-level");

const arcBalanceEl = document.getElementById("arc-balance");
const arcSupplyEl = document.getElementById("arc-supply");

const userStakeEl = document.getElementById("user-stake");
const totalStakedEl = document.getElementById("total-staked");
const ethPriceEl = document.getElementById("eth-price");

const totalProposalsEl = document.getElementById("total-proposals");
const lastProposalIdEl = document.getElementById("last-proposal-id");

const ethBalanceEl = document.getElementById("eth-balance");

let provider, signer, userAddress;

// ── Funções Principais ─────────────────────────────────────────────────────

async function connectWallet() {
  if (globalThis.ethereum === undefined) {
    alert("MetaMask não detectada! Instale a extensão para continuar.");
    return;
  }

  try {
    btnConnect.innerText = "CONECTANDO...";
    
    // Solicitar conexão
    const accounts = await globalThis.ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    
    // Configurar provider do Ethers.js
    provider = new ethers.BrowserProvider(globalThis.ethereum);
    signer = await provider.getSigner();

    // Checar rede e forçar mudança para Sepolia
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) {
      try {
        await globalThis.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // 11155111 em Hexadecimal
        });
      } catch (switchError) {
        // O código 4902 indica que a rede não está adicionada ou está oculta na MetaMask
        if (switchError.code === 4902 || switchError.code === -32603) {
          try {
            await globalThis.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Testnet',
                  rpcUrls: ['https://rpc.sepolia.org'],
                  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }
              ]
            });
          } catch (addError) {
            console.error("Erro ao adicionar a rede", addError);
            btnConnect.innerText = "ERRO DE REDE";
            return;
          }
        } else {
          console.error("Erro ao mudar a rede", switchError);
          btnConnect.innerText = "ERRO DE REDE";
          return;
        }
      }
      // Atualiza a instância do provider após a mudança ou adição
      provider = new ethers.BrowserProvider(globalThis.ethereum);
      signer = await provider.getSigner();
    }

    // Atualizar UI Status
    networkLed.classList.remove("off");
    networkLed.classList.add("on");
    networkName.innerText = "SEPOLIA ONLINE";
    networkName.classList.add("text-green");
    btnConnect.style.display = "none";
    
    walletAddressEl.innerText = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
    walletAddressEl.classList.add("text-green");

    // Carregar dados
    await loadData();

  } catch (error) {
    console.error("Erro ao conectar", error);
    btnConnect.innerText = "TENTAR NOVAMENTE";
  }
}

async function loadData() {
  try {
    // 1. Saldo ETH
    const ethBal = await provider.getBalance(userAddress);
    ethBalanceEl.innerText = Number(ethers.formatEther(ethBal)).toFixed(4) + " ETH";

    // Instanciar Contratos
    const token = new ethers.Contract(ADDR.ARCAToken, TOKEN_ABI, provider);
    const badge = new ethers.Contract(ADDR.ARCABadge, BADGE_ABI, provider);
    const staking = new ethers.Contract(ADDR.ARCAStaking, STAKING_ABI, provider);
    const gov = new ethers.Contract(ADDR.ARCAGovernance, GOV_ABI, provider);

    // 2. ARCAToken Stats
    const arcBal = await token.balanceOf(userAddress);
    const arcSupply = await token.totalSupply();
    arcBalanceEl.innerText = Number(ethers.formatEther(arcBal)).toLocaleString();
    arcSupplyEl.innerText = Number(ethers.formatEther(arcSupply)).toLocaleString();

    // 3. ARCABadge Status
    const hasBadge = await badge.possuiBadge(userAddress);
    if (hasBadge) {
      const tokenId = await badge.badgeDeOSC(userAddress);
      const nivel = await badge.nivelBadge(tokenId);
      
      let nivelStr = "OURO";
      if (nivel === 1n) nivelStr = "BRONZE";
      else if (nivel === 2n) nivelStr = "PRATA";

      badgeLevelEl.innerText = `${nivelStr} (ID: ${tokenId})`;
      badgeLevelEl.className = "mono-text data-value text-green";
    } else {
      badgeLevelEl.innerText = "NENHUM";
    }

    // 4. ARCAStaking Stats
    const stakeInfo = await staking.stakes(userAddress);
    const totalStkd = await staking.totalStaked();
    const ethOraclePrice = await staking.getPrecoETH();

    userStakeEl.innerText = Number(ethers.formatEther(stakeInfo.quantidade)).toLocaleString() + " ARC";
    totalStakedEl.innerText = Number(ethers.formatEther(totalStkd)).toLocaleString() + " ARC";
    ethPriceEl.innerText = "$" + (Number(ethOraclePrice) / 1e8).toLocaleString(undefined, {minimumFractionDigits: 2});

    // 5. ARCAGovernance Stats
    const totalProps = await gov.totalPropostas();
    totalProposalsEl.innerText = totalProps.toString();
    if (totalProps > 0n) {
      lastProposalIdEl.innerText = "#" + (totalProps - 1n).toString();
    } else {
      lastProposalIdEl.innerText = "N/A";
    }

  } catch (error) {
    console.error("Erro ao ler contratos", error);
  }
}

// ── Eventos ────────────────────────────────────────────────────────────────
btnConnect.addEventListener("click", connectWallet);

// Lidar com mudança de conta/rede no MetaMask
if (globalThis.ethereum) {
  globalThis.ethereum.on('accountsChanged', () => globalThis.location.reload());
  globalThis.ethereum.on('chainChanged', () => globalThis.location.reload());
}

// Lidar com o sistema de Abas
const tabs = document.querySelectorAll('.nav-item');
const contents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active de todas as abas
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));

    // Adiciona active na aba clicada
    tab.classList.add('active');
    const targetId = tab.getAttribute('data-tab');
    document.getElementById(targetId).classList.add('active');
  });
});
