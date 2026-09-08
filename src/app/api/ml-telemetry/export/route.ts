import { NextRequest, NextResponse } from 'next/server';
import { DatasetBuilder } from '@/lib/ml-telemetry/dataset-builder';
import { verifyBearerToken, requireAdmin, sanitizeApiError, ApiAuthError } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  // [C3 FIX] Admin role is now ENFORCED (was previously a no-op comment).
  // Any authenticated user could previously download the full ML CSV dataset.
  try {
    const { uid } = await verifyBearerToken(req);
    await requireAdmin(uid);
  } catch (error: unknown) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: sanitizeApiError(error) }, { status: error.httpStatus });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const model = searchParams.get('model') || '1';
    
    let dataset: any[] = [];
    let headers: string[] = [];
    let filename = '';
    
    if (model === '1') {
      dataset = await DatasetBuilder.buildModel1Dataset();
      headers = [
        'recommendationId', 'studentId', 'skillId', 'taskId', 'taskType',
        'historicalTheoryAvg', 'historicalPracticalAvg', 'practiceCompletionRate',
        'avgAttemptsPerPractice', 'skillVerified', 'targetNextScore', 'predictionAtT0',
        't0_timestamp', 'modelVersion'
      ];
      filename = 'ml_telemetry_dataset_model1.csv';
    } else if (model === '2') {
      dataset = await DatasetBuilder.buildModel2Dataset();
      headers = [
        'recommendationId', 'studentId', 'skillId', 'taskId', 'taskType', 'difficulty',
        'historicalTheoryAvg', 'historicalPracticalAvg', 'practiceCompletionRate',
        'recommendedTaskType', 'priorityScore', 'reason',
        'actualOutcomeScore', 'actualOutcomePassed',
        't0_timestamp', 'modelVersion'
      ];
      filename = 'ml_telemetry_dataset_model2.csv';
    } else {
      return NextResponse.json({ error: 'Invalid model specified' }, { status: 400 });
    }
    
    if (dataset.length === 0) {
      return NextResponse.json({ message: 'No telemetry data available for export.' }, { status: 200 });
    }
    
    const csvRows = [headers.join(',')];
    
    for (const row of dataset) {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) return '';
        // Escape strings that might have commas (like reason)
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    console.error('ML Telemetry Export Error:', error);
    // [H1 FIX] Do not expose error.message to the caller.
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
