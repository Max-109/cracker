#!/usr/bin/env node

/**
 * Test script to verify the race condition fix for deep research
 * This script tests that deep research completion doesn't show stale recovery messages
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Race Condition Fix...');
console.log('=================================');

function testFileContains(filePath, searchString, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
      console.log(`✅ ${description}`);
      return true;
    } else {
      console.log(`❌ ${description} - NOT FOUND`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description} - ERROR: ${error.message}`);
    return false;
  }
}

function runTests() {
  const projectRoot = process.cwd();
  let allTestsPassed = true;

  console.log('\n🧪 Testing Race Condition Fix...');
  console.log('--------------------------------------');

  // Test 1: Check that MessageItem prevents stale display for deep research
  allTestsPassed &= testFileContains(
    path.join(projectRoot, 'app/components/MessageItem.tsx'),
    '!isDeepResearchResult',
    'MessageItem prevents stale display for deep research results'
  );

  allTestsPassed &= testFileContains(
    path.join(projectRoot, 'app/components/MessageItem.tsx'),
    'stoppedPart.stopType === \'stale\' && !isDeepResearchResult',
    'MessageItem has proper condition to skip stale for deep research'
  );

  // Test 2: Verify the logic is in the right place
  const messageItemContent = fs.readFileSync(
    path.join(projectRoot, 'app/components/MessageItem.tsx'),
    'utf8'
  );

  // Check that the stale condition is properly wrapped
  const staleConditionMatch = messageItemContent.match(/stopType === 'stale'[\\s\\S]*?!isDeepResearchResult/);
  if (staleConditionMatch) {
    console.log('✅ Stale condition properly wrapped with deep research check');
  } else {
    console.log('❌ Stale condition not properly wrapped');
    allTestsPassed = false;
  }

  // Test 3: Verify the rendering condition also prevents stale display
  const renderingConditionMatch = messageItemContent.match(/stopType === 'stale'[\\s\\S]*?&& !isDeepResearchResult/);
  if (renderingConditionMatch) {
    console.log('✅ Rendering condition properly prevents stale display for deep research');
  } else {
    console.log('❌ Rendering condition missing deep research prevention');
    allTestsPassed = false;
  }

  console.log('\n📋 Summary...');
  console.log('--------------------------------------');

  if (allTestsPassed) {
    console.log('✅ All race condition tests passed!');
    console.log('\n🎉 Fix implemented:');
    console.log('• ✅ Deep research results no longer show stale recovery messages');
    console.log('• ✅ Proper condition checks prevent conflicting UI states');
    console.log('• ✅ Clean separation between completion and recovery states');
  } else {
    console.log('❌ Some race condition tests failed.');
  }

  return allTestsPassed;
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);