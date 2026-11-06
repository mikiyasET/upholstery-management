import { formatCurrency, formatStatus, formatPaymentMethod, formatBrandSizeLabel, formatAppDate } from './utils';
import { formatPlateNumber } from '../utils/plate';
import JsBarcode from 'jsbarcode';
import i18n from '../i18n';

export const generateBarcodeSvg = (text: string): string => {
  if (!text) return '';
  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, text, {
      format: 'CODE128',
      lineColor: '#1f2937',
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0,
    });
    return new XMLSerializer().serializeToString(svgNode);
  } catch (err) {
    console.error('Barcode generation error:', err);
    return '';
  }
};

const getCommonA4Styles = (title: string) => `
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      min-height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      background-color: #ffffff;
      font-size: 13px;
      line-height: 1.45;
      padding: 4px;
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .watermark-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 540px;
      max-width: 85%;
      opacity: 0.07;
      pointer-events: none;
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .watermark-container img {
      width: 100%;
      height: auto;
      object-fit: contain;
    }
    .content-layer {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      flex: 1 0 auto;
      min-height: calc(100vh - 16px);
    }
    @media print {
      .content-layer {
        min-height: 275mm;
      }
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .company-logo {
      height: 60px;
      width: auto;
      object-fit: contain;
      margin-right: 14px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 18px;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }
    table.items-table th {
      background: #f3f4f6;
      border-top: 1px solid #e5e7eb;
      border-bottom: 2px solid #d1d5db;
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    table.items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
      color: #1f2937;
    }
    table.items-table tr:nth-child(even) td {
      background-color: #fafafa;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 18px;
      align-items: start;
      margin-bottom: 18px;
    }
    .card-box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .barcode-section {
      text-align: center;
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
      margin-top: auto;
      padding-bottom: 4px;
    }
  </style>
`;

export const printDirectSaleReceipt = (saleData: any) => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;

  const isAm = i18n.language === 'am';

  const subtotal = saleData.lines?.reduce((sum: number, line: any) =>
    sum + (Number(line.priceAtSaleTime) * Number(line.quantity)), 0) || 0;

  const taxAmount = Number(saleData.taxAmount) || 0;
  const discountAmount = Number(saleData.discountAmount) || 0;
  const netTotal = Number(saleData.totalAmount || (subtotal - discountAmount + taxAmount));
  const totalPaid = saleData.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
  const balanceDue = Math.max(0, netTotal - totalPaid);
  const isFullyPaid = saleData.status === 'PAID' || balanceDue <= 0;

  const customerName = saleData.customerName || (saleData.customer?.name) || i18n.t('receipt.walkInCustomer', 'Walk-in Client');
  const customerPhone = saleData.customerPhone || (saleData.customer?.phoneNumber || saleData.customer?.phone) || '';
  const cashierName = saleData.cashier?.name || '';
  const formattedDate = saleData.saleDateTime ? formatAppDate(saleData.saleDateTime, true) : 'N/A';

  const rowsHtml = (saleData.lines || []).map((line: any, idx: number) => {
    const itemName = isAm && line.material?.nameAm ? line.material.nameAm : (line.material?.nameEn || i18n.t('receipt.material', 'Item'));
    const categoryName = isAm && line.material?.category?.nameAm ? line.material.category.nameAm : line.material?.category?.nameEn;
    const brandLabel = formatBrandSizeLabel({ name: line.brandName, size: line.sizeName, color: line.colorName, type: line.typeName });
    const brandBadge = brandLabel
      ? `<span style="font-size: 10px; font-weight: 700; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 1px 5px; border-radius: 3px; margin-left: 6px;">${brandLabel}</span>`
      : '';
    const unitPrice = Number(line.priceAtSaleTime || 0);
    const qty = Number(line.quantity || 1);
    const lineTotal = unitPrice * qty;

    return `
      <tr>
        <td style="color: #6b7280; font-weight: 600; text-align: center; width: 32px;">${idx + 1}</td>
        <td>
          <div style="font-weight: 600; color: #111827;">${itemName}${brandBadge}</div>
          ${categoryName ? `<div style="font-size: 11px; color: #6b7280;">${categoryName}</div>` : ''}
        </td>
        <td style="text-align: center; width: 75px;">
          <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #e5e7eb; color: #374151;">
            ${i18n.t('receipt.product', 'Product')}
          </span>
        </td>
        <td style="text-align: center; font-weight: 600; width: 50px;">${qty}</td>
        <td style="text-align: right; font-family: ui-monospace, monospace; width: 100px;">${formatCurrency(unitPrice)}</td>
        <td style="text-align: right; font-weight: 700; font-family: ui-monospace, monospace; width: 110px;">${formatCurrency(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const paymentsListHtml = (saleData.payments || []).map((p: any) => {
    const methodFormatted = formatPaymentMethod(p.method);
    const methodDetails = p.methodDetails ? ` (${p.methodDetails})` : '';
    const dateFormatted = p.paidAt ? formatAppDate(p.paidAt, true) : '';
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
        <div>
          <span style="font-weight: 600; color: #111827;">${methodFormatted}${methodDetails}</span>
          ${dateFormatted ? `<div style="font-size: 10px; color: #6b7280;">${dateFormatted}</div>` : ''}
        </div>
        <div style="font-weight: 700; color: #059669; font-family: ui-monospace, monospace;">+${formatCurrency(p.amount)}</div>
      </div>
    `;
  }).join('');

  const barcodeSvg = generateBarcodeSvg(saleData.saleNumber || '');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${getCommonA4Styles(`${i18n.t('receipt.posReceipt', 'Official POS Receipt')} - #${saleData.saleNumber}`)}
      </head>
      <body>
        <!-- Big Watermark in Background -->
        <div class="watermark-container">
          <img src="${window.location.origin}/logo.png" alt="Watermark" />
        </div>

        <div class="content-layer">
          <!-- Header Bar -->
          <div class="header-bar">
            <div style="display: flex; align-items: center;">
              <img src="${window.location.origin}/logo.png" alt="Logo" class="company-logo" />
              <div>
                <h1 style="font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.01em; margin-bottom: 2px; text-transform: uppercase;">
                  ${i18n.t('receipt.companyName', 'Yonatan Car Decoration & Upholstery')}
                </h1>
                <p style="font-size: 12px; color: #4b5563; margin-bottom: 2px;">
                  ${i18n.t('receipt.retailStoreSubtitle', 'Automotive Interior Customization & Retail Store')}
                </p>
                <p style="font-size: 12px; color: #6b7280;">
                  ${i18n.t('receipt.companyAddress', 'Addis Ababa, Ethiopia • www.yonatanupholstery.com')}
                </p>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="display: inline-block; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 4px 12px; border-radius: 6px; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
                  ${i18n.t('receipt.posReceipt', 'Official POS Receipt')}
                </span>
              </div>
              <div style="font-size: 16px; font-weight: 800; font-family: ui-monospace, monospace; color: #111827;">
                #${saleData.saleNumber}
              </div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                ${formattedDate}
              </div>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div class="meta-grid">
            <div>
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ${i18n.t('receipt.billedTo', 'Customer / Billed To')}
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #111827;">${customerName}</div>
              ${customerPhone ? `<div style="font-size: 12px; color: #4b5563; margin-top: 2px;">📞 ${customerPhone}</div>` : ''}
            </div>

            <div>
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ${i18n.t('receipt.transactionType', 'Transaction Type')}
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #111827;">
                ${i18n.t('receipt.directSale', 'Direct Sale / Standalone Item')}
              </div>
              ${cashierName ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${i18n.t('receipt.cashierLabel', 'Cashier:')} <strong>${cashierName}</strong></div>` : ''}
            </div>

            <div>
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ${i18n.t('receipt.paymentStatus', 'Payment Status')}
              </div>
              <div>
                <span style="display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; ${isFullyPaid ? 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;' : 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;'}">
                  ${isFullyPaid ? i18n.t('receipt.paidFully', 'PAID FULLY') : i18n.t('receipt.partiallyPaid', 'PARTIALLY PAID')}
                </span>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: center;">#</th>
                <th>${i18n.t('receipt.itemDescription', 'Item Description')}</th>
                <th style="text-align: center;">${i18n.t('receipt.type', 'Type')}</th>
                <th style="text-align: center;">${i18n.t('receipt.qty', 'Qty')}</th>
                <th style="text-align: right;">${i18n.t('receipt.unitPrice', 'Unit Price')}</th>
                <th style="text-align: right;">${i18n.t('receipt.totalAmount', 'Total Amount')}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="6" style="text-align: center; color: #9ca3af; padding: 20px;">${i18n.t('receipt.noItemsSale', 'No items in this sale')}</td></tr>`}
            </tbody>
          </table>

          <!-- Summary & Totals -->
          <div class="summary-grid">
            <div class="card-box" style="background: #ffffff;">
              <div style="font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                ${i18n.t('receipt.paymentsRecorded', 'Payments Recorded')}
              </div>
              ${paymentsListHtml || `<div style="font-size: 12px; color: #9ca3af; font-style: italic;">${i18n.t('receipt.noPaymentRecorded', 'No payments recorded yet.')}</div>`}

              <div style="margin-top: 16px; padding-top: 10px; border-top: 1px dashed #e5e7eb; font-size: 11px; color: #6b7280; line-height: 1.4;">
                <strong style="color: #374151;">${i18n.t('receipt.note', 'Note:')}</strong> ${i18n.t('receipt.terms', 'Thank you for your business! Items once sold may only be exchanged within 48 hours with original receipt.')}
              </div>
            </div>

            <div class="card-box" style="background: #f9fafb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #4b5563;">
                <span>${i18n.t('receipt.subtotal', 'Gross Subtotal')}</span>
                <span style="font-weight: 600; color: #111827; font-family: ui-monospace, monospace;">${formatCurrency(subtotal)}</span>
              </div>
              ${discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #dc2626;">
                <span>${i18n.t('receipt.discount', 'Total Discount')}</span>
                <span style="font-weight: 600; font-family: ui-monospace, monospace;">-${formatCurrency(discountAmount)}</span>
              </div>
              ` : ''}
              ${taxAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #4b5563;">
                <span>${i18n.t('receipt.vat', 'VAT (15%)')}</span>
                <span style="font-weight: 600; color: #111827; font-family: ui-monospace, monospace;">+${formatCurrency(taxAmount)}</span>
              </div>
              ` : ''}

              <div style="border-top: 2px solid #e5e7eb; margin: 10px 0; padding-top: 10px; display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-size: 15px; font-weight: 800; color: #111827; text-transform: uppercase;">${i18n.t('receipt.netTotal', 'Net Total')}</span>
                <span style="font-size: 18px; font-weight: 800; color: #111827; font-family: ui-monospace, monospace;">${formatCurrency(netTotal)}</span>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #059669; margin-top: 6px;">
                <span>${i18n.t('receipt.totalPaid', 'Amount Paid')}</span>
                <span style="font-weight: 700; font-family: ui-monospace, monospace;">${formatCurrency(totalPaid)}</span>
              </div>

              ${balanceDue > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #dc2626; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #fca5a5;">
                <span>${i18n.t('receipt.balanceDue', 'Balance Due')}</span>
                <span style="font-family: ui-monospace, monospace;">${formatCurrency(balanceDue)}</span>
              </div>
              ` : `
              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #166534; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #bbf7d0;">
                <span>${i18n.t('receipt.settlement', 'Settlement')}</span>
                <span>${i18n.t('receipt.fullySettled', 'FULLY SETTLED')}</span>
              </div>
              `}
            </div>
          </div>

          <!-- Footer & Barcode -->
          <div class="barcode-section">
            <div style="display: flex; justify-content: center; margin: 0 auto 6px auto;">
              ${barcodeSvg}
            </div>
            <div style="font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #374151; letter-spacing: 0.1em;">${saleData.saleNumber}</div>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
              ${i18n.t('receipt.posFooter', 'Authorized POS Document • Yonatan Car Decoration & Upholstery')}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
};

export const printOrderReceipt = (orderData: any) => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;

  const isAm = i18n.language === 'am';

  const servicesRows = (orderData.serviceLines || []).map((sl: any, idx: number) => {
    const serviceName = isAm 
      ? (sl.serviceCategory?.service?.nameAm || sl.serviceCategory?.nameAm || sl.serviceCategory?.service?.nameEn || sl.serviceCategory?.nameEn || i18n.t('receipt.service', 'Service'))
      : (sl.serviceCategory?.service?.nameEn || sl.serviceCategory?.nameEn || i18n.t('receipt.service', 'Service'));
    const categoryTier = isAm && sl.serviceCategory?.nameAm ? sl.serviceCategory.nameAm : sl.serviceCategory?.nameEn;
    const stdPrice = Number(sl.serviceCategory?.price || 0);
    const unitPrice = Number(sl.priceAtOrderTime || 0);
    const explicitDiscount = Number(sl.discount || 0);
    const catalogSavings = stdPrice > unitPrice ? (stdPrice - unitPrice) : 0;
    const discount = explicitDiscount > 0 ? explicitDiscount : catalogSavings;
    const lineTotal = unitPrice - explicitDiscount;

    return `
      <tr>
        <td style="color: #6b7280; font-weight: 600; text-align: center; width: 32px;">${idx + 1}</td>
        <td>
          <div style="font-weight: 600; color: #111827;">${serviceName}</div>
          ${categoryTier ? `<div style="font-size: 11px; color: #6b7280;">${i18n.t('common.category', 'Category')}: ${categoryTier}</div>` : ''}
        </td>
        <td style="text-align: center; width: 75px;">
          <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #dbeafe; color: #1e40af;">
            ${i18n.t('receipt.service', 'Service')}
          </span>
        </td>
        <td style="text-align: center; font-weight: 600; width: 50px;">1</td>
        <td style="text-align: right; font-family: ui-monospace, monospace; width: 100px;">
          <div>${formatCurrency(unitPrice)}</div>
          ${stdPrice > unitPrice ? `<div style="font-size: 10px; color: #9ca3af; text-decoration: line-through;">${formatCurrency(stdPrice)}</div>` : ''}
        </td>
        <td style="text-align: right; font-weight: 700; font-family: ui-monospace, monospace; width: 110px;">
          ${formatCurrency(lineTotal)}
          ${discount > 0 ? `<div style="font-size: 10px; color: #059669; font-weight: normal;">(-${formatCurrency(discount)})</div>` : ''}
        </td>
      </tr>
    `;
  });

  const baseOffset = servicesRows.length;
  const materialRows = (orderData.standaloneLines || []).map((ml: any, idx: number) => {
    const itemName = isAm && ml.material?.nameAm ? ml.material.nameAm : (ml.material?.nameEn || i18n.t('receipt.material', 'Material'));
    const brandLabel = formatBrandSizeLabel({ name: ml.brandName, size: ml.sizeName, color: ml.colorName, type: ml.typeName });
    const brandBadge = brandLabel
      ? `<span style="font-size: 10px; font-weight: 700; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 1px 5px; border-radius: 3px; margin-left: 6px;">${brandLabel}</span>`
      : '';
    const stdUnitPrice = Number(
      ml.material?.brands?.find((b: any) => b.id === ml.materialBrandId)?.price ??
      ml.material?.currentPrice ??
      ml.priceAtOrderTime ??
      0
    );
    const unitPrice = Number(ml.priceAtOrderTime || 0);
    const qty = Number(ml.quantity || 1);
    const explicitDiscount = Number(ml.discount || 0);
    const catalogSavings = stdUnitPrice > unitPrice ? ((stdUnitPrice - unitPrice) * qty) : 0;
    const discount = explicitDiscount > 0 ? explicitDiscount : catalogSavings;
    const lineTotal = (unitPrice * qty) - explicitDiscount;

    return `
      <tr>
        <td style="color: #6b7280; font-weight: 600; text-align: center; width: 32px;">${baseOffset + idx + 1}</td>
        <td>
          <div style="font-weight: 600; color: #111827;">${itemName}${brandBadge}</div>
          <div style="font-size: 11px; color: #6b7280;">${i18n.t('receipt.standaloneMaterial', 'Standalone Material / Part')}</div>
        </td>
        <td style="text-align: center; width: 75px;">
          <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #fef3c7; color: #92400e;">
            ${i18n.t('receipt.material', 'Material')}
          </span>
        </td>
        <td style="text-align: center; font-weight: 600; width: 50px;">${qty}</td>
        <td style="text-align: right; font-family: ui-monospace, monospace; width: 100px;">
          <div>${formatCurrency(unitPrice)}</div>
          ${stdUnitPrice > unitPrice ? `<div style="font-size: 10px; color: #9ca3af; text-decoration: line-through;">${formatCurrency(stdUnitPrice)}</div>` : ''}
        </td>
        <td style="text-align: right; font-weight: 700; font-family: ui-monospace, monospace; width: 110px;">
          ${formatCurrency(lineTotal)}
          ${discount > 0 ? `<div style="font-size: 10px; color: #059669; font-weight: normal;">(-${formatCurrency(discount)})</div>` : ''}
        </td>
      </tr>
    `;
  });

  const additionalOffset = baseOffset + materialRows.length;
  const additionalRows = (orderData.additionalCharges || []).map((ac: any, idx: number) => {
    const chargeName = ac.name || ac.description || i18n.t('receipt.charge', 'Additional Charge');
    const lineTotal = Number(ac.price || ac.amount || 0);

    return `
      <tr>
        <td style="color: #6b7280; font-weight: 600; text-align: center; width: 32px;">${additionalOffset + idx + 1}</td>
        <td>
          <div style="font-weight: 600; color: #111827;">${chargeName}</div>
          <div style="font-size: 11px; color: #6b7280;">${i18n.t('receipt.customSurcharge', 'Custom Surcharge')}</div>
        </td>
        <td style="text-align: center; width: 75px;">
          <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #ede9fe; color: #5b21b6;">
            ${i18n.t('receipt.charge', 'Charge')}
          </span>
        </td>
        <td style="text-align: center; font-weight: 600; width: 50px;">1</td>
        <td style="text-align: right; font-family: ui-monospace, monospace; width: 100px;">${formatCurrency(lineTotal)}</td>
        <td style="text-align: right; font-weight: 700; font-family: ui-monospace, monospace; width: 110px;">${formatCurrency(lineTotal)}</td>
      </tr>
    `;
  });

  const serviceFee = Number(orderData.serviceFee || 0);
  const serviceFeeRow = serviceFee > 0 ? `
    <tr>
      <td style="color: #6b7280; font-weight: 600; text-align: center; width: 32px;">${additionalOffset + (orderData.additionalCharges?.length || 0) + 1}</td>
      <td>
        <div style="font-weight: 600; color: #111827;">${i18n.t('orders.detail.serviceFee', 'Service Fee')}</div>
        <div style="font-size: 11px; color: #6b7280;">${i18n.t('receipt.serviceFeeDesc', 'Order Service / Labor Fee')}</div>
      </td>
      <td style="text-align: center; width: 75px;">
        <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1;">
          ${i18n.t('receipt.fee', 'Fee')}
        </span>
      </td>
      <td style="text-align: center; font-weight: 600; width: 50px;">1</td>
      <td style="text-align: right; font-family: ui-monospace, monospace; width: 100px;">${formatCurrency(serviceFee)}</td>
      <td style="text-align: right; font-weight: 700; font-family: ui-monospace, monospace; width: 110px;">${formatCurrency(serviceFee)}</td>
    </tr>
  ` : '';

  const allRowsHtml = [...servicesRows, ...materialRows, ...additionalRows, serviceFeeRow].filter(Boolean).join('');

  const subtotal = orderData.totalPrice !== undefined ? Number(orderData.totalPrice) : (
    (orderData.serviceLines || []).reduce((s: number, l: any) => s + Number(l.priceAtOrderTime || 0), 0) +
    (orderData.standaloneLines || []).reduce((s: number, l: any) => s + (Number(l.priceAtOrderTime || 0) * Number(l.quantity || 1)), 0) +
    (orderData.additionalCharges || []).reduce((s: number, l: any) => s + Number(l.price || l.amount || 0), 0) +
    serviceFee
  );

  const discountAmount = Number(orderData.totalDiscount || orderData.discountAmount || 0);
  const taxAmount = Number(orderData.taxAmount || 0);
  const netTotal = Number(orderData.netPrice || (subtotal - discountAmount + taxAmount));
  const totalPaid = (orderData.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const balanceDue = Number(orderData.balanceDue !== undefined ? orderData.balanceDue : (netTotal - totalPaid));
  const isFullyPaid = balanceDue <= 0 && totalPaid > 0;

  const customerName = orderData.customer?.name || i18n.t('receipt.walkInCustomer', 'Walk-in Client');
  const customerPhone = orderData.customer?.phoneNumber || orderData.customer?.phone || '';
  const vehiclePlate = orderData.vehicle ? formatPlateNumber(orderData.vehicle.plateNumber) : '';
  const vehicleModel = orderData.vehicle?.carModel ? `${[orderData.vehicle.carModel?.brand?.name, orderData.vehicle.carModel?.name].filter(Boolean).join(' ')}` : '';
  const formattedDate = orderData.orderDateTime ? formatAppDate(orderData.orderDateTime, true) : 'N/A';

  const paymentsListHtml = (orderData.payments || []).map((p: any) => {
    const methodFormatted = formatPaymentMethod(p.method);
    const methodDetails = p.methodDetails ? ` (${p.methodDetails})` : '';
    const dateFormatted = p.paidAt ? formatAppDate(p.paidAt, true) : '';
    const recordedByName = p.recordedBy?.name ? ` • ${i18n.t('receipt.recordedBy', 'Recorded by {{name}}', { name: p.recordedBy.name })}` : '';
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px;">
        <div>
          <span style="font-weight: 600; color: #111827;">${methodFormatted}${methodDetails}</span>
          <div style="font-size: 10px; color: #6b7280;">${dateFormatted}${recordedByName}</div>
        </div>
        <div style="font-weight: 700; color: #059669; font-family: ui-monospace, monospace;">+${formatCurrency(p.amount)}</div>
      </div>
    `;
  }).join('');

  const barcodeSvg = generateBarcodeSvg(orderData.orderNumber || '');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        ${getCommonA4Styles(`${i18n.t('receipt.workOrderInvoice', 'Work Order Invoice')} - #${orderData.orderNumber}`)}
      </head>
      <body>
        <!-- Big Watermark in Background -->
        <div class="watermark-container">
          <img src="${window.location.origin}/logo.png" alt="Watermark" />
        </div>

        <div class="content-layer">
          <!-- Header Bar -->
          <div class="header-bar">
            <div style="display: flex; align-items: center;">
              <img src="${window.location.origin}/logo.png" alt="Logo" class="company-logo" />
              <div>
                <h1 style="font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.01em; margin-bottom: 2px; text-transform: uppercase;">
                  ${i18n.t('receipt.companyName', 'Yonatan Car Decoration & Upholstery')}
                </h1>
                <p style="font-size: 12px; color: #4b5563; margin-bottom: 2px;">
                  ${i18n.t('receipt.companySubtitle', 'Premium Auto Customization, Upholstery & Accessories')}
                </p>
                <p style="font-size: 12px; color: #6b7280;">
                  ${i18n.t('receipt.companyAddress', 'Addis Ababa, Ethiopia • www.yonatanupholstery.com')}
                </p>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="display: inline-block; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 4px 12px; border-radius: 6px; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
                  ${i18n.t('receipt.workOrderInvoice', 'Work Order Invoice')}
                </span>
              </div>
              <div style="font-size: 16px; font-weight: 800; font-family: ui-monospace, monospace; color: #111827;">
                #${orderData.orderNumber}
              </div>
              ${orderData.fsrNumber ? `
                <div style="display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 4px; margin-top: 3px;">
                  <span style="font-size: 11px; font-weight: 700; color: #1e40af; font-family: ui-monospace, monospace;">
                    FSR #: ${orderData.fsrNumber}
                  </span>
                </div>
              ` : ''}
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                ${formattedDate}
              </div>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div class="meta-grid">
            <div>
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ${i18n.t('receipt.billedTo', 'Customer / Billed To')}
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #111827;">${customerName}</div>
              ${customerPhone ? `<div style="font-size: 12px; color: #4b5563; margin-top: 2px;">📞 ${customerPhone}</div>` : ''}
            </div>

            <div>
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ${i18n.t('receipt.vehicleDetails', 'Vehicle Details')}
              </div>
              ${vehiclePlate ? `
                <div style="font-size: 13px; font-weight: 700; color: #111827;">${vehicleModel || i18n.t('common.vehicle', 'Vehicle')}</div>
                <div style="font-size: 12px; color: #4b5563; font-family: ui-monospace, monospace; margin-top: 2px; font-weight: 600;">
                  ${i18n.t('receipt.plateLabel', 'Plate:')} ${vehiclePlate}
                </div>
              ` : `
                <div style="font-size: 12px; color: #9ca3af; font-style: italic;">${i18n.t('receipt.noVehicle', 'No vehicle attached')}</div>
              `}
            </div>

            <div>
              <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ${i18n.t('receipt.paymentStatus', 'Payment Status')}
              </div>
              <div>
                <span style="display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; ${isFullyPaid ? 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;' : 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;'}">
                  ${formatStatus(orderData.paymentStatus || 'UNPAID')}
                </span>
              </div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                ${i18n.t('receipt.orderStatus', 'Order Status')}: <strong>${formatStatus(orderData.orderStatus || 'OPEN')}</strong>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: center;">#</th>
                <th>${i18n.t('receipt.itemDescription', 'Description')}</th>
                <th style="text-align: center;">${i18n.t('receipt.type', 'Type')}</th>
                <th style="text-align: center;">${i18n.t('receipt.qty', 'Qty')}</th>
                <th style="text-align: right;">${i18n.t('receipt.unitPrice', 'Unit Price')}</th>
                <th style="text-align: right;">${i18n.t('receipt.totalAmount', 'Total Amount')}</th>
              </tr>
            </thead>
            <tbody>
              ${allRowsHtml || `<tr><td colspan="6" style="text-align: center; color: #9ca3af; padding: 20px;">${i18n.t('receipt.noItemsOrder', 'No items or services in this order')}</td></tr>`}
            </tbody>
          </table>

          <!-- Summary & Totals -->
          <div class="summary-grid">
            <div class="card-box" style="background: #ffffff;">
              <div style="font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                ${i18n.t('receipt.paymentHistory', 'Payment History & Warranty')}
              </div>
              ${paymentsListHtml || `<div style="font-size: 12px; color: #9ca3af; font-style: italic;">${i18n.t('receipt.noPaymentRecorded', 'No payments recorded yet.')}</div>`}

              <div style="margin-top: 16px; padding-top: 10px; border-top: 1px dashed #e5e7eb; font-size: 11px; color: #6b7280; line-height: 1.4;">
                <strong style="color: #374151;">${i18n.t('receipt.qualityGuarantee', 'Quality Guarantee')}:</strong> ${i18n.t('receipt.guaranteeDesc', 'All craftsmanship, leather tailoring, and vehicle accessories are backed by Yonatan Car Decor.')}
              </div>
            </div>

            <div class="card-box" style="background: #f9fafb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #4b5563;">
                <span>${i18n.t('receipt.subtotal', 'Gross Subtotal')}</span>
                <span style="font-weight: 600; color: #111827; font-family: ui-monospace, monospace;">${formatCurrency(subtotal)}</span>
              </div>
              ${discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #dc2626;">
                <span>${i18n.t('receipt.discount', 'Total Discount')}</span>
                <span style="font-weight: 600; font-family: ui-monospace, monospace;">-${formatCurrency(discountAmount)}</span>
              </div>
              ` : ''}
              ${taxAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #4b5563;">
                <span>${i18n.t('receipt.vat', 'VAT (15%)')}</span>
                <span style="font-weight: 600; color: #111827; font-family: ui-monospace, monospace;">+${formatCurrency(taxAmount)}</span>
              </div>
              ` : ''}

              <div style="border-top: 2px solid #e5e7eb; margin: 10px 0; padding-top: 10px; display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-size: 15px; font-weight: 800; color: #111827; text-transform: uppercase;">${i18n.t('receipt.netTotal', 'Net Total')}</span>
                <span style="font-size: 18px; font-weight: 800; color: #111827; font-family: ui-monospace, monospace;">${formatCurrency(netTotal)}</span>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #059669; margin-top: 6px;">
                <span>${i18n.t('receipt.totalPaid', 'Amount Paid')}</span>
                <span style="font-weight: 700; font-family: ui-monospace, monospace;">${formatCurrency(totalPaid)}</span>
              </div>

              ${balanceDue > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #dc2626; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #fca5a5;">
                <span>${i18n.t('receipt.balanceDue', 'Balance Due')}</span>
                <span style="font-family: ui-monospace, monospace;">${formatCurrency(balanceDue)}</span>
              </div>
              ` : `
              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #166534; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #bbf7d0;">
                <span>${i18n.t('receipt.settlement', 'Settlement')}</span>
                <span>${i18n.t('receipt.fullySettled', 'FULLY SETTLED')}</span>
              </div>
              `}
            </div>
          </div>

          <!-- Footer & Barcode -->
          <div class="barcode-section">
            <div style="display: flex; justify-content: center; margin: 0 auto 6px auto;">
              ${barcodeSvg}
            </div>
            <div style="font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #374151; letter-spacing: 0.1em;">${orderData.orderNumber}</div>
            ${orderData.fsrNumber ? `<div style="font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; color: #4b5563; margin-top: 2px;">FSR AUDIT REF: ${orderData.fsrNumber}</div>` : ''}
            <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
              ${i18n.t('receipt.footer', 'Official Work Order Invoice • Yonatan Car Decoration & Upholstery')}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
};

