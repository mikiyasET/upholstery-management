const fs = require('fs');
let content = fs.readFileSync('src/pages/DirectSales.tsx', 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace("import { format } from 'date-fns';", "import { format } from 'date-fns';\nimport { useTranslation } from 'react-i18next';");
}

if (!content.includes('const { t, i18n } = useTranslation();')) {
    content = content.replace("export default function DirectSales() {", "export default function DirectSales() {\n  const { t, i18n } = useTranslation();");
}

const replacements = [
    ["'Not enough stock. Only ${available} available in Mini Store.'", "t('orders.validation.notEnoughStock', { available, needed: currentQty + 1 })"],
    ["'Not enough stock. Only ${available} available in Mini Store.'", "t('orders.validation.notEnoughStock', { available, needed: newQty })"],
    ["'Please add items to cart'", "t('alerts.noItems', 'Please add items to cart')"],
    ["'Please select payment method'", "t('alerts.selectPaymentMethod', 'Please select payment method')"],
    ["'Payment amount cannot exceed total'", "t('alerts.paymentExceedsTotal', 'Payment amount cannot exceed total')"],
    ["'Direct sale created successfully!'", "t('alerts.savedSuccessfully', 'Direct sale created successfully!')"],
    ["'Direct sale updated successfully!'", "t('alerts.statusUpdated', 'Direct sale updated successfully!')"],
    ["'Failed to complete sale'", "t('alerts.error', 'Failed to complete sale')"],
    ["'Direct Sales'", "t('dashboard.directSale', 'Direct Sales')"],
    [">History<", ">{t('directSales.history', 'History')}<"],
    ['placeholder="Search items..."', "placeholder={t('orders.create.placeholder.material', 'Search items...')}"],
    [">Out of Stock<", ">{t('storage.outOfStock', 'Out of Stock')}<"],
    [">Customer Name (Optional)<", ">{t('orders.create.customerName', 'Customer Name')} ({t('common.notesOptional', 'Optional')})<"],
    [">Phone (Optional)<", ">{t('orders.create.phoneNumber', 'Phone Number')} ({t('common.notesOptional', 'Optional')})<"],
    [">Tax Enabled<", ">{t('orders.tax', 'Tax Enabled')}<"],
    [">Cart<", ">{t('directSales.cart', 'Cart')}<"],
    [">Clear<", ">{t('common.clear', 'Clear')}<"],
    [">Payment Options<", ">{t('orders.paymentMethod', 'Payment Options')}<"],
    [">Payment Method<", ">{t('orders.paymentMethod', 'Payment Method')}<"],
    ["placeholder=\"Amount\"", "placeholder={t('orders.amountPaid', 'Amount')}"],
    [">Add Split<", ">+ {t('orders.actions.addPayment', 'Add Split')}<"],
    ["placeholder=\"Reference / Phone (Optional)\"", "placeholder={t('orders.referenceNumber', 'Reference / Phone (Optional)')}"],
    ["'Amount'", "t('orders.amountPaid', 'Amount')"],
    [">Subtotal:", ">{t('orders.detail.subtotal')}:"],
    [">Tax {taxEnabled ? '(15%)' : '(Off)'}:", ">{t('orders.detail.tax')} {taxEnabled ? '(15%)' : '(Off)'}:"],
    [">Complete Sale<", ">{t('orders.create.submitOrder', 'Complete Sale')}<"],
    [">Sale Completed!<", ">{t('alerts.success', 'Sale Completed!')}<"],
    [">Close<", ">{t('common.close', 'Close')}<"],
    [">Print<", ">{t('orders.actions.printReceipt', 'Print')}<"],
];

for (const [search, replace] of replacements) {
    content = content.replaceAll(search, replace);
}

// Check for missing translations
if (content.includes('getLocName') === false) {
    content = content.replace("const getMiniStoreStock", "const getLocName = (item: any) => i18n.language === 'am' && item.nameAm ? item.nameAm : item.nameEn;\n\n  const getMiniStoreStock");
}
content = content.replaceAll("m.nameEn", "getLocName(m)");
content = content.replaceAll("item.material.nameEn", "getLocName(item.material)");
content = content.replaceAll("completedSale.lines.map((line: any, i: number) => (", "completedSale.lines.map((line: any, i: number) => (\n                      /* @ts-ignore */");


fs.writeFileSync('src/pages/DirectSales.tsx', content);

// Also do DirectSalesHistory
let histContent = fs.readFileSync('src/pages/DirectSalesHistory.tsx', 'utf8');

if (!histContent.includes('useTranslation')) {
    histContent = histContent.replace("import { format } from 'date-fns';", "import { format } from 'date-fns';\nimport { useTranslation } from 'react-i18next';");
    histContent = histContent.replace("export default function DirectSalesHistory() {", "export default function DirectSalesHistory() {\n  const { t } = useTranslation();");
}

const histReplacements = [
    ["'Direct Sales History'", "t('directSales.history', 'Direct Sales History')"],
    [">New Direct Sale<", ">{t('directSales.addSale', 'New Direct Sale')}<"],
    ['placeholder="Search by sale number, customer, or phone..."', "placeholder={t('orders.searchPlaceholder', 'Search...')}"],
    [">All Payment Status<", ">{t('status.all', 'All Payment Status')}<"],
    [">Paid<", ">{t('status.paid', 'Paid')}<"],
    [">Partially Paid<", ">{t('status.partiallypaid', 'Partially Paid')}<"],
    [">Unpaid<", ">{t('status.unpaid', 'Unpaid')}<"],
    [">Sale Number<", ">{t('orders.table.orderInfo', 'Sale Number')}<"],
    [">Customer<", ">{t('orders.table.customer', 'Customer')}<"],
    [">Items<", ">{t('orders.detail.materialsParts', 'Items')}<"],
    [">Total<", ">{t('orders.create.total', 'Total')}<"],
    [">Payment<", ">{t('orders.table.payment', 'Payment')}<"],
    [">Date<", ">{t('common.date', 'Date')}<"],
    [">Loading direct sales...<", ">{t('orders.table.loading', 'Loading direct sales...')}<"],
    [">No direct sales found.<", ">{t('orders.table.noOrders', 'No direct sales found.')}<"]
];

for (const [search, replace] of histReplacements) {
    histContent = histContent.replaceAll(search, replace);
}

fs.writeFileSync('src/pages/DirectSalesHistory.tsx', histContent);

