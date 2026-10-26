import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface CertificateData {
  studentName: string;
  studentId?: string;
  affiliation?: string;
  eventTitle: string;
  category?: string;
  issueDate: string;
  certificateHash: string;
  organizerName?: string;
  clubName?: string;
}

export async function generateCertificatePDF(data: CertificateData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background Fill (Soft ivory/parchment tone)
  doc.setFillColor(252, 252, 254);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer Border (Navy Blue #1e1b4b)
  doc.setDrawColor(30, 27, 75);
  doc.setLineWidth(4);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner Gold Border (#d97706)
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1.2);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Corner Accents
  doc.setFillColor(217, 119, 6);
  doc.triangle(14, 14, 24, 14, 14, 24, 'F');
  doc.triangle(pageWidth - 14, 14, pageWidth - 24, 14, pageWidth - 14, 24, 'F');
  doc.triangle(14, pageHeight - 14, 24, pageHeight - 14, 14, pageHeight - 24, 'F');
  doc.triangle(pageWidth - 14, pageHeight - 14, pageWidth - 24, pageHeight - 14, pageWidth - 14, pageHeight - 24, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 27, 75);
  doc.text('ORCHESTR CAMPUS CREDENTIAL', pageWidth / 2, 34, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('EVERY EVENT. PERFECTLY COORDINATED. — VERIFIED ATTENDEE REGISTRY', pageWidth / 2, 41, { align: 'center' });

  // Certificate Of Completion Banner
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text('CERTIFICATE OF ACCOMPLISHMENT', pageWidth / 2, 58, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(71, 85, 105);
  doc.text('This is to officially certify that', pageWidth / 2, 69, { align: 'center' });

  // Recipient Name
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.studentName, pageWidth / 2, 85, { align: 'center' });

  // Underline
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 60, 89, pageWidth / 2 + 60, 89);

  // Affiliation / ID
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const subtext = data.studentId
    ? `${data.affiliation || 'Verified Campus Scholar'} • Student ID: ${data.studentId}`
    : (data.affiliation || 'Verified Campus Scholar');
  doc.text(subtext, pageWidth / 2, 96, { align: 'center' });

  // Event completion sentence
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text('has successfully attended and completed the active requirements for:', pageWidth / 2, 108, { align: 'center' });

  // Event Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(`"${data.eventTitle}"`, pageWidth / 2, 120, { align: 'center' });

  // Host info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const hostText = `Organized by ${data.clubName || 'Campus Tech Society'} • Verified Check-In Protocol`;
  doc.text(hostText, pageWidth / 2, 128, { align: 'center' });

  // Verification QR Code
  const verifyUrl = `${window.location.origin}/verify/${data.certificateHash}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 120,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    });
    doc.addImage(qrDataUrl, 'PNG', 26, 142, 34, 34);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('SCAN TO VERIFY ONLINE', 43, 180, { align: 'center' });
  } catch (err) {
    console.error('QR code generation failed:', err);
  }

  // Signatures and Dates
  // Date Block
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 27, 75);
  doc.text(new Date(data.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), 105, 162, { align: 'center' });
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(75, 165, 135, 165);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('DATE OF ISSUANCE', 105, 170, { align: 'center' });

  // Organizer Signature Block
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 27, 75);
  doc.text(data.organizerName || 'Priya Patel', 195, 162, { align: 'center' });
  doc.line(165, 165, 225, 165);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('EVENT DIRECTOR / LEAD', 195, 170, { align: 'center' });

  // Official Gold Seal Badge (Right side)
  doc.setFillColor(217, 119, 6);
  doc.circle(255, 155, 15, 'F');
  doc.setFillColor(254, 243, 199);
  doc.circle(255, 155, 13, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('ORCHESTR', 255, 153, { align: 'center' });
  doc.text('VERIFIED', 255, 158, { align: 'center' });

  // Bottom Hash Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(20, 188, pageWidth - 40, 10, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`TAMPER-PROOF VERIFICATION HASH: ${data.certificateHash}`, pageWidth / 2, 194.5, { align: 'center' });

  // Save PDF
  const filename = `Orchestr_Certificate_${data.studentName.replace(/\s+/g, '_')}_${data.certificateHash.slice(0, 8)}.pdf`;
  doc.save(filename);
}
