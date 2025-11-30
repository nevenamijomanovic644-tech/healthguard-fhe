// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title BloodGlucoseCheck
 * @notice Privacy-preserving blood glucose disclosure for insurance underwriting
 * @dev Uses FHE to check if user's fasting blood glucose is within acceptable range
 * 
 * Medical Standard: Fasting Blood Glucose ≤ 110 mg/dL is considered acceptable for insurance
 */
contract BloodGlucoseCheck is ZamaEthereumConfig {
    // Acceptable upper limit: 110 mg/dL (6.1 mmol/L)
    uint32 private constant GLUCOSE_UPPER_LIMIT = 110;
    
    // Storage for user submissions
    mapping(address => euint32) public userGlucoseValues;
    mapping(address => euint32) public userResults;
    mapping(address => bool) public hasSubmitted;
    mapping(address => uint256) public submissionTimestamp;
    
    // Events
    event GlucoseSubmitted(address indexed user, uint256 timestamp);
    
    /**
     * @notice Submit encrypted blood glucose value for assessment
     * @param encryptedGlucose Encrypted glucose value (in mg/dL)
     * @param proof Zero-knowledge proof for encrypted input
     */
    function submitGlucoseValue(
        externalEuint32 encryptedGlucose,
        bytes calldata proof
    ) external {
        // Convert external encrypted input to internal representation
        euint32 glucoseValue = FHE.fromExternal(encryptedGlucose, proof);
        
        // Store the encrypted glucose value
        userGlucoseValues[msg.sender] = glucoseValue;
        
        // Compare: isAcceptable = (glucoseValue <= 110)
        euint32 limit = FHE.asEuint32(GLUCOSE_UPPER_LIMIT);
        ebool isAcceptable = FHE.le(glucoseValue, limit);
        
        // Convert boolean result to uint32: 1 = acceptable, 0 = not acceptable
        euint32 one = FHE.asEuint32(uint32(1));
        euint32 zero = FHE.asEuint32(uint32(0));
        euint32 result = FHE.select(isAcceptable, one, zero);
        
        // Store the encrypted result
        userResults[msg.sender] = result;
        hasSubmitted[msg.sender] = true;
        submissionTimestamp[msg.sender] = block.timestamp;
        
        // CRITICAL: Grant dual permissions
        FHE.allowThis(glucoseValue);     // Contract can access the value
        FHE.allow(glucoseValue, msg.sender); // User can decrypt their value
        
        FHE.allowThis(result);           // Contract can return the result
        FHE.allow(result, msg.sender);   // User can decrypt their result
        
        emit GlucoseSubmitted(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Get encrypted assessment result (1 = acceptable, 0 = not acceptable)
     * @return bytes32 Handle for encrypted result
     */
    function getMyResult() external view returns (bytes32) {
        require(hasSubmitted[msg.sender], "No glucose value submitted");
        return FHE.toBytes32(userResults[msg.sender]);
    }
    
    /**
     * @notice Get encrypted glucose value
     * @return bytes32 Handle for encrypted glucose value
     */
    function getMyGlucoseValue() external view returns (bytes32) {
        require(hasSubmitted[msg.sender], "No glucose value submitted");
        return FHE.toBytes32(userGlucoseValues[msg.sender]);
    }
    
    /**
     * @notice Check if user has submitted
     * @param user Address to check
     * @return bool True if user has submitted
     */
    function hasUserSubmitted(address user) external view returns (bool) {
        return hasSubmitted[user];
    }
    
    /**
     * @notice Get submission timestamp
     * @return uint256 Unix timestamp of submission
     */
    function getMySubmissionTime() external view returns (uint256) {
        require(hasSubmitted[msg.sender], "No glucose value submitted");
        return submissionTimestamp[msg.sender];
    }
}

