export interface CardDetails {
  id: string;
  type: string;
  name: string;
  number: string;
  logo: string;
}

export const paymentService = {
  async processPayment(cardId: string, amount: number): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simple simulation - always succeed unless it's a specific test case
        if (amount <= 0) {
          resolve({ success: false, message: 'Invalid payment amount.' });
        } else {
          resolve({ success: true, message: 'Payment authorized successfully.' });
        }
      }, 1500); // 1.5s simulation delay
    });
  }
};
