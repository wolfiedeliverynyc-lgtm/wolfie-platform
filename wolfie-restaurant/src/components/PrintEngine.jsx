import React from 'react';

// Generates printable HTML string for thermal receipt printer (80mm width)
export function printReceipt(order) {
  const printWindow = window.open('', '_blank', 'width=600,height=800');
  if (!printWindow) return;

  const itemsHtml = order.items?.map(item => `
    <tr style="border-bottom: 1px dashed #ddd;">
      <td style="padding: 6px 0; font-size: 14px;"><strong>${item.quantity}x</strong> ${item.name}</td>
      <td style="padding: 6px 0; text-align: right; font-size: 14px;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
    ${item.modifiers?.length > 0 ? `
      <tr>
        <td colspan="2" style="font-size: 11px; color: #555; padding-left: 15px; padding-bottom: 6px;">
          ${item.modifiers.map(m => `+ ${m.name}`).join(', ')}
        </td>
      </tr>
    ` : ''}
  `).join('');

  const receiptHtml = `
    <html>
      <head>
        <title>Order ${order.orderNumber}</title>
        <style>
          @media print {
            body { margin: 0; padding: 10px; font-family: 'Courier New', Courier, monospace; width: 80mm; color: #000; }
            @page { size: 80mm auto; margin: 0; }
          }
          body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
          .title { font-size: 20px; font-weight: bold; margin: 0; }
          .meta { font-size: 12px; margin-bottom: 4px; }
          .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .totals { border-top: 2px dashed #000; padding-top: 10px; }
          .totals-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="title">WOLFIE DELIVERY</p>
          <p class="meta" style="font-size: 14px; font-weight: bold;">KITCHEN TICKET</p>
          <p class="meta">Order Ref: ${order.orderNumber}</p>
          <p class="meta">Date: ${new Date(order.placedAt || Date.now()).toLocaleString()}</p>
        </div>
        
        <div style="font-size: 13px; margin-bottom: 10px;">
          <p style="margin: 0 0 4px;"><strong>Customer:</strong> ${order.customerName}</p>
          <p style="margin: 0 0 4px;"><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
          <p style="margin: 0 0 4px;"><strong>Address:</strong> ${order.customerAddress || 'N/A'}</p>
          ${order.notes ? `<p style="margin: 6px 0 0; background: #eee; padding: 6px;"><strong>Note:</strong> ${order.notes}</p>` : ''}
        </div>

        <table class="table">
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>$${(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div class="totals-row" style="font-weight: bold; font-size: 16px; margin-top: 6px;">
            <span>TOTAL</span>
            <span>$${(order.subtotal || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for ordering with Wolfie!</p>
          <p>*** END OF TICKET ***</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(receiptHtml);
  printWindow.document.close();
}

export function PrintButton({ order }) {
  return (
    <button
      onClick={() => printReceipt(order)}
      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-2xl border border-gray-300 hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors bg-white"
    >
      🖨️ Print Ticket
    </button>
  );
}
