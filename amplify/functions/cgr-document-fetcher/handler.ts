import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({});
const S3_BUCKET = process.env.S3_BUCKET || 'knowledge-base-thelexai-laws-datasource-cri';
const CGR_BASE_URL = 'https://cgrbuscador.cgr.go.cr/BuscadorWebCGR/testcsv';
const MAX_CONCURRENT_DOWNLOADS = 5;
const FETCH_TIMEOUT_MS = 300000; // 5 minutes timeout for slow server
const MAX_RETRIES = 3;

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
  startPage?: number;
  maxPages?: number;
  searchFacet?: string;
  searchFacetString?: string;
  tipoFacet?: string;
  searchText?: string;
  searchText1?: string;
  searchText2?: string;
  select1?: string;
  select2?: string;
  fInicio?: string;
  fFinal?: string;
  recurrido?: string;
  searchEsp?: string;
}

interface PageInfo {
  totalDocuments: number;
  currentPage: number;
  records: CsvRecord[];
}

// Helper function to fetch with timeout and retry
const fetchWithTimeout = async (url: string, retries = MAX_RETRIES): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      // @ts-ignore - Node.js fetch undici options
      headersTimeout: FETCH_TIMEOUT_MS,
      bodyTimeout: FETCH_TIMEOUT_MS,
      connectTimeout: FETCH_TIMEOUT_MS,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    
    if (retries > 0) {
      console.log(`Fetch failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}). Error: ${error instanceof Error ? error.message : String(error)}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return fetchWithTimeout(url, retries - 1);
    }
    
    throw error;
  }
};

// Fetch and parse a single page
const fetchPage = async (pageNumber: number, searchParams: Record<string, string> = {}): Promise<PageInfo> => {
  const params = new URLSearchParams({
    searchFacet: searchParams.searchFacet || '',
    searchFacetString: searchParams.searchFacetString || '',
    tipoFacet: searchParams.tipoFacet || '',
    searchText: searchParams.searchText || '',
    searchText1: searchParams.searchText1 || '',
    searchText2: searchParams.searchText2 || '',
    select1: searchParams.select1 || ' ',
    select2: searchParams.select2 || ' ',
    fInicio: searchParams.fInicio || '',
    fFinal: searchParams.fFinal || '',
    recurrido: searchParams.recurrido || '',
    searchEsp: searchParams.searchEsp || '',
    pageAct: pageNumber.toString(),
  });
  const url = `${CGR_BASE_URL}?${params.toString()}`;
  
  console.log(`Fetching CSV from page ${pageNumber}: ${url}`);
  
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV page ${pageNumber}: ${response.status} ${response.statusText}`);
  }
  
  const csvText = await response.text();
  console.log(`CSV page ${pageNumber} fetched successfully`);
  
  // Parse CSV
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    trim: true,
    relax_column_count: true,
  }) as CsvRecord[];
  
  console.log(`Parsed ${records.length} records from CSV page ${pageNumber}`);
  
  // Extract total documents and current page from CSV metadata rows
  let totalDocuments = 0;
  let currentPage = pageNumber;
  
  for (const record of records) {
    // Look for " Cantidad Documentos;129387" format
    if (record.Row?.trim().includes('Cantidad Documentos')) {
      const docCount = record.Link || '';
      totalDocuments = parseInt(docCount) || 0;
    }
    // Look for "Pagina;1" format
    if (record.Row?.trim() === 'Pagina') {
      const pageNum = record.Link || '';
      currentPage = parseInt(pageNum) || pageNumber;
    }
  }
  
  // Filter out header rows and rows without links
  const validRecords = records.filter(record => 
    record.Link && 
    record.Link.startsWith('http') &&
    record.Row &&
    !isNaN(parseInt(record.Row))
  );
  
  console.log(`Found ${validRecords.length} valid document records on page ${pageNumber}`);
  
  return {
    totalDocuments,
    currentPage,
    records: validRecords,
  };
};

export const handler = async (event: LambdaEvent) => {
  try {
    console.log('Starting CGR document fetcher - fetching all pages');
    console.log('Event parameters:', JSON.stringify(event, null, 2));
    
    const startPage = event.startPage || 1;
    const maxPages = event.maxPages || 9999; // Maximum pages to fetch (safety limit)
    
    // Extract search parameters from event
    const searchParams = {
      searchFacet: event.searchFacet || '',
      searchFacetString: event.searchFacetString || '',
      tipoFacet: event.tipoFacet || '',
      searchText: event.searchText || '',
      searchText1: event.searchText1 || '',
      searchText2: event.searchText2 || '',
      select1: event.select1 || ' ',
      select2: event.select2 || ' ',
      fInicio: event.fInicio || '',
      fFinal: event.fFinal || '',
      recurrido: event.recurrido || '',
      searchEsp: event.searchEsp || '',
    };
    
    // Fetch first page to get total document count
    const firstPage = await fetchPage(startPage, searchParams);
    console.log(`Total documents in system: ${firstPage.totalDocuments}`);
    
    // Calculate approximate total pages (assuming ~10-20 documents per page)
    const estimatedDocsPerPage = Math.max(firstPage.records.length, 10);
    const estimatedTotalPages = firstPage.totalDocuments > 0 
      ? Math.ceil(firstPage.totalDocuments / estimatedDocsPerPage)
      : maxPages;
    
    const totalPagesToFetch = Math.min(estimatedTotalPages, maxPages);
    console.log(`Estimated ${estimatedTotalPages} total pages, will fetch up to ${totalPagesToFetch} pages`);
    
    // Collect all valid records from all pages
    const allValidRecords: CsvRecord[] = [...firstPage.records];
    
    // Fetch remaining pages
    let currentPage = startPage + 1;
    let consecutiveEmptyPages = 0;
    const maxConsecutiveEmptyPages = 3; // Stop if we get 3 empty pages in a row
    
    while (currentPage <= totalPagesToFetch && consecutiveEmptyPages < maxConsecutiveEmptyPages) {
      try {
        const pageData = await fetchPage(currentPage, searchParams);
        
        if (pageData.records.length === 0) {
          consecutiveEmptyPages++;
          console.log(`Page ${currentPage} is empty (${consecutiveEmptyPages}/${maxConsecutiveEmptyPages} consecutive empty pages)`);
          
          // If we've hit empty pages, we might be at the end
          if (consecutiveEmptyPages >= maxConsecutiveEmptyPages) {
            console.log('Reached end of available pages');
            break;
          }
        } else {
          consecutiveEmptyPages = 0; // Reset counter if we find records
          allValidRecords.push(...pageData.records);
          console.log(`Added ${pageData.records.length} records from page ${currentPage}. Total so far: ${allValidRecords.length}`);
        }
        
        currentPage++;
        
        // Small delay between pages to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error);
        // Don't count fetch errors as empty pages - retry or continue
        // Only increment currentPage to continue to next page
        currentPage++;
      }
    }
    
    console.log(`Finished fetching pages. Total records collected: ${allValidRecords.length}`);
    
    const results = {
      totalPages: currentPage - startPage,
      totalRecords: allValidRecords.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    // Helper function to sanitize metadata values for S3 (ASCII only)
    const sanitizeMetadata = (value: string): string => {
      // S3 metadata limit is 2048 bytes per key, URL encoding expands size
      // Start with reasonable substring, encode, then truncate if needed
      let encoded = encodeURIComponent(value.substring(0, 1000));
      if (encoded.length > 2048) {
        encoded = encoded.substring(0, 2048);
      }
      return encoded;
    };
    
    // Process document with error handling
    const processDocument = async (record: CsvRecord) => {
      const pdfUrl = record.Link!;
      console.log(`Processing: ${pdfUrl}`);
      
      // Download PDF
      const pdfResponse = await fetchWithTimeout(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer();
      console.log(`Downloaded PDF: ${pdfUrl} (${pdfBuffer.byteLength} bytes)`);
      
      // Extract filename from URL, removing query parameters and sanitizing
      const urlObj = new URL(pdfUrl);
      const pathParts = urlObj.pathname.split('/');
      let filename = pathParts[pathParts.length - 1];
      // Remove any non-alphanumeric characters except dots, hyphens, and underscores
      // Collapse multiple underscores to single underscore for readability
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
      
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
      
      // Upload to S3 with unique key to prevent collisions
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueId = randomUUID().split('-')[0]; // Use first segment of UUID
      const s3Key = `cgr-documents/${timestamp}_${uniqueId}_${filename}`;
      
      const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: new Uint8Array(pdfBuffer),
        ContentType: 'application/pdf',
        Metadata: {
          row: sanitizeMetadata(metadata.row),
          fechaEmision: sanitizeMetadata(metadata.fechaEmision),
          fechaPublicacion: sanitizeMetadata(metadata.fechaPublicacion),
          institucion: sanitizeMetadata(metadata.institucion),
          emite: sanitizeMetadata(metadata.emite),
          tipoDocumental: sanitizeMetadata(metadata.tipoDocumental),
          proceso: sanitizeMetadata(metadata.proceso),
          asunto: sanitizeMetadata(metadata.asunto),
          sourceUrl: sanitizeMetadata(metadata.sourceUrl),
        },
      });
      
      await s3Client.send(putCommand);
      console.log(`Uploaded to S3: ${s3Key}`);
      
      return { success: true, row: record.Row };
    };
    
    // Process documents in batches with concurrency control
    for (let i = 0; i < allValidRecords.length; i += MAX_CONCURRENT_DOWNLOADS) {
      const batch = allValidRecords.slice(i, i + MAX_CONCURRENT_DOWNLOADS);
      const batchResults = await Promise.allSettled(
        batch.map(record => processDocument(record))
      );
      
      // Aggregate results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const record = batch[j];
        
        if (result.status === 'fulfilled') {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(
            `Row ${record.Row}: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`
          );
          console.error(`Error processing record ${record.Row}:`, result.reason);
        }
      }
      
      // Log progress periodically
      if ((i + MAX_CONCURRENT_DOWNLOADS) % 50 === 0 || i + MAX_CONCURRENT_DOWNLOADS >= allValidRecords.length) {
        console.log(`Progress: ${Math.min(i + MAX_CONCURRENT_DOWNLOADS, allValidRecords.length)}/${allValidRecords.length} documents processed`);
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
