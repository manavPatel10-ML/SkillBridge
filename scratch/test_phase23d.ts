import { runFeatureTests } from '../src/lib/ml-features/feature.test';
import { DatasetBuilder } from '../src/lib/ml-telemetry/dataset-builder';

async function main() {
  console.log("=== Phase 23D Validation ===");
  
  // 1. Run Leakage Tests
  runFeatureTests();
  
  console.log("\n=== Dataset Builders Validation ===");
  // 2. Validate Dataset Builders
  const model1Data = await DatasetBuilder.buildModel1Dataset();
  console.log(`Model 1 Dataset Rows Built: ${model1Data.length}`);
  if (model1Data.length > 0) {
      console.log('Sample Model 1 Row:', JSON.stringify(model1Data[0], null, 2));
  }
  
  const model2Data = await DatasetBuilder.buildModel2Dataset();
  console.log(`Model 2 Dataset Rows Built: ${model2Data.length}`);
  
  console.log("\n=== FINISHED ===");
}

main().catch(console.error);
