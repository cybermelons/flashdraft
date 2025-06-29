/**
 * Debug script to test draft creation process step by step
 */

// Test API endpoint
async function testAPI() {
  console.log('Testing API endpoint...');
  try {
    const response = await fetch('http://localhost:4321/api/sets/FIN');
    console.log('API Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response data keys:', Object.keys(data));
      console.log('Set info:', data.set_info);
      console.log('Total cards:', data.total_cards);
      console.log('Sample card:', data.cards?.[0]);
    } else {
      const error = await response.text();
      console.error('API Error:', error);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Test set validation
async function testSetValidation() {
  console.log('\nTesting set validation in browser...');
  
  // This would test the client-side validation logic
  console.log('Open browser console and run:');
  console.log('1. Select FIN set');
  console.log('2. Check setup.isConfigValid');
  console.log('3. Check setup.validationErrors');
  console.log('4. Check setup.setData');
}

if (typeof window !== 'undefined') {
  // Browser environment
  window.debugDraftCreation = {
    testAPI,
    testSetValidation
  };
  console.log('Debug functions added to window.debugDraftCreation');
} else {
  // Node environment
  testAPI();
}