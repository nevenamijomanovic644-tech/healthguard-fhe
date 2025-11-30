# HealthGuard FHE

> **Privacy-Preserving Health Disclosure Platform for Insurance Underwriting**
> 
> Built with FHEVM v0.9 on Ethereum Sepolia

[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?logo=ethereum)](https://sepolia.etherscan.io/)
[![FHEVM](https://img.shields.io/badge/FHEVM-v0.9-blue)](https://docs.zama.org/fhevm)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 **The Problem We Solve**

### The Health Data Privacy Crisis in Insurance

Every year, millions of people applying for health insurance face an uncomfortable dilemma: **they must surrender their most sensitive medical information to get coverage**. This creates several critical problems:

1. **Privacy Violation**: Personal health data (blood glucose levels, cholesterol, blood pressure) is exposed to insurance companies, brokers, and third-party processors
2. **Data Breach Risk**: Centralized health databases are prime targets for cyberattacks. A single breach can expose thousands of patients' sensitive medical histories
3. **Discrimination Concerns**: Once disclosed, health data can be used for price discrimination or coverage denial
4. **Trust Deficit**: Patients fear that honest disclosure may result in higher premiums or rejection
5. **Regulatory Complexity**: Compliance with HIPAA, GDPR, and other privacy regulations is expensive and error-prone

**The fundamental question**: *How can we verify health eligibility for insurance without exposing private medical data?*

---

## 💡 **Our Solution: Zero-Knowledge Health Verification**

**HealthGuard FHE** introduces a revolutionary approach to health disclosure using **Fully Homomorphic Encryption (FHE)**:

### The Core Innovation

1. **Client-Side Encryption**: Your health data (e.g., fasting blood glucose) is encrypted **on your device** before it ever leaves your browser
2. **Encrypted Computation**: Our smart contract performs eligibility assessment **directly on encrypted data** without ever decrypting it
3. **Private Results**: Only **you** hold the decryption key to view your assessment result

### What This Means

- ✅ **Insurance companies never see your raw health numbers**
- ✅ **No centralized health database that can be hacked**
- ✅ **Mathematically guaranteed privacy** (not just a policy promise)
- ✅ **Instant eligibility verification** (no waiting for manual review)
- ✅ **Immutable proof on blockchain** (verifiable and auditable)

---

## 🏗️ **How It Works**

### Technical Architecture

```
User Device                    Ethereum Blockchain              User Device
    │                                  │                            │
    ├─ 1. Enter glucose value          │                            │
    ├─ 2. FHE encrypt (FHEVM SDK)      │                            │
    ├─ 3. Submit encrypted data ──────>│                            │
    │                                  │                            │
    │                            4. Smart Contract:                 │
    │                            - Compare encrypted value          │
    │                            - Check if ≤ 110 mg/dL            │
    │                            - Store encrypted result           │
    │                            - Grant user decrypt permission    │
    │                                  │                            │
    │                                  │<──── 5. Request result ────┤
    │                                  │                            │
    │                                  │──── 6. Return encrypted ──>│
    │                                  │        result handle       │
    │                                  │                            │
    │                                  │                     7. User decrypts
    │                                  │                     8. View: 1=eligible
    │                                  │                              0=review needed
```

### Step-by-Step User Flow

1. **Connect Wallet**: User connects MetaMask or compatible Web3 wallet
2. **Enter Health Data**: User inputs fasting blood glucose level (e.g., 95 mg/dL)
3. **Automatic Encryption**: Frontend encrypts the value using FHEVM SDK before transmission
4. **Submit to Blockchain**: Encrypted data is sent to the smart contract on Ethereum Sepolia
5. **On-Chain Assessment**: Smart contract compares encrypted value against threshold (110 mg/dL) without decryption
6. **Store Result**: Encrypted assessment result (1 = eligible, 0 = needs review) is stored on-chain
7. **User Decryption**: User signs an EIP-712 message to decrypt their personal result
8. **View Outcome**: User sees their eligibility status, while insurance provider never sees the raw data

---

## 🎯 **Business Model & Use Cases**

### Primary Use Case: Insurance Pre-Qualification

**Target Market**: Health insurance applicants who value privacy

**Value Proposition**:
- **For Patients**: Submit health disclosures without exposing sensitive data
- **For Insurers**: Verify eligibility criteria without liability of handling raw medical data
- **For Regulators**: Transparent, auditable compliance with privacy laws

### Revenue Streams

1. **Transaction Fees**: Small fee per disclosure submission (paid in ETH)
2. **Enterprise Licensing**: Insurance companies pay for API access to verification results
3. **Expanded Health Metrics**: Premium features for additional health indicators (cholesterol, blood pressure, BMI)
4. **Compliance-as-a-Service**: White-label solution for insurers who want FHE-powered privacy

### Competitive Advantages

| Traditional Method | HealthGuard FHE |
|-------------------|----------------|
| ❌ Expose raw health data | ✅ Keep data encrypted end-to-end |
| ❌ Centralized database vulnerabilities | ✅ Decentralized blockchain storage |
| ❌ Manual underwriting (days/weeks) | ✅ Instant automated assessment |
| ❌ Trust-based privacy policies | ✅ Cryptographic privacy guarantees |
| ❌ HIPAA compliance overhead | ✅ Minimal compliance burden (no data custody) |

### Market Opportunity

- **Global Health Insurance Market**: $2.5 trillion (2024)
- **Privacy-Conscious Consumers**: 87% concerned about health data privacy (Pew Research)
- **Regulatory Tailwind**: GDPR, CCPA, HIPAA pushing for minimal data exposure
- **Blockchain Health Tech**: $1.6 billion market by 2028

---

## 🔬 **Medical Standards**

### Blood Glucose Assessment Criteria

Our smart contract implements medically-validated thresholds based on:

- **World Health Organization (WHO)** guidelines
- **American Diabetes Association (ADA)** recommendations
- **International Diabetes Federation (IDF)** standards

#### Fasting Blood Glucose Ranges

| Range | Status | Insurance Eligibility |
|-------|--------|---------------------|
| < 70 mg/dL | Hypoglycemia | May require review |
| 70-110 mg/dL | Normal | ✅ **Eligible** |
| 111-125 mg/dL | Prediabetes | Requires review |
| > 126 mg/dL | Diabetes indicator | Requires medical consultation |

**HealthGuard Threshold**: ≤ 110 mg/dL (6.1 mmol/L) for standard insurance eligibility

**Note**: This is a demonstration threshold. Production deployments should consult with actuarial teams and medical professionals to calibrate thresholds based on specific insurance products and regional medical standards.

---

## 🚀 **Quick Start**

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **MetaMask** or Web3-compatible wallet
- **Sepolia ETH** ([Get testnet ETH](https://sepoliafaucet.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/healthguard-fhe.git
cd healthguard-fhe

# Install dependencies
pnpm install

# Start the development server
cd packages/nextjs-showcase
pnpm dev
```

### Usage

1. Open browser at `http://localhost:3000`
2. Click "Launch App"
3. Connect your wallet (switch to Sepolia if needed)
4. Wait for FHEVM initialization (~5-10 seconds)
5. Enter your fasting blood glucose value (e.g., 95 mg/dL)
6. Click "Submit Encrypted Data"
7. Approve the transaction in your wallet
8. Wait 10 seconds for permission sync
9. Click "Decrypt Result" and sign the message
10. View your eligibility status (30-60 seconds for decryption)

---

## 🔒 **Security & Privacy**

### Cryptographic Guarantees

- **Fully Homomorphic Encryption**: Computations performed on ciphertext produce encrypted results
- **Zero-Knowledge**: Insurance provider learns only "eligible" or "not eligible" without seeing the actual glucose value
- **Client-Side Encryption**: Data encrypted in browser before transmission
- **Decentralized Storage**: No centralized database to hack

### Smart Contract Security

- **Immutable Logic**: Assessment criteria hardcoded in deployed contract
- **Permission Model**: Only the data owner can decrypt their result
- **No Admin Keys**: No backdoor access to encrypted data
- **Open Source**: Code auditable by anyone

### Audit Status

- ⏳ **Pending**: This is a proof-of-concept. Production deployment requires formal security audit
- 🔍 **Recommended Auditors**: Trail of Bits, ConsenSys Diligence, OpenZeppelin

---

## 🛠️ **Technical Stack**

### Smart Contract

- **Solidity** ^0.8.24
- **FHEVM** v0.9 (Zama)
- **Network**: Ethereum Sepolia Testnet
- **Contract Address**: `0xc8BB69fEdC4AEaC8131c96Cc8538aa8786306816`

### Frontend

- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS
- **FHE SDK**: Zama Relayer SDK 0.3.0-5
- **Wallet**: MetaMask / Web3
- **HTTP Transport**: ethers.js v6

### Infrastructure

- **RPC Provider**: Alchemy (Sepolia)
- **FHEVM Relayer**: https://relayer.testnet.zama.org
- **Deployment**: Vercel-ready (with CORS headers configured)

---

## 📊 **Deployment Information**

### Smart Contract Deployment

- **Network**: Sepolia Testnet (Chain ID: 11155111)
- **Contract**: `BloodGlucoseCheck.sol`
- **Address**: `0xc8BB69fEdC4AEaC8131c96Cc8538aa8786306816`
- **Explorer**: [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xc8BB69fEdC4AEaC8131c96Cc8538aa8786306816)

### Frontend Configuration

The application is pre-configured for Sepolia testnet. No additional configuration needed for local development.

---

## 🗺️ **Roadmap**

### Phase 1: MVP (Current) ✅
- [x] Blood glucose disclosure
- [x] FHE encryption/decryption
- [x] Landing page + DApp UI
- [x] Sepolia deployment

### Phase 2: Enhanced Features 🚧
- [ ] Additional health metrics (blood pressure, cholesterol, BMI)
- [ ] Multi-metric composite scoring
- [ ] Historical disclosure tracking
- [ ] Mobile-responsive optimization

### Phase 3: Enterprise Integration 📅
- [ ] REST API for insurance provider integration
- [ ] White-label solution
- [ ] Mainnet deployment
- [ ] Professional security audit

### Phase 4: Scale & Compliance 🔮
- [ ] Multi-chain support (Polygon, Arbitrum)
- [ ] HIPAA compliance certification
- [ ] Partnership with insurance companies
- [ ] AI-powered risk assessment (on encrypted data)

---

## 🤝 **Contributing**

We welcome contributions! Areas we need help with:

- **Medical Expertise**: Calibrating assessment thresholds
- **Security Auditing**: Smart contract review
- **UI/UX Design**: Improving user experience
- **Documentation**: Expanding guides and tutorials

---

## 📜 **License**

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 **Acknowledgments**

- **Zama**: For pioneering FHEVM technology
- **Ethereum Foundation**: For the Sepolia testnet
- **Medical Community**: For evidence-based health standards
- **Open Source Community**: For the tools that made this possible

---

## 📞 **Contact & Support**

- **Demo**: [https://healthguard-fhe.vercel.app](https://healthguard-fhe.vercel.app)
- **Issues**: [GitHub Issues](https://github.com/yourusername/healthguard-fhe/issues)
- **Email**: contact@healthguard-fhe.com
- **Twitter**: [@HealthGuardFHE](https://twitter.com/HealthGuardFHE)

---

## ⚠️ **Disclaimer**

**This is a proof-of-concept demonstration project. It is NOT intended for production use in actual medical or insurance decision-making.**

- This application does not provide medical advice
- The assessment criteria are simplified for demonstration purposes
- Always consult qualified healthcare professionals for medical decisions
- Insurance eligibility is subject to additional factors beyond blood glucose
- The smart contract has not been formally audited

**For Educational and Research Purposes Only.**

---

## 🌐 **Why This Matters**

Healthcare privacy is a fundamental human right. As our medical data becomes increasingly digitized, we face a choice:

1. **Surrender privacy** for convenience (current system)
2. **Forfeit digital tools** to protect privacy (Luddite approach)
3. **Use cryptography** to have both privacy AND verification (HealthGuard FHE)

**We believe the third path is the future.**

Fully Homomorphic Encryption represents a paradigm shift: for the first time in history, we can compute on secrets without revealing them. This unlocks a new category of "privacy-first" applications that were previously impossible.

**HealthGuard FHE is just the beginning.** The same technology can secure:

- 🏦 Credit scores without exposing transaction history
- 🧬 Genetic testing without revealing DNA sequences
- 🗳️ Voting systems without compromising ballot secrecy
- 💰 Financial audits without exposing proprietary data

**Join us in building a more private digital future.**

---

<p align="center">
  <strong>⚡ Powered by Zama FHEVM • 🔒 Encrypted End-to-End • 🌐 Decentralized on Ethereum</strong>
</p>

<p align="center">
  Made with ❤️ for healthcare privacy
</p>
