'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
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

export default function DAppPage() {
  // Wagmi hooks
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
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
  const [countdown, setCountdown] = useState(0);
  
  // Prevent double initialization
  const isInitializingRef = useRef(false);
  
  // Initialize FHEVM when wallet connects
  useEffect(() => {
    if (!isConnected || !address || !walletClient || isInitializingRef.current || fhevmInstance) {
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
        
        // Initialize SDK first
        await (window as any).relayerSDK.initSDK();
        
        // Create provider from walletClient
        const provider = new BrowserProvider(walletClient as any);
        
        // Create FHEVM instance
        const instance = await (window as any).relayerSDK.createInstance({
          ...FHEVM_CONFIG,
          network: walletClient,
        });
        
        setFhevmInstance(instance);
        console.log('✅ FHEVM initialized successfully');
      } catch (error: any) {
        console.error('FHEVM init failed:', error);
        setInitError(error.message || 'Failed to initialize FHEVM');
        isInitializingRef.current = false;
      } finally {
        setIsInitializing(false);
      }
    };
    
    initFhevm();
  }, [isConnected, address, walletClient, fhevmInstance]);
  
  // Submit glucose value
  const handleSubmit = async () => {
    if (!fhevmInstance || !address || !walletClient) return;
    
    const value = parseFloat(glucoseValue);
    if (isNaN(value) || value <= 0) {
      setMessage('❌ Please enter a valid glucose value');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('Encrypting your data...');
    
    try {
      // Create encrypted input
      const input = fhevmInstance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add32(Math.round(value));
      const encryptedInput = await input.encrypt();
      
      setMessage('Submitting to blockchain...');
      
      // Create provider and contract
      const provider = new BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Submit transaction
      const tx = await contract.submitGlucoseValue(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      
      setMessage('Waiting for confirmation...');
      await tx.wait();
      
      // 提交成功，等待10秒让权限同步
      setHasSubmitted(true);
      setMessage('✅ Submission successful! Syncing permissions...');
      setCountdown(10);
      
      // 倒计时10秒
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanDecrypt(true);
            setMessage('✅ Ready to decrypt!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error: any) {
      console.error('Submission failed:', error);
      setMessage('❌ Submission failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Decrypt result with retry mechanism
  const handleDecrypt = async (retryCount = 0) => {
    if (!fhevmInstance || !address || !walletClient) return;
    
    setIsDecrypting(true);
    
    try {
      // Get encrypted result from contract
      const provider = new BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const encryptedHandle = await contract.getMyResult();
      console.log('📋 Encrypted handle:', encryptedHandle);
      
      if (retryCount === 0) {
        setMessage('Requesting signature...');
      }
      
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
      
      // Remove EIP712Domain from types (required for ethers)
      const typesWithoutDomain = { ...eip712.types };
      delete typesWithoutDomain.EIP712Domain;
      
      // Sign with wallet
      const signature = await signer.signTypedData(
        eip712.domain,
        typesWithoutDomain,
        eip712.message
      );
      
      setMessage('Decrypting... This may take 30-60 seconds.');
      
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
      console.log('✅ Decrypted result:', decryptedValue);
      setResult(decryptedValue);
      setMessage('');
      
    } catch (error: any) {
      console.error('Decryption failed:', error);
      
      // 如果是500错误，自动重试最多3次
      if (error.message?.includes('500') && retryCount < 3) {
        const waitTime = (retryCount + 1) * 10;
        setMessage(`⏳ Permission sync in progress... Retry ${retryCount + 1}/3 in ${waitTime}s`);
        console.log(`⚠️ Retry ${retryCount + 1}/3 after ${waitTime}s...`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        return handleDecrypt(retryCount + 1);
      }
      
      setMessage('❌ Decryption failed: ' + error.message);
    } finally {
      if (retryCount === 0 || result !== null) {
        setIsDecrypting(false);
      }
    }
  };
  
  // Show connect wallet screen
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
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }
  
  // Show initializing screen
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Initializing FHEVM...</p>
          <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }
  
  // Show error screen
  if (initError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Initialization Error</h2>
          <p className="text-red-600 mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
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
          <ConnectButton />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes('❌') ? 'bg-red-50 border border-red-200 text-red-700' : message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
            {message}
          </div>
        )}
        
        {/* Countdown Display */}
        {countdown > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <div>
                <p className="text-yellow-800 font-medium">Syncing permissions with relayer...</p>
                <p className="text-yellow-600 text-sm">Please wait {countdown} seconds before decrypting</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Result Display */}
        {result !== null && (
          <div className={`mb-6 p-6 rounded-2xl border-2 ${result === 1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${result === 1 ? 'bg-green-100' : 'bg-red-100'}`}>
                {result === 1 ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                )}
              </div>
              <div>
                <h3 className={`text-xl font-bold ${result === 1 ? 'text-green-800' : 'text-red-800'}`}>
                  {result === 1 ? '✅ Eligible' : '❌ Not Eligible'}
                </h3>
                <p className={`${result === 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {result === 1 
                    ? 'Your fasting glucose is within the healthy range (≤110 mg/dL)'
                    : 'Your fasting glucose exceeds the threshold (>110 mg/dL)'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setHasSubmitted(false);
                setResult(null);
                setGlucoseValue('');
                setCanDecrypt(false);
              }}
              className="w-full mt-6 px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all duration-300"
            >
              Submit New Disclosure
            </button>
          </div>
        )}
        
        {/* Main Form */}
        {result === null && (
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Fasting Blood Glucose Disclosure</h2>
            <p className="text-gray-600 mb-8">
              Submit your fasting blood glucose level for insurance eligibility assessment
            </p>
            
            {!hasSubmitted ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fasting Blood Glucose (mg/dL)
                </label>
                <input
                  type="number"
                  value={glucoseValue}
                  onChange={(e) => setGlucoseValue(e.target.value)}
                  placeholder="Enter your glucose level (e.g., 95)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-6"
                />
                
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
              </div>
            ) : (
              <div>
                <div className="text-center py-8 mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <p className="text-gray-600">Data submitted successfully. Ready to decrypt...</p>
                </div>
                
                {canDecrypt && (
                  <button
                    onClick={() => handleDecrypt()}
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
              </div>
            )}
          </div>
        )}
        
        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2">🔐 How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your glucose value is encrypted before leaving your browser</li>
            <li>• The smart contract processes encrypted data using FHE</li>
            <li>• Only you can decrypt the eligibility result</li>
            <li>• Insurance companies never see your actual glucose level</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

// Disable static generation
export const dynamic = 'force-dynamic';
