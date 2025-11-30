import { ethers } from "ethers";
import hre from "hardhat";

async function main() {
  console.log("Deploying HealthGuard FHE contracts...");
  
  // Deploy BloodGlucoseCheck contract
  console.log("Deploying BloodGlucoseCheck contract...");
  const BloodGlucoseCheck = await hre.ethers.getContractFactory("BloodGlucoseCheck");
  const bloodGlucose = await BloodGlucoseCheck.deploy();
  await bloodGlucose.waitForDeployment();
  const bloodGlucoseAddress = await bloodGlucose.getAddress();
  console.log(`✅ BloodGlucoseCheck contract deployed to: ${bloodGlucoseAddress}`);
  
  console.log("\n=== Deployment Summary ===");
  console.log(`BloodGlucoseCheck: ${bloodGlucoseAddress}`);
  console.log("\nSave this address to packages/nextjs-showcase/.env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${bloodGlucoseAddress}`);
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });