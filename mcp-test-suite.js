#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_CONFIG = {
  mcpServer: 'node mcp-server.js',
  inspector: 'npx @modelcontextprotocol/inspector',
  configFile: './mcp-config.json',
  testTimeout: 30000, // 30 seconds
  retryAttempts: 3
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function addTestResult(testName, status, details = '') {
  testResults.details.push({ testName, status, details, timestamp: new Date().toISOString() });
  if (status === 'passed') {
    testResults.passed++;
    log(`PASSED: ${testName}`, 'success');
  } else {
    testResults.failed++;
    log(`FAILED: ${testName} - ${details}`, 'error');
    testResults.errors.push({ testName, details });
  }
}

// Test functions
async function testMCPServerStartup() {
  log('Testing MCP Server Startup...');
  
  try {
    const serverProcess = spawn('node', ['mcp-server.js'], { 
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true 
    });
    
    let output = '';
    let errorOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    if (output.includes('Business Services Hub MCP server running') || errorOutput.includes('Business Services Hub MCP server running')) {
      addTestResult('MCP Server Startup', 'passed', 'Server started successfully');
    } else {
      addTestResult('MCP Server Startup', 'failed', `Server output: ${output}, Errors: ${errorOutput}`);
    }
    
    serverProcess.kill();
  } catch (error) {
    addTestResult('MCP Server Startup', 'failed', error.message);
  }
}

async function testMCPToolsList() {
  log('Testing MCP Tools List...');
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const command = `npx @modelcontextprotocol/inspector --cli --method "tools/list" --target "stdio" --config ./mcp-config.json`;
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    
    if (stdout.includes('get_user_profile') && stdout.includes('get_company_info') && stdout.includes('get_invoice_data')) {
      addTestResult('MCP Tools List', 'passed', 'All expected tools are available');
    } else {
      addTestResult('MCP Tools List', 'failed', `Unexpected output: ${stdout}`);
    }
  } catch (error) {
    addTestResult('MCP Tools List', 'failed', error.message);
  }
}

async function testMCPToolCalls() {
  log('Testing MCP Tool Calls...');
  
  const tools = [
    { name: 'get_user_profile', args: 'userId=test-user-123' },
    { name: 'get_company_info', args: 'companyId=test-company-456' },
    { name: 'get_invoice_data', args: 'invoiceId=test-invoice-789' }
  ];
  
  for (const tool of tools) {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const command = `npx @modelcontextprotocol/inspector --cli --method "tools/call" --target "stdio" --config ./mcp-config.json --tool-name "${tool.name}" --args "${tool.args}"`;
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      
      if (stdout.includes('content') && stdout.includes('text')) {
        addTestResult(`MCP Tool Call: ${tool.name}`, 'passed', 'Tool call successful');
      } else {
        addTestResult(`MCP Tool Call: ${tool.name}`, 'failed', `Unexpected output: ${stdout}`);
      }
    } catch (error) {
      addTestResult(`MCP Tool Call: ${tool.name}`, 'failed', error.message);
    }
  }
}

async function testAppBuild() {
  log('Testing App Build...');
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npm run build', { timeout: 60000 });
    
    if (stdout.includes('Route (app)') && !stderr.includes('Error')) {
      addTestResult('App Build', 'passed', 'Build completed successfully');
    } else {
      addTestResult('App Build', 'failed', `Build errors: ${stderr}`);
    }
  } catch (error) {
    addTestResult('App Build', 'failed', error.message);
  }
}

async function testAppLinting() {
  log('Testing App Linting...');
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npm run lint', { timeout: 30000 });
    
    if (!stderr.includes('Error') && !stdout.includes('error')) {
      addTestResult('App Linting', 'passed', 'No linting errors found');
    } else {
      addTestResult('App Linting', 'failed', `Linting errors: ${stderr || stdout}`);
      testResults.warnings.push('Linting issues detected');
    }
  } catch (error) {
    addTestResult('App Linting', 'failed', error.message);
  }
}

async function testFileStructure() {
  log('Testing File Structure...');
  
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'tailwind.config.js',
    'tsconfig.json',
    'app/layout.tsx',
    'app/page.tsx',
    'lib/supabase.ts',
    'middleware.ts'
  ];
  
  const requiredDirs = [
    'app',
    'components',
    'lib',
    'supabase'
  ];
  
  let allFilesExist = true;
  let missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      allFilesExist = false;
      missingFiles.push(file);
    }
  }
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      allFilesExist = false;
      missingFiles.push(dir);
    }
  }
  
  if (allFilesExist) {
    addTestResult('File Structure', 'passed', 'All required files and directories exist');
  } else {
    addTestResult('File Structure', 'failed', `Missing files/directories: ${missingFiles.join(', ')}`);
  }
}

async function testEnvironmentVariables() {
  log('Testing Environment Variables...');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  let allEnvVarsExist = true;
  let missingEnvVars = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      allEnvVarsExist = false;
      missingEnvVars.push(envVar);
    }
  }
  
  if (allEnvVarsExist) {
    addTestResult('Environment Variables', 'passed', 'All required environment variables are set');
  } else {
    addTestResult('Environment Variables', 'failed', `Missing environment variables: ${missingEnvVars.join(', ')}`);
    testResults.warnings.push('Environment variables not configured');
  }
}

async function testDependencies() {
  log('Testing Dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const criticalDeps = [
      'next',
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'typescript'
    ];
    
    let allDepsExist = true;
    let missingDeps = [];
    
    for (const dep of criticalDeps) {
      if (!dependencies[dep]) {
        allDepsExist = false;
        missingDeps.push(dep);
      }
    }
    
    if (allDepsExist) {
      addTestResult('Dependencies', 'passed', 'All critical dependencies are installed');
    } else {
      addTestResult('Dependencies', 'failed', `Missing dependencies: ${missingDeps.join(', ')}`);
    }
  } catch (error) {
    addTestResult('Dependencies', 'failed', error.message);
  }
}

async function testTypeScriptCompilation() {
  log('Testing TypeScript Compilation...');
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npx tsc --noEmit', { timeout: 30000 });
    
    if (!stderr.includes('error')) {
      addTestResult('TypeScript Compilation', 'passed', 'No TypeScript errors found');
    } else {
      addTestResult('TypeScript Compilation', 'failed', `TypeScript errors: ${stderr}`);
    }
  } catch (error) {
    addTestResult('TypeScript Compilation', 'failed', error.message);
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Comprehensive App Test Suite...');
  log('==========================================');
  
  const startTime = Date.now();
  
  // Run all tests
  await testFileStructure();
  await testDependencies();
  await testEnvironmentVariables();
  await testTypeScriptCompilation();
  await testAppLinting();
  await testAppBuild();
  await testMCPServerStartup();
  await testMCPToolsList();
  await testMCPToolCalls();
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Generate test report
  log('==========================================');
  log('📊 TEST RESULTS SUMMARY');
  log('==========================================');
  log(`Total Tests: ${testResults.passed + testResults.failed}`);
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log(`Warnings: ${testResults.warnings.length}`, testResults.warnings.length > 0 ? 'warning' : 'success');
  log(`Duration: ${duration.toFixed(2)}s`);
  
  if (testResults.errors.length > 0) {
    log('==========================================');
    log('❌ FAILED TESTS:');
    testResults.errors.forEach(error => {
      log(`  - ${error.testName}: ${error.details}`, 'error');
    });
  }
  
  if (testResults.warnings.length > 0) {
    log('==========================================');
    log('⚠️ WARNINGS:');
    testResults.warnings.forEach(warning => {
      log(`  - ${warning}`, 'warning');
    });
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    duration: duration,
    summary: {
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings.length
    },
    details: testResults.details,
    errors: testResults.errors,
    warnings: testResults.warnings
  };
  
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  log('📄 Detailed test report saved to test-report.json');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runAllTests().catch(error => {
  log(`Test suite failed with error: ${error.message}`, 'error');
  process.exit(1);
});
