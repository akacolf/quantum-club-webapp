/**
 * TON Contract Verification Script
 * 
 * This script submits contract source code to the TON Verifier backend
 * for on-chain verification. Once verified, explorers will show the
 * contract as verified instead of "SCAM".
 * 
 * Usage: npx ts-node scripts/verify-contract.ts <contract_address>
 */

import * as fs from 'fs';
import * as path from 'path';

const VERIFIER_BACKEND = 'https://ton-source-prod.ecs.everstake.one';

interface VerifyRequest {
    address: string;
    files: { name: string; content: string }[];
    compiler: string;
    version: string;
    commandLine: string;
}

async function verifyContract(contractAddress: string) {
    console.log('TON Contract Verifier');
    console.log('=====================');
    console.log(`Contract: ${contractAddress}`);
    console.log('');

    // Read source files
    const contractsDir = path.join(__dirname, '..', 'contracts');
    
    const files = [
        { name: 'stdlib.fc', path: path.join(contractsDir, 'imports/stdlib.fc') },
        { name: 'jetton_master.fc', path: path.join(contractsDir, 'jetton_master.fc') },
        { name: 'jetton_wallet.fc', path: path.join(contractsDir, 'jetton_wallet.fc') },
    ];

    const sourceFiles = files.map(file => {
        if (!fs.existsSync(file.path)) {
            throw new Error(`Source file not found: ${file.path}`);
        }
        return {
            name: file.name,
            content: fs.readFileSync(file.path, 'utf-8'),
        };
    });

    console.log('Source files loaded:');
    sourceFiles.forEach(f => console.log(`  - ${f.name} (${f.content.length} bytes)`));
    console.log('');

    // Prepare verification request
    const request: VerifyRequest = {
        address: contractAddress,
        files: sourceFiles,
        compiler: 'func',
        version: '0.4.4', // Match your compilation version
        commandLine: '-SPA stdlib.fc jetton_master.fc', // Adjust based on your compile command
    };

    console.log('Submitting to verifier...');
    
    try {
        // Step 1: Submit sources for compilation
        const compileResponse = await fetch(`${VERIFIER_BACKEND}/compile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sources: request.files.map(f => ({
                    filename: f.name,
                    content: f.content,
                })),
                compiler: request.compiler,
                version: request.version,
                commandLine: request.commandLine,
            }),
        });

        if (!compileResponse.ok) {
            const error = await compileResponse.text();
            throw new Error(`Compilation failed: ${error}`);
        }

        const compileResult = await compileResponse.json();
        console.log('Compilation result:', compileResult);

        if (compileResult.codeCellHash) {
            console.log(`\nCode cell hash: ${compileResult.codeCellHash}`);
            console.log('\nNext steps:');
            console.log('1. Go to https://verifier.ton.org');
            console.log('2. Enter your contract address');
            console.log('3. Upload the source files');
            console.log('4. Complete verification through the UI');
        }

    } catch (error) {
        console.error('Verification error:', error);
        console.log('\nAlternative: Manual verification');
        console.log('================================');
        console.log('1. Go to https://verifier.ton.org');
        console.log(`2. Enter contract address: ${contractAddress}`);
        console.log('3. Upload files in this order:');
        console.log('   - contracts/imports/stdlib.fc');
        console.log('   - contracts/jetton_master.fc');
        console.log('4. Select compiler version: func 0.4.4');
        console.log('5. Click "Verify"');
    }
}

// Get contract address from command line
const address = process.argv[2];

if (!address) {
    console.log('Usage: npx ts-node scripts/verify-contract.ts <contract_address>');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node scripts/verify-contract.ts EQACVgYkBldXS7emkuBQtNCMq84yuccBl1FkLY4jeKCSIS4b');
    process.exit(1);
}

verifyContract(address).catch(console.error);
