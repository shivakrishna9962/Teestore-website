export interface Invoice {
    _id?: string;
    order: string;
    invoiceNumber: string;
    pdfUrl: string;
    generatedAt?: Date;
}
