// Utility to test the new API connection and authentication

import { newAuthService } from '../services/newAuthService';
import { newInstituteService } from '../services/newInstituteService';

export const testApiConnection = async () => {
  const results = {
    connection: false,
    authentication: false,
    institutes: false,
    errors: [],
  };

  try {
    // Test basic connectivity
    const response = await fetch('https://testpire-svc.brz9vh5stea0g.ap-south-1.cs.amazonlightsail.com/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.status === 401) {
      results.connection = true;
      console.log('✅ API connection successful (authentication required)');
    } else if (response.ok) {
      results.connection = true;
      results.authentication = true;
      console.log('✅ API connection and authentication successful');
    } else {
      results.errors.push(`API returned status: ${response.status}`);
    }
  } catch (error) {
    results.errors.push(`Connection failed: ${error.message}`);
    console.error('❌ API connection failed:', error);
  }

  return results;
};

export const testWithDemoCredentials = async () => {
  const results = {
    login: false,
    profile: false,
    institutes: false,
    errors: [],
  };

  try {
    // Test login with demo credentials (you may need to replace these with actual demo credentials)
    const loginResult = await newAuthService.login('demo@testpire.com', 'demo123');
    
    if (loginResult.error) {
      results.errors.push(`Login failed: ${loginResult.error.message}`);
      console.log('⚠️ Login failed (expected if demo credentials don\'t exist)');
    } else {
      results.login = true;
      console.log('✅ Login successful');

      // Test profile retrieval
      const profileResult = await newAuthService.getProfile();
      if (profileResult.error) {
        results.errors.push(`Profile retrieval failed: ${profileResult.error.message}`);
      } else {
        results.profile = true;
        console.log('✅ Profile retrieval successful');
      }

      // Test institutes retrieval (if user has permission)
      const instituteResult = await newInstituteService.getInstitutes();
      if (instituteResult.error) {
        results.errors.push(`Institutes retrieval failed: ${instituteResult.error.message}`);
      } else {
        results.institutes = true;
        console.log('✅ Institutes retrieval successful');
      }
    }
  } catch (error) {
    results.errors.push(`Test failed: ${error.message}`);
    console.error('❌ Demo test failed:', error);
  }

  return results;
};

// Export a comprehensive test function
export const runAPITests = async () => {
  console.log('🚀 Starting API tests...');
  
  const connectionTest = await testApiConnection();
  console.log('\n📡 Connection Test Results:', connectionTest);

  const demoTest = await testWithDemoCredentials();
  console.log('\n🔐 Demo Authentication Test Results:', demoTest);

  const overallSuccess = connectionTest.connection && 
                        (connectionTest.errors.length === 0 || 
                         connectionTest.errors.some(e => e.includes('401')));

  console.log(`\n${overallSuccess ? '✅' : '❌'} Overall API Test: ${overallSuccess ? 'PASSED' : 'FAILED'}`);
  
  return {
    connection: connectionTest,
    demo: demoTest,
    success: overallSuccess
  };
};
