import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface QuoteData {
  reference: string;
  date: string;
  validUntil: string;
  provider: {
    name: string;
    type: string;
  };
  client: {
    name: string;
    email: string;
  };
  boat: {
    name: string;
    type: string;
  };
  services: Array<{
    name: string;
    description: string;
    amount: number;
  }>;
  totalAmount: number;
  isInvoice?: boolean;
  depositAmount?: number;
  paymentDueDate?: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const generateQuotePDF = async (quote: QuoteData) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${quote.isInvoice ? 'Facture' : 'Devis'} ${quote.reference}</title>
        <style>
          body {
            font-family: 'Helvetica', sans-serif;
            margin: 0;
            padding: 40px;
            color: #1a1a1a;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            width: 120px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .reference {
            color: #666;
            margin-bottom: 20px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #0066CC;
          }
          .info-row {
            margin-bottom: 8px;
          }
          .info-label {
            color: #666;
          }
          .services {
            margin-top: 40px;
          }
          .service {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #f0f0f0;
          }
          .service-name {
            font-weight: bold;
            margin-bottom: 8px;
          }
          .service-description {
            color: #666;
            margin-bottom: 8px;
          }
          .service-amount {
            text-align: right;
            color: #0066CC;
            font-weight: bold;
          }
          .total {
            margin-top: 40px;
            text-align: right;
          }
          .total-label {
            font-size: 18px;
            font-weight: bold;
          }
          .total-amount {
            font-size: 24px;
            color: #0066CC;
            font-weight: bold;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .payment-info {
            margin-top: 40px;
            padding: 20px;
            background-color: #f0f7ff;
            border-radius: 8px;
          }
          .payment-info-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #0066CC;
          }
          .payment-info-row {
            margin-bottom: 8px;
          }
          .corporate-info {
            margin-top: 20px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 8px;
            text-align: center;
          }
          .corporate-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #0066CC;
          }
          .corporate-text {
            color: #666;
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://res.cloudinary.com/dm89xtogy/image/upload/v1744128786/LOGO_YOURBOATMANAGER_p8a3jv.jpg" alt="Logo" class="logo">
          <div class="title">${quote.isInvoice ? 'Facture' : 'Devis'}</div>
          <div class="reference">${quote.reference}</div>
        </div>

        <div class="section">
          <div class="section-title">Informations</div>
          <div class="info-row">
            <span class="info-label">Date d'émission :</span> ${formatDate(quote.date)}
          </div>
          ${!quote.isInvoice ? `
            <div class="info-row">
              <span class="info-label">Date de validité :</span> ${formatDate(quote.validUntil)}
            </div>
          ` : quote.paymentDueDate ? `
            <div class="info-row">
              <span class="info-label">Date d'échéance :</span> ${formatDate(quote.paymentDueDate)}
            </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">Prestataire</div>
          <div class="info-row">
            <span class="info-label">Nom :</span> ${quote.provider.name}
          </div>
          <div class="info-row">
            <span class="info-label">Type :</span> ${quote.provider.type === 'boat_manager' ? 'Boat Manager' : 'Entreprise du nautisme'}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Client</div>
          <div class="info-row">
            <span class="info-label">Nom :</span> ${quote.client.name}
          </div>
          <div class="info-row">
            <span class="info-label">Email :</span> ${quote.client.email}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Bateau</div>
          <div class="info-row">
            <span class="info-label">Nom :</span> ${quote.boat.name}
          </div>
          <div class="info-row">
            <span class="info-label">Type :</span> ${quote.boat.type}
          </div>
        </div>

        <div class="services">
          <div class="section-title">Services</div>
          ${quote.services.map(service => `
            <div class="service">
              <div class="service-name">${service.name}</div>
              <div class="service-description">${service.description}</div>
              <div class="service-amount">${formatAmount(service.amount)}</div>
            </div>
          `).join('')}
        </div>

        <div class="total">
          <div class="total-label">Total TTC</div>
          <div class="total-amount">${formatAmount(quote.totalAmount)}</div>
        </div>

        ${quote.isInvoice ? `
          <div class="payment-info">
            <div class="payment-info-title">Informations de paiement</div>
            ${quote.depositAmount ? `
              <div class="deposit-section">
                <div class="deposit-row">
                  <span class="info-label">Montant total :</span> ${formatAmount(quote.totalAmount)}
                </div>
                <div class="deposit-row">
                  <span class="info-label">Acompte :</span> ${formatAmount(quote.depositAmount)}
                </div>
                <div class="deposit-row">
                  <span class="info-label">Reste à payer :</span> ${formatAmount(quote.totalAmount - quote.depositAmount)}
                </div>
              </div>
            ` : ''}
            <div class="payment-info-row">
              <span class="info-label">IBAN :</span> FR76 XXXX XXXX XXXX XXXX XXXX XXX
            </div>
            <div class="payment-info-row">
              <span class="info-label">BIC :</span> XXXXXXXX
            </div>
            <div class="payment-info-row">
              <span class="info-label">Référence :</span> ${quote.reference}
            </div>
          </div>

          <div class="corporate-info">
            <div class="corporate-title">Facture émise par Your Boat Manager Corporate</div>
            <div class="corporate-text">
              Cette facture a été générée par Your Boat Manager Corporate au nom de ${quote.provider.name}.
            </div>
            <div class="corporate-text">
              Pour toute question concernant cette facture, veuillez contacter notre service client.
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p>Your Boat Manager - Facilitateur de plaisance</p>
          <p>SIRET: 123 456 789 00012 - TVA: FR12 123 456 789</p>
          <p>123 Avenue de la Mer, 13000 Marseille - contact@yourboatmanager.com</p>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await Print.printToFileAsync({
      html,
      base64: false
    });

    if (!result || !result.uri) {
      throw new Error('Failed to generate PDF: No URI returned');
    }

    if (Platform.OS === 'web') {
      // For web, open the PDF in a new tab
      const pdfWindow = window.open(result.uri, '_blank');
      if (!pdfWindow) {
        throw new Error('Failed to open PDF in new window. Please check if pop-ups are blocked.');
      }
    } else {
      // For mobile, share the file
      await Sharing.shareAsync(result.uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
    }

    return result.uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};