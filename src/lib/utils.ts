export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function generateCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getCompanyFromDomain(domain: string): string | null {
  try {
    const url = new URL(domain);
    return url.hostname;
  } catch {
    return domain;
  }
}

// src/lib/utils.ts (add this function to your existing file)

/**
 * Generates a unique submission identifier based on available customer data
 * @param data Object containing submission data
 * @returns A unique string identifier for this customer submission
 */
export function generateUniqueSubmissionId(data: {
  orderId?: string | null;
  companyId: string;
  campaignId: string;
  additionalParams?: Record<string, any>;
  clientId?: string; // New parameter
}): string {
  // Extract the most reliable identifiers from the data
  const identifiers = [];
  
  // Order ID if available
  if (data.orderId && data.orderId.trim() !== '') {
    identifiers.push(`order:${data.orderId}`);
  }
  
  // Extract key identification parameters
  if (data.additionalParams) {
    // Customer email
    if (data.additionalParams.email) {
      identifiers.push(`email:${data.additionalParams.email.toLowerCase()}`);
    }
    
    // Customer ID if present
    if (data.additionalParams.customerId || data.additionalParams.customer_id) {
      identifiers.push(`customer:${data.additionalParams.customerId || data.additionalParams.customer_id}`);
    }
    
    // Transaction ID if present
    if (data.additionalParams.transactionId || data.additionalParams.transaction_id) {
      identifiers.push(`transaction:${data.additionalParams.transactionId || data.additionalParams.transaction_id}`);
    }
    
    // Session ID if captured
    if (data.additionalParams.sessionId) {
      identifiers.push(`session:${data.additionalParams.sessionId}`);
    }

    // User ID if available
    if (data.additionalParams.userId || data.additionalParams.user_id) {
      identifiers.push(`user:${data.additionalParams.userId || data.additionalParams.user_id}`);
    }
    
    // Any klaviyo ID if present (common in email marketing)
    if (data.additionalParams.klaviyoId || data.additionalParams.klaviyo_id) {
      identifiers.push(`klaviyo:${data.additionalParams.klaviyoId || data.additionalParams.klaviyo_id}`);
    }
      if (data.clientId) {
    identifiers.push(`client:${data.clientId}`);
  }
  // Add client ID if available - this makes each browser session unique
  if (data.clientId) {
    identifiers.push(`client:${data.clientId}`);
  }
  }
  
  // Always include company and campaign to namespace properly
  identifiers.push(`company:${data.companyId}`);
  identifiers.push(`campaign:${data.campaignId}`);
  
  // If we have very few identifiers (just company/campaign) and no client ID, 
  // add timestamp as last resort
  if (identifiers.length < 3 && !data.clientId) {
    identifiers.push(`timestamp:${Date.now()}`);
  }
  
  return identifiers.sort().join('|');
}
