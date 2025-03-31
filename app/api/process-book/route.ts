import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import handlebars from 'handlebars';
import puppeteer, { Browser, LaunchOptions } from 'puppeteer-core'; 
import chromium from '@sparticuz/chromium';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../../lib/prisma';
import { uploadToCloudinary } from '../../lib/cloudinary';

const compiledTemplates = new Map<string, handlebars.TemplateDelegate>();
const ALLOWED_TEMPLATES = ['classic', 'modern', 'minimalist'];
const DEFAULT_TEMPLATE = 'classic';

const getTemplate = async (templateName: string): Promise<handlebars.TemplateDelegate> => {
    const validTemplateName = ALLOWED_TEMPLATES.includes(templateName) ? templateName : DEFAULT_TEMPLATE;
    if (!ALLOWED_TEMPLATES.includes(templateName)) {
        console.warn(`[getTemplate] Warning: Requested template "${templateName}" not found or not allowed, using default "${DEFAULT_TEMPLATE}".`);
    }
    if (compiledTemplates.has(validTemplateName)) {
        return compiledTemplates.get(validTemplateName)!;
    }
    const currentWorkingDirectory = process.cwd();
    const templatePath = path.join(currentWorkingDirectory, 'templates', `${validTemplateName}.hbs`);
    try {
        const templateSource = await fs.readFile(templatePath, 'utf-8');
        const compiled = handlebars.compile(templateSource);
        compiledTemplates.set(validTemplateName, compiled);
        return compiled;
    } catch (error) {
        console.error(`[getTemplate] Error reading or compiling template "${validTemplateName}":`, error);
        throw new Error(`Could not load template: ${validTemplateName}`);
    }
};

export async function POST(req: NextRequest) {
    let browser: Browser | null = null;
    let dbRecordId: number | null = null;
    let processingError: string | null = null;
    let originalFilename = 'unknown.docx';
    let fileBuffer: Buffer | null = null;

    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    console.log(`Running in ${isProduction ? 'Production (Vercel/Deployed)' : 'Development/Local'} environment.`);

    try {
        console.log("Reading FormData...");
        const formData = await req.formData();

        const fileField = formData.get('file');
        if (!fileField || typeof fileField === 'string') { throw new Error("File field 'file' is missing or invalid in FormData."); }
        const file = fileField as File;
        originalFilename = file.name;
        console.log(`Received file: ${originalFilename}, Size: ${file.size}, Type: ${file.type}`);
        if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { throw new Error('Invalid file type. Only .docx files are allowed.'); }
        if (file.size > 10 * 1024 * 1024) { throw new Error('File size exceeds the 10MB limit.'); }
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        if (fileBuffer.byteLength === 0) { throw new Error("Uploaded file buffer is empty."); }
        console.log("File buffer created successfully.");

        const templateNameField = formData.get('templateName');
        let templateName = typeof templateNameField === 'string' ? templateNameField : DEFAULT_TEMPLATE;
        console.log(`Received template name request: "${templateNameField}", using: "${templateName}"`);

        const initialRecord = await prisma.book.create({ data: { originalFilename } });
        dbRecordId = initialRecord.id;
        console.log(`Created initial DB record with ID: ${dbRecordId}`);

        const originalUploadResult = await uploadToCloudinary(fileBuffer, 'book-formatter/originals','raw', `book-${dbRecordId}-${Date.now()}`);
        await prisma.book.update({ where: { id: dbRecordId }, data: { cloudinaryOriginalUrl: originalUploadResult?.url, cloudinaryOriginalSecureUrl: originalUploadResult?.secure_url }});
        console.log("Original file uploaded and DB updated.");

        const mammothResult = await mammoth.convertToHtml({ buffer: fileBuffer });
        const htmlContent = mammothResult.value;
        console.log("Content extracted via Mammoth.");

        const template = await getTemplate(templateName);
        const finalHtml = template({ content: htmlContent });
        console.log(`Template "${templateName}" applied.`);

        let launchOptions: LaunchOptions = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        };

        if (isProduction) {
            console.log("Configuring Puppeteer for Production (Vercel)...");
            const executablePath = await chromium.executablePath();
             if (!executablePath) {

                console.error("Chromium executable path was not found. Check @sparticuz/chromium setup and Vercel environment.");
                throw new Error("Could not get Chromium executable path for Vercel.");
            }
            console.log(`Using Vercel Chromium path: ${executablePath}`);
            launchOptions = {
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: executablePath,
                headless: chromium.headless, 
            };
        } else {
            console.log("Configuring Puppeteer for Local Development...");
            const localExecutablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

            try {
                await fs.access(localExecutablePath); 
                launchOptions.executablePath = localExecutablePath;
                launchOptions.headless = true; 
                console.log(`Using local executable path: ${localExecutablePath}`);
            } catch (err) {
                 console.error(`Error accessing local executable path (${localExecutablePath}): ${err}`);
                 console.warn("Could not access local Chrome path. Falling back - puppeteer-core might fail.");
                 throw new Error(`Local Chrome executable not found or accessible at the specified path: ${localExecutablePath}. Please update the path in the API route.`);
            }
        }

        console.log("Launching Puppeteer with options:", JSON.stringify(launchOptions, null, 2)); 
        browser = await puppeteer.launch(launchOptions);
        console.log("Puppeteer launched successfully.");

        const page = await browser.newPage();
        console.log("Setting page content...");
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        console.log("Generating PDF buffer...");
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' } });
        if (!pdfBuffer || pdfBuffer.byteLength < 100) { console.error("[PUPPETEER ERROR] PDF buffer is unexpectedly small or empty!"); }
        else { console.log(`Generated PDF buffer size: ${pdfBuffer.byteLength} bytes.`); }
        await browser.close();
        browser = null;
        console.log("PDF generated, browser closed.");

        const pdfUploadResult = await uploadToCloudinary(Buffer.from(pdfBuffer), 'book-formatter/pdfs','image', `book-${dbRecordId}-${Date.now()}`); // Ensure pdfBuffer is a Buffer
        await prisma.book.update({ where: { id: dbRecordId }, data: { cloudinaryPdfUrl: pdfUploadResult?.url, cloudinaryPdfSecureUrl: pdfUploadResult?.secure_url, processedAt: new Date(), errorMessage: null }});
        console.log("PDF uploaded and DB updated.");

        return NextResponse.json({ success: true, message: 'Book processed successfully!', bookId: dbRecordId, originalUrl: originalUploadResult?.secure_url, pdfUrl: pdfUploadResult?.secure_url });

    } catch (error: any) {
        console.error("Caught error in POST handler:", error);
        if (error.message.includes('Failed to launch') || error.message.includes('ENOENT') || error.message.includes('ENOEXEC') || error.message.includes('executablePath') || error.message.includes('channel') ) {
             processingError = `Failed to launch browser needed for PDF generation (Env: ${isProduction ? 'Production' : 'Local'}). Check Puppeteer setup and executable path. Error: ${error.message}`;
         } else {
            processingError = error.message || 'An unknown error occurred during processing.';
         }

        if (browser) {
            console.warn("Closing browser in error handler...");
            try { await browser.close(); }
            catch (closeError) { console.error("Error closing browser after main error:", closeError); }
            finally { browser = null; }
        }

        if (dbRecordId) {
             try {
                console.log(`Updating DB record ${dbRecordId} with error message.`);
                await prisma.book.update({ where: { id: dbRecordId }, data: { errorMessage: processingError } });
            } catch (dbError) { console.error(`Failed to update error status for book ID ${dbRecordId}:`, dbError); }
        } else { console.error("Processing failed before DB record creation."); }

        return NextResponse.json({ success: false, message: `Processing failed: ${processingError}`, bookId: dbRecordId, }, { status: 500 });

    } finally {
        if (browser) {
            console.warn("Browser instance might not have been closed properly in main flow or catch block.");
            try { await browser.close(); } catch {}
        }
        console.log("API request finished.");
    }
}