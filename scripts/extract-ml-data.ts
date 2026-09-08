import * as fs from 'fs';
import * as path from 'path';
import { DatasetBuilder } from '../src/lib/ml-telemetry/dataset-builder';

async function main() {
    console.log("Extracting ML Dataset...");
    try {
        const dataset = await DatasetBuilder.buildModel1Dataset();
        const outDir = path.join(__dirname, '..', 'ml', 'model1', 'data');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        
        const outPath = path.join(outDir, 'dataset.json');
        fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));
        console.log(`Successfully extracted ${dataset.length} rows to ${outPath}`);
    } catch (e: any) {
        console.error("Extraction failed:", e.message);
        // We write an empty array to allow the python script to run and fail validation gracefully
        const outDir = path.join(__dirname, '..', 'ml', 'model1', 'data');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        const outPath = path.join(outDir, 'dataset.json');
        fs.writeFileSync(outPath, JSON.stringify([]));
        console.log(`Wrote empty dataset to ${outPath} due to extraction failure.`);
    }
}

main();
