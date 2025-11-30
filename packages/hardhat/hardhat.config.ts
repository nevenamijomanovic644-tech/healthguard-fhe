require("@fhevm/hardhat-plugin");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("@typechain/hardhat");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("solidity-coverage");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x1e79472729dbae25af82ca6a8d14a8f34ddf722ca150738d1974c947eb353488";
const RPC_URL = process.env.RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/PdDY0FCflhQnCiLhEwxih";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: !!process.env.REPORT_GAS,
  },
  networks: {
    hardhat: {
      accounts: [{ privateKey: PRIVATE_KEY, balance: "10000000000000000000000" }],
      chainId: 31337,
    },
    sepolia: {
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      url: RPC_URL,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      metadata: { bytecodeHash: "none" },
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

module.exports = config;
