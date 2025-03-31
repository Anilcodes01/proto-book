import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import handlebars from 'handlebars';
import puppeteer, { Browser } from 'puppeteer';
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
        console.log(`[getTemplate] Using cached compiled template: ${validTemplateName}`);
        return compiledTemplates.get(validTemplateName)!;
    }

    const currentWorkingDirectory = process.cwd();
    const templatePath = path.join(currentWorkingDirectory, 'templates', `${validTemplateName}.hbs`);
    console.log(`[getTemplate] Attempting to read template: ${templatePath}`);

    try {
        const templateSource = await fs.readFile(templatePath, 'utf-8');
        const compiled = handlebars.compile(templateSource);
        compiledTemplates.set(validTemplateName, compiled); 
        console.log(`[getTemplate] Successfully compiled and cached: ${validTemplateName}`);
        return compiled;
    } catch (error) {
        console.error(`[getTemplate] Error reading or compiling template "${validTemplateName}":`, error);
        throw new Error(`Could not load template: ${validTemplateName}`);
    }
}

export async function POST(req: NextRequest) {
    let browser: Browser | null = null;
    let dbRecordId: number | null = null;
    let processingError: string | null = null;
    let originalFilename = 'unknown.docx';
    let fileBuffer: Buffer | null = null; 

    try {
        console.log("Reading FormData...");
        const formData = await req.formData();

        const fileField = formData.get('file');
        if (!fileField || typeof fileField === 'string') {
             throw new Error("File field 'file' is missing or invalid in FormData.");
        }
        const file = fileField as File;
        originalFilename = file.name;
        console.log(`Received file: ${originalFilename}, Size: ${file.size}, Type: ${file.type}`);

        if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            throw new Error('Invalid file type. Only .docx files are allowed.');
        }

        if (file.size > 10 * 1024 * 1024) { 
            throw new Error('File size exceeds the 10MB limit.');
        }

        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        if (fileBuffer.byteLength === 0) {
            throw new Error("Uploaded file buffer is empty.");
        }
        console.log("File buffer created successfully.");

        const templateNameField = formData.get('templateName');
        let templateName = typeof templateNameField === 'string' ? templateNameField : DEFAULT_TEMPLATE;
        console.log(`Received template name request: "${templateNameField}", using: "${templateName}"`);
 
        const initialRecord = await prisma.book.create({ data: { originalFilename } });
        dbRecordId = initialRecord.id;
        console.log(`Created initial DB record with ID: ${dbRecordId}`);

        const originalUploadResult = await uploadToCloudinary(
            fileBuffer,
            'book-formatter/originals',
            'raw',
            `book-${dbRecordId}-${Date.now()}`
        );
        await prisma.book.update({
            where: { id: dbRecordId },
            data: {
                cloudinaryOriginalUrl: originalUploadResult?.url,
                cloudinaryOriginalSecureUrl: originalUploadResult?.secure_url,
            },
        });
        console.log("Original file uploaded and DB updated.");

        const mammothResult = await mammoth.convertToHtml({ buffer: fileBuffer });
        const htmlContent = mammothResult.value;
        console.log("Content extracted via Mammoth.");

        const template = await getTemplate(templateName);
        const finalHtml = template({ content: htmlContent });
        console.log(`Template "${templateName}" applied.`);

        console.log("Launching Puppeteer...");
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' } });
        if (!pdfBuffer || pdfBuffer.byteLength < 100) {
            console.error("[PUPPETEER ERROR] PDF buffer is unexpectedly small or empty!");
 
        }
        await browser.close();
        browser = null;
        console.log("PDF generated, browser closed.");

        const pdfUploadResult = await uploadToCloudinary(
            Buffer.from(pdfBuffer),
            'book-formatter/pdfs',
            'image',
            `book-${dbRecordId}-${Date.now()}`
        );
        await prisma.book.update({
            where: { id: dbRecordId },
            data: {
                cloudinaryPdfUrl: pdfUploadResult?.url,
                cloudinaryPdfSecureUrl: pdfUploadResult?.secure_url,
                processedAt: new Date(),
                errorMessage: null,
            },
        });
         console.log("PDF uploaded and DB updated.");

        return NextResponse.json({
            success: true,
            message: 'Book processed successfully!',
            bookId: dbRecordId,
            originalUrl: originalUploadResult?.secure_url,
            pdfUrl: pdfUploadResult?.secure_url,
        });

    } catch (error: any) {
        console.error("Caught error in POST handler:", error);
        processingError = error.message || 'An unknown error occurred during processing.';
        
        if (dbRecordId) { }
        else { console.error("Processing failed before DB record creation."); }

        return NextResponse.json({
            success: false,
            message: `Processing failed: ${processingError}`,
            bookId: dbRecordId,
        }, { status: 500 });

    } finally {
  
        if (browser) { /* ... */ }
        console.log("API request finished.");
    }
}