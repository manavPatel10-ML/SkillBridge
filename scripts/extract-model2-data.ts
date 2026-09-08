import { DatasetBuilder } from '../src/lib/ml-telemetry/dataset-builder';
import * as fs from 'fs';
import * as path from 'path';

async function extractModel2Data() {
  console.log('Extracting Model 2 telemetry data...');
  const data = await DatasetBuilder.buildModel2Dataset();
  
  if (data.length === 0) {
    console.log('No eligible Model 2 data found (requires actual outcomes).');
    process.exit(0);
  }
  
  const outputDir = path.join(process.cwd(), 'ml', 'model2', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'model2_dataset.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  
  console.log(`Successfully extracted ${data.length} Model 2 training examples to ${outputPath}`);
  process.exit(0);
}

extractModel2Data().catch(e => {
  console.error(e);
  process.exit(1);
});
