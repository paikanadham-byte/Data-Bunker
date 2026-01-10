/**
 * Manual Test: Verify Email and Phone Improvements in Live Service
 * Tests the actual scraper service with the new logic
 */

const webScraperService = require('./src/services/webScraperService');

async function testEmailPhoneImprovements() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 LIVE TEST: Email & Phone Selection Improvements');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 1: Email Selection with Personal Format
  console.log('📧 TEST 1: Email Selection (Personal vs Generic)\n');
  
  const testEmails = [
    'info@company.com',
    'hello@company.com', 
    'john.smith@company.com',
    'contact@company.com'
  ];
  
  const websiteUrl = 'https://www.company.com';
  const selectedEmail = webScraperService._chooseEmail(testEmails, websiteUrl);
  
  console.log('   Found Emails:', testEmails.join(', '));
  console.log('   ✅ Selected:', selectedEmail);
  console.log('   Expected: john.smith@company.com | Format: first.last@company.com');
  console.log('   Result:', selectedEmail.includes('john.smith@company.com') && selectedEmail.includes('Format:') ? '✅ PASS - Email + Format!' : '❌ FAIL');

  // Test 1B: Different format patterns
  console.log('\n📧 TEST 1B: Detect Different Email Formats\n');
  
  const formatTests = [
    { email: 'sarah.jones@company.com', expected: 'first.last@company.com' },
    { email: 'james@company.com', expected: 'firstname@company.com' },
    { email: 'jsmith@company.com', expected: 'flast@company.com' },
    { email: 'john_doe@company.com', expected: 'first_last@company.com' }
  ];
  
  formatTests.forEach(test => {
    const result = webScraperService._chooseEmail([test.email], websiteUrl);
    console.log(`   ${test.email} → ${result}`);
    console.log(`   Expected format: ${test.expected}`);
    console.log(`   Result: ${result.includes(test.expected) ? '✅ PASS' : '❌ FAIL'}\n`);
  });

  // Test 2: UK Phone Formatting
  console.log('\n\n📞 TEST 2: UK Phone Formatting\n');
  
  const testPhones = [
    { input: '020 7946 0958', country: 'England', expected: '+44 2079 460 958' },
    { input: '07912 345678', country: 'Scotland', expected: '+44 7912 345 678' },
    { input: '01234567890', country: 'Wales', expected: '+44 1234 567 890' }
  ];
  
  testPhones.forEach(test => {
    const formatted = webScraperService._formatUKPhone(test.input, test.country);
    const pass = formatted === test.expected;
    console.log(`   Input: ${test.input} (${test.country})`);
    console.log(`   ✅ Output: ${formatted}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Result: ${pass ? '✅ PASS' : '❌ FAIL'}\n`);
  });

  // Test 3: Generic Email Rejection - Should Return Generic Fallback
  console.log('📧 TEST 3: Generic Emails Only - Use Generic Fallback\n');
  
  const genericEmails = ['info@company.com', 'hello@company.com', 'contact@company.com'];
  const selectedGeneric = webScraperService._chooseEmail(genericEmails, websiteUrl, '');
  
  console.log('   Found Emails (all generic):', genericEmails.join(', '));
  console.log('   ✅ Selected:', selectedGeneric);
  console.log('   Expected: hello@company.com or info@company.com');
  console.log('   Result:', selectedGeneric && selectedGeneric.includes('@company.com') ? '✅ PASS - Uses generic as fallback!' : '❌ FAIL');

  // Test 5: No Emails + Format Detection
  console.log('\n\n📧 TEST 5: No Emails + Format Detected from Page Content\n');
  
  const pageWithFormat = 'Contact us at first.last@company.com format for all employees';
  const detectedEmail = webScraperService._chooseEmail([], websiteUrl, pageWithFormat);
  
  console.log('   Found Emails: (none)');
  console.log('   Page Content: "Contact us at first.last@company.com format..."');
  console.log('   ✅ Detected Format:', detectedEmail);
  console.log('   Expected: first.last@company.com');
  console.log('   Result:', detectedEmail === 'first.last@company.com' ? '✅ PASS - Smart format detection!' : '❌ FAIL');

  // Test 6: No Emails + No Format = Generic Fallback
  console.log('\n\n📧 TEST 6: No Emails + No Format Detected = Generic Fallback\n');
  
  const noFormatDetected = webScraperService._chooseEmail([], websiteUrl, 'Welcome to our company website');
  
  console.log('   Found Emails: (none)');
  console.log('   Page Content: "Welcome to our company website" (no format clues)');
  console.log('   ✅ Fallback:', noFormatDetected);
  console.log('   Expected: hello@company.com');
  console.log('   Result:', noFormatDetected === 'hello@company.com' ? '✅ PASS - Uses generic fallback!' : '❌ FAIL');

  // Test 4: Non-UK Phone (should not format)
  console.log('\n\n📞 TEST 4: Non-UK Phone (USA - Should Skip Formatting)\n');
  
  const usPhone = '020 1234 5678';
  const formattedUS = webScraperService._formatUKPhone(usPhone, 'United States');
  
  console.log(`   Input: ${usPhone} (United States)`);
  console.log(`   ✅ Output: ${formattedUS}`);
  console.log(`   Expected: ${usPhone} (unchanged)`);
  console.log(`   Result: ${formattedUS === usPhone ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ ALL TESTS COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

testEmailPhoneImprovements().catch(console.error);
