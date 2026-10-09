import { z } from 'zod';
import {
  Aircraft,
  AircraftSchema,
  Aircrew,
  AircrewSchema,
  TargetRequest,
  TargetRequestSchema,
  MunitionStock,
  MunitionStockSchema,
} from '@air-power/shared';

export interface IngestionBatchResult<T> {
  success: boolean;
  totalRecordsProcessed: number;
  validRecords: T[];
  quarantinedRecords: {
    recordIndex: number;
    rawRecord: any;
    errorReason: string;
  }[];
  ingestionTimestampIso: string;
}

/**
 * External C2 / ATO System File-Drop & REST Ingestion Adapter
 * Supports CSV/JSON batches with strict Zod validation and Error Quarantine.
 */
export class ExternalSystemDataIngestionAdapter {
  /**
   * Ingests external aircraft serviceability updates from maintenance depots
   */
  public ingestAircraftBatch(rawJsonArray: any[]): IngestionBatchResult<Aircraft> {
    const validRecords: Aircraft[] = [];
    const quarantinedRecords: IngestionBatchResult<Aircraft>['quarantinedRecords'] = [];

    rawJsonArray.forEach((item, index) => {
      const parsed = AircraftSchema.safeParse(item);
      if (parsed.success) {
        validRecords.push(parsed.data);
      } else {
        quarantinedRecords.push({
          recordIndex: index,
          rawRecord: item,
          errorReason: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
      }
    });

    return {
      success: quarantinedRecords.length === 0,
      totalRecordsProcessed: rawJsonArray.length,
      validRecords,
      quarantinedRecords,
      ingestionTimestampIso: new Date().toISOString(),
    };
  }

  /**
   * Ingests target nominations from Joint Air Operations Center (JAOC) feeds
   */
  public ingestTargetRequests(rawJsonArray: any[]): IngestionBatchResult<TargetRequest> {
    const validRecords: TargetRequest[] = [];
    const quarantinedRecords: IngestionBatchResult<TargetRequest>['quarantinedRecords'] = [];

    rawJsonArray.forEach((item, index) => {
      const parsed = TargetRequestSchema.safeParse(item);
      if (parsed.success) {
        validRecords.push(parsed.data);
      } else {
        quarantinedRecords.push({
          recordIndex: index,
          rawRecord: item,
          errorReason: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
      }
    });

    return {
      success: quarantinedRecords.length === 0,
      totalRecordsProcessed: rawJsonArray.length,
      validRecords,
      quarantinedRecords,
      ingestionTimestampIso: new Date().toISOString(),
    };
  }

  /**
   * Parses and validates raw CSV line dumps from legacy operational spreadsheets
   */
  public parseAircraftCsv(csvText: string): IngestionBatchResult<Partial<Aircraft>> {
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) {
      return {
        success: false,
        totalRecordsProcessed: 0,
        validRecords: [],
        quarantinedRecords: [{ recordIndex: 0, rawRecord: csvText, errorReason: 'Empty CSV or header only' }],
        ingestionTimestampIso: new Date().toISOString(),
      };
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const validRecords: Partial<Aircraft>[] = [];
    const quarantinedRecords: IngestionBatchResult<Partial<Aircraft>>['quarantinedRecords'] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length < headers.length) {
        quarantinedRecords.push({
          recordIndex: i,
          rawRecord: lines[i],
          errorReason: `Column count mismatch: expected ${headers.length}, found ${cols.length}`,
        });
        continue;
      }

      try {
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = cols[idx];
        });

        if (!obj.tailNumber || !obj.type || !obj.status) {
          throw new Error('Missing mandatory fields (tailNumber, type, status)');
        }

        validRecords.push(obj);
      } catch (err: any) {
        quarantinedRecords.push({
          recordIndex: i,
          rawRecord: lines[i],
          errorReason: err.message || 'Malformed row',
        });
      }
    }

    return {
      success: quarantinedRecords.length === 0,
      totalRecordsProcessed: lines.length - 1,
      validRecords,
      quarantinedRecords,
      ingestionTimestampIso: new Date().toISOString(),
    };
  }
}
