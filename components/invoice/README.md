# Dynamic Invoice Component

A professional, PDF-style invoice component built with React, TypeScript, and Tailwind CSS that integrates with Supabase.

## Features

- **Professional Design**: Clean, modern invoice layout similar to Jobber's invoices
- **Supabase Integration**: Fetches data from your existing database schema
- **TypeScript Support**: Fully typed with proper interfaces
- **Print Friendly**: Optimized for printing with proper CSS
- **Responsive**: Works on desktop and mobile devices
- **PDF Generation**: Built-in PDF download functionality
- **Currency Formatting**: Proper currency formatting with 2 decimal places
- **Dynamic Data**: Fetches invoice, client, and company data from Supabase

## Installation

1. Copy the following files to your Next.js project:
   - `components/invoice/Invoice.tsx`
   - `components/invoice/InvoiceExample.tsx`
   - `types/invoice.ts`
   - `lib/invoice-service.ts`

2. Install required dependencies (if not already installed):
   ```bash
   npm install @supabase/supabase-js lucide-react
   ```

## Usage

### Basic Usage

```tsx
import Invoice from '@/components/invoice/Invoice'

export default function InvoicePage() {
  return (
    <Invoice invoiceId="your-invoice-id" />
  )
}
```

### Advanced Usage

```tsx
import Invoice from '@/components/invoice/Invoice'

export default function InvoicePage() {
  const handlePrint = () => {
    // Custom print logic
    window.print()
  }

  return (
    <Invoice 
      invoiceId="your-invoice-id"
      className="custom-class"
      showPrintButton={true}
      onPrint={handlePrint}
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `invoiceId` | `string` | Required | The ID of the invoice to display |
| `className` | `string` | `''` | Additional CSS classes |
| `showPrintButton` | `boolean` | `true` | Whether to show print and download buttons |
| `onPrint` | `() => void` | `undefined` | Custom print handler |

## Database Schema

The component expects the following Supabase tables:

### invoices
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft',
  booking_id UUID REFERENCES bookings(id),
  client_id UUID REFERENCES profiles(id),
  provider_id UUID REFERENCES profiles(id)
);
```

### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### companies
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### bookings
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  provider_id UUID REFERENCES profiles(id),
  service_id UUID REFERENCES services(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### services
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  price DECIMAL(10,2),
  provider_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Integration

The component integrates with your existing PDF generation API at `/api/invoices/generate-pdf`. Make sure this endpoint is available and returns a PDF blob.

## Styling

The component uses Tailwind CSS classes and is designed to be print-friendly. Key styling features:

- **Print Optimization**: Uses `print:` prefixes for print-specific styles
- **Responsive Design**: Adapts to different screen sizes
- **Professional Layout**: Clean, business-appropriate design
- **Color Scheme**: Blue and gray color palette for professionalism

## Customization

### Colors
You can customize the color scheme by modifying the Tailwind classes in the component:

```tsx
// Change the invoice details box color
<div className="bg-blue-600 text-white rounded-lg p-6 w-64 text-sm">
  // Change to: bg-green-600, bg-purple-600, etc.
```

### Layout
Modify the layout by adjusting the grid and flex classes:

```tsx
// Change the header layout
<div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
  // Modify flex properties as needed
</div>
```

### Typography
Adjust font sizes and weights using Tailwind classes:

```tsx
<h1 className="text-2xl font-bold text-gray-900 mb-2">
  // Change to: text-3xl, text-4xl, etc.
</h1>
```

## Error Handling

The component includes comprehensive error handling:

- **Loading States**: Shows skeleton loading animation
- **Error States**: Displays user-friendly error messages
- **Data Validation**: Handles missing or invalid data gracefully

## Performance

- **Lazy Loading**: Data is fetched only when the component mounts
- **Memoization**: Uses React hooks for optimal re-rendering
- **Efficient Queries**: Optimized Supabase queries with proper joins

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Print functionality works in all major browsers
- PDF generation requires modern browser support

## Troubleshooting

### Common Issues

1. **Invoice not found**: Check that the invoice ID exists in your database
2. **Data not loading**: Verify your Supabase connection and table structure
3. **PDF not generating**: Ensure the PDF generation API is working
4. **Styling issues**: Check that Tailwind CSS is properly configured

### Debug Mode

Enable debug logging by adding this to your environment:

```bash
NEXT_PUBLIC_DEBUG_INVOICE=true
```

This will log detailed information about data fetching and processing.

## License

This component is part of your Business Services Hub project and follows the same license terms.
