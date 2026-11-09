# Yonatan-Upholstery-web

Web Dashboard and POS Frontend for the **Yonatan Car Decor & Upholstery Management System**. Built with React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, and shadcn/ui.

## Features
- **POS & Direct Sales Interface**: Fast checkout, barcode/QR code generation, instant receipt printing, tax, and discount support.
- **Dual Storage Management**: Real-time stock levels for Main Store and Mini Store, store-to-store transfers, and low-stock alerts.
- **Service & Order Tracking**: Order creation, multi-technician assignments, car diagram status mapping, and stages from intake to delivery.
- **Multilingual Support**: English and Amharic localization with custom Amharic fonts.
- **Role-Based Views**: Dynamic navigation and feature access customized to user permissions.
- **Analytics & Reporting**: Interactive revenue dashboards, inventory valuation, and team workload.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- Yonatan-Upholstery-API running (default: `http://localhost:3000`)

### Installation
```bash
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` and adjust the backend URL if necessary:
```bash
cp .env.example .env
```
Available environment variables:
- `VITE_API_BASE_URL`: Backend API URL (default: `http://localhost:3000`)
- `VITE_API_URL`: Backend API URL alias (used for uploads/media, default: `http://localhost:3000`)

### Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
npm run preview
```
