/**
 * Compile the Fee Router FunC smart contract
 * 
 * Run with: npx ts-node scripts/compile-contract.ts
 */

import { compileContract } from "ton-compiler";
import { Cell } from "@ton/core";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Compiling Fee Router contract...\n");

  const contractsDir = path.join(__dirname, "../contracts");

  try {
    // Compile contract using ton-compiler
    const result = await compileContract({
      files: [path.join(contractsDir, "fee-router.fc")],
      stdlib: true, // Include standard library
      version: "latest",
    });

    if (!result.ok) {
      console.error("Compilation failed:");
      console.error(result.log);
      process.exit(1);
    }

    // Get the compiled code
    const codeCell = Cell.fromBoc(result.output)[0];
    
    // Save the compiled code
    const outputDir = path.join(__dirname, "../build");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save as base64 and hex
    fs.writeFileSync(
      path.join(outputDir, "fee-router.compiled.json"),
      JSON.stringify({
        hex: codeCell.toBoc().toString("hex"),
        base64: codeCell.toBoc().toString("base64"),
      }, null, 2)
    );

    console.log("✅ Contract compiled successfully!");
    console.log(`📁 Output saved to: build/fee-router.compiled.json`);
    console.log(`📦 Code hash: ${codeCell.hash().toString("hex")}`);

  } catch (error) {
    console.error("Compilation error:", error);
    process.exit(1);
  }
}

main();
