import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@cofhe/hardhat-plugin";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  cofhe: {
    logMocks: true,
    gasWarning: true,
  },
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  defaultNetwork: "hardhat",
  // eth-sepolia and localcofhe are auto-injected by @cofhe/hardhat-plugin
  etherscan: {
    apiKey: {
      "eth-sepolia": process.env.ETHERSCAN_API_KEY || "",
    },
  },
};

export default config;
