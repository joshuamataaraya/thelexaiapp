import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { parse } from 'csv-parse/sync';

const s3Client = new S3Client({});
const S3_BUCKET = 'knowledge-base-thelexai-laws-datasource-cri';
const CGR_URL = 'https://cgrbuscador.cgr.go.cr/BuscadorWebCGR/testcsv?searchFacet=&searchFacetString=&tipoFacet=&searchText=&searchText1=&searchText2=&select1=+&select2=+&fInicio=&fFinal=&recurrido=&searchEsp=&pageAct=1';

interface CsvRecord {
  Row?: string;
  Link?: string;
  'Fecha emision'?: string;
  'Fecha publicacion'?: string;
  Institucion?: string;
  Emite?: string;
  'Tipo documental'?: string;
  Proceso?: string;
  Asunto?: string;
}

interface LambdaEvent {
  pageAct?: number;
}

export const handler = async (event: LambdaEvent) => {
  try {
    console.log('Starting CGR document fetcher');
    
    // Build URL with optional page parameter
    const pageAct = event.pageAct || 1;
    const url = `https://cgrbuscador.cgr.go.cr/BuscadorWebCGR/testcsv?searchFacet=&searchFacetString=&tipoFacet=&searchText=&searchText1=&searchText2=&select1=+&select2=+&fInicio=&fFinal=&recurrido=&searchEsp=&pageAct=${pageAct}`;
    
    console.log(`Fetching CSV from: ${url}`);
    
    // Fetch CSV data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log('CSV fetched successfully');
    
    // Parse CSV
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
      trim: true,
      relax_column_count: true,
    }) as CsvRecord[];
    
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Filter out header rows and rows without links
    const validRecords = records.filter(record => 
      record.Link && 
      record.Link.startsWith('http') &&
      record.Row &&
      !isNaN(parseInt(record.Row))
    );
    
    console.log(`Found ${validRecords.length} valid document records`);
    
    const results = {
      totalRecords: validRecords.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    // Process each document
    for (const record of validRecords) {
      try {
        const pdfUrl = record.Link!;
        console.log(`Processing: ${pdfUrl}`);
        
        // Download PDF
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
        
        const pdfBuffer = await pdfResponse.arrayBuffer();
        console.log(`Downloaded PDF: ${pdfUrl} (${pdfBuffer.byteLength} bytes)`);
        
        // Extract filename from URL
        const urlParts = pdfUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        // Create metadata from CSV record
        const metadata = {
          row: record.Row || '',
          fechaEmision: record['Fecha emision'] || '',
          fechaPublicacion: record['Fecha publicacion'] || '',
          institucion: record.Institucion || '',
          emite: record.Emite || '',
          tipoDocumental: record['Tipo documental'] || '',
          proceso: record.Proceso || '',
          asunto: record.Asunto || '',
          sourceUrl: pdfUrl,
        };
        
        // Upload to S3
        const s3Key = `cgr-documents/${filename}`;
        const putCommand = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: new Uint8Array(pdfBuffer),
          ContentType: 'application/pdf',
          Metadata: {
            row: metadata.row,
            fechaEmision: metadata.fechaEmision,
            fechaPublicacion: metadata.fechaPublicacion,
            institucion: metadata.institucion,
            emite: metadata.emite,
            tipoDocumental: metadata.tipoDocumental,
            proceso: metadata.proceso,
            sourceUrl: metadata.sourceUrl,
          },
        });
        
        await s3Client.send(putCommand);
        console.log(`Uploaded to S3: ${s3Key}`);
        
        results.successful++;
      } catch (error) {
        console.error(`Error processing record ${record.Row}:`, error);
        results.failed++;
        results.errors.push(`Row ${record.Row}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log('Processing complete:', results);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'CGR documents processed successfully',
        results,
      }),
    };
  } catch (error) {
    console.error('Error in CGR document fetcher:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing CGR documents',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
