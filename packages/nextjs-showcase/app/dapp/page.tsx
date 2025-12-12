'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import Link from 'next/link';

// Contract ABI - only the functions we need
const CONTRACT_ABI = [
  "function submitGlucoseValue(bytes32 encryptedGlucose, bytes proof) external",
  "function getMyResult() external view returns (bytes32)",
  "function hasUserSubmitted(address user) external view returns (bool)",
  "function getMySubmissionTime() external view returns (uint256)"
];

// Contract address - BloodGlucoseCheck on Sepolia
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xc8BB69fEdC4AEaC8131c96Cc8538aa8786306816';

// FHEVM Configuration for Sepolia
const FHEVM_CONFIG = {
  chainId: 11155111,
  aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
  kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
  inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
  verifyingContractAddressDecryption: '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
  verifyingContractAddressInputVerification: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
  gatewayChainId: 10901,
  relayerUrl: 'https://relayer.testnet.zama.org',
};

// Utility to get wallet provider
function getWalletProvider(): any {
  if (typeof window === 'undefined') return null;
  
  if ((window as any).ethereum) {
    return (window as any).ethereum;
  }
  
  if ((window as any).okxwallet?.provider) {
    return (window as any).okxwallet.provider;
  }
  
  return null;
}

export default function DAppPage() {
  // Wallet state
  const [address, setAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  
  // FHEVM state
  const [fhevmInstance, setFhevmInstance] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string>('');
  
  // Application state
  const [glucoseValue, setGlucoseValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [canDecrypt, setCanDecrypt] = useState(false);
  const [message, setMessage] = useState('');
  
  // Prevent double initialization
  const isInitializingRef = useRef(false);
  
  // Connect wallet
  const connectWallet = async () => {
    try {
      const provider = getWalletProvider();
      if (!provider) {
        setMessage('No wallet provider found. Please install MetaMask.');
        return;
      }
      
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        setMessage('Wallet connected successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      setMessage('Failed to connect wallet: ' + error.message);
    }
  };
  
  // Initialize FHEVM when wallet connects
  useEffect(() => {
    if (!isConnected || isInitializingRef.current || fhevmInstance) {
      return;
    }
    
    const initFhevm = async () => {
      isInitializingRef.current = true;
      setIsInitializing(true);
      setInitError('');
      
      try {
        // Wait for relayerSDK to load
        if (!(window as any).relayerSDK) {
          throw new Error('Relayer SDK not loaded. Please refresh the page.');
        }
        
        // Initialize SDK
        await (window as any).relayerSDK.initSDK();
        
        // Get provider
        const provider = getWalletProvider();
        if (!provider) {
          throw new Error('No wallet provider found');
        }
        
        // Create FHEVM instance
        const instance = await (window as any).relayerSDK.createInstance({
          ...FHEVM_CONFIG,
          network: provider,
        });
        
        setFhevmInstance(instance);
        console.log('✅ FHEVM initialized successfully');
        setMessage('FHEVM initialized successfully!');
        setTimeout(() => setMessage(''), 3000);
      } catch (e: any) {
        setInitError(e.message);
        console.error('❌ FHEVM init failed:', e);
        isInitializingRef.current = false;
      } finally {
        setIsInitializing(false);
      }
    };
    
    initFhevm();
  }, [isConnected, fhevmInstance]);
  
  // 移除复杂的持久化检查，简化逻辑：刷新后重置状态
  
  // Submit glucose value
  const handleSubmit = async () => {
    if (!glucoseValue || !fhevmInstance || !address) {
      setMessage('Please enter a valid glucose value');
      return;
    }
    
    const value = parseFloat(glucoseValue);
    if (isNaN(value) || value < 0 || value > 500) {
      setMessage('Please enter a glucose value between 0 and 500 mg/dL');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('Encrypting your data...');
    
    try {
      // Step 1: Encrypt the input
      const input = fhevmInstance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add32(Math.round(value));
      const encryptedInput = await input.encrypt();
      
      setMessage('Submitting to blockchain...');
      
      // Step 2: Submit to contract
      const provider = new BrowserProvider(getWalletProvider());
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.submitGlucoseValue(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      
      setMessage('Transaction sent! Waiting for confirmation...');
      await tx.wait();
      
      // 提交成功，立即允许解密
      setHasSubmitted(true);
      setMessage('✅ Submission successful! You can now decrypt your result.');
      setCanDecrypt(true);
      
    } catch (error: any) {
      console.error('Submission failed:', error);
      setMessage('❌ Submission failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Decrypt result
  const handleDecrypt = async () => {
    if (!fhevmInstance || !address) return;
    
    setIsDecrypting(true);
    setMessage('Requesting signature...');
    
    try {
      // Get encrypted result from contract
      const provider = new BrowserProvider(getWalletProvider());
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const encryptedHandle = await contract.getMyResult();
      
      setMessage('Decrypting result... This may take 30-60 seconds.');
      
      // Generate keypair for decryption
      const keypair = fhevmInstance.generateKeypair();
      
      // Prepare decryption parameters
      const handleContractPairs = [
        { handle: encryptedHandle, contractAddress: CONTRACT_ADDRESS }
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [CONTRACT_ADDRESS];
      
      // Create EIP-712 signature
      const eip712 = fhevmInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );
      
      // Remove EIP712Domain for signature
      const typesWithoutDomain = { ...eip712.types };
      delete typesWithoutDomain.EIP712Domain;
      
      const signature = await signer.signTypedData(
        eip712.domain,
        typesWithoutDomain,
        eip712.message
      );
      
      // Call userDecrypt
      const decryptedResults = await fhevmInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );
      
      const decryptedValue = decryptedResults[encryptedHandle];
      setResult(decryptedValue);
      setMessage('');
      
    } catch (error: any) {
      console.error('Decryption failed:', error);
      setMessage('❌ Decryption failed: ' + error.message);
    } finally {
      setIsDecrypting(false);
    }
  };
  
  // Show appropriate UI based on state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HealthGuard FHE</h1>
                <p className="text-xs text-gray-500">Blood Glucose Check</p>
              </div>
            </Link>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-8">
              Please connect your Ethereum wallet to submit your health disclosure
            </p>
            <button 
              onClick={connectWallet}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Initializing FHEVM...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we set up encryption</p>
        </div>
      </div>
    );
  }
  
  if (initError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Initialization Failed</h3>
          <p className="text-red-600 text-sm mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
  
  // Main DApp UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">HealthGuard FHE</h1>
              <p className="text-xs text-gray-500">Blood Glucose Check</p>
            </div>
          </Link>
          <div className="text-right">
            <p className="text-xs text-gray-500">Connected</p>
            <p className="text-sm font-mono text-gray-700">{address.slice(0, 6)}...{address.slice(-4)}</p>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
            {message}
          </div>
        )}
        
        {/* Result Display */}
        {result !== null && (
          <div className={`mb-6 p-6 rounded-2xl border-2 ${result === 1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${result === 1 ? 'bg-green-100' : 'bg-red-100'}`}>
                {result === 1 ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </div>
              <div>
                <h3 className={`text-2xl font-bold mb-1 ${result === 1 ? 'text-green-900' : 'text-red-900'}`}>
                  {result === 1 ? 'Eligible for Insurance' : 'Additional Review Required'}
                </h3>
                <p className={`text-sm ${result === 1 ? 'text-green-700' : 'text-red-700'}`}>
                  {result === 1 
                    ? 'Your fasting blood glucose is within the acceptable range (≤110 mg/dL)' 
                    : 'Your blood glucose may require medical consultation before insurance approval'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Fasting Blood Glucose Disclosure</h2>
          <p className="text-gray-600 mb-8">
            Submit your fasting blood glucose level for insurance eligibility assessment
          </p>
          
          <div>
            {/* 输入框 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Glucose Level (mg/dL)
              </label>
              <div className="relative">
                <input 
                  type="number"
                  value={glucoseValue}
                  onChange={(e) => setGlucoseValue(e.target.value)}
                  placeholder="Enter value (e.g., 95)"
                  disabled={isSubmitting || hasSubmitted}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg disabled:bg-gray-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  mg/dL
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Normal range: 70-110 mg/dL • Insurance threshold: ≤110 mg/dL
              </p>
            </div>
            
            {/* 提交按钮 */}
            {!hasSubmitted && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !glucoseValue}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  '🔒 Submit Encrypted Data'
                )}
              </button>
            )}
            
            {/* 解密按钮 */}
            {hasSubmitted && canDecrypt && result === null && (
              <button
                onClick={handleDecrypt}
                disabled={isDecrypting}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDecrypting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Decrypting... (30-60s)
                  </span>
                ) : (
                  '🔓 Decrypt Result'
                )}
              </button>
            )}
            
            {/* 重新提交按钮 */}
            {result !== null && (
              <button
                onClick={() => {
                  setHasSubmitted(false);
                  setResult(null);
                  setGlucoseValue('');
                  setCanDecrypt(false);
                }}
                className="w-full px-6 py-4 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all duration-300"
              >
                Submit New Disclosure
              </button>
            )}
          </div>
        </div>
        
        {/* Info Section */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Privacy Guarantee
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your blood glucose value is encrypted on your device before submission. 
              The smart contract performs assessment on encrypted data without ever seeing your actual value.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Medical Standard
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Assessment based on WHO and ADA guidelines. Fasting glucose ≤110 mg/dL (6.1 mmol/L) 
              is considered acceptable for standard insurance underwriting.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

