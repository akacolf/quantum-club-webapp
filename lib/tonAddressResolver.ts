import { Address } from "@ton/core";

export interface ResolvedAddress {
  address: string;
  isValid: boolean;
  isDomain: boolean;
  isUsername: boolean;
  originalInput: string;
  error?: string;
}

export async function resolveTonAddress(input: string): Promise<ResolvedAddress> {
  const trimmedInput = input.trim();
  
  if (!trimmedInput) {
    return {
      address: "",
      isValid: false,
      isDomain: false,
      isUsername: false,
      originalInput: input,
      error: "Address is required"
    };
  }

  // Check if it's a @username (QC username)
  if (trimmedInput.startsWith("@") || /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/i.test(trimmedInput) && !trimmedInput.includes(".ton")) {
    const username = trimmedInput.replace(/^@/, '').toLowerCase();
    
    // Must be at least 3 chars to be a valid username
    if (username.length >= 3 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/i.test(username)) {
      try {
        const response = await fetch(`/api/qc-username?username=${encodeURIComponent(username)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.resolved && data.address) {
            try {
              const parsed = Address.parse(data.address);
              return {
                address: parsed.toString({ bounceable: false }),
                isValid: true,
                isDomain: false,
                isUsername: true,
                originalInput: input
              };
            } catch {
              return {
                address: "",
                isValid: false,
                isDomain: false,
                isUsername: true,
                originalInput: input,
                error: "Invalid address linked to this username"
              };
            }
          }
        }

        return {
          address: "",
          isValid: false,
          isDomain: false,
          isUsername: true,
          originalInput: input,
          error: "Username not found or no wallet linked"
        };
      } catch (error) {
        return {
          address: "",
          isValid: false,
          isDomain: false,
          isUsername: true,
          originalInput: input,
          error: error instanceof Error ? error.message : "Failed to resolve username"
        };
      }
    }
  }

  // Check if it's a .ton domain
  if (trimmedInput.toLowerCase().endsWith(".ton")) {
    try {
      // Use TON DNS to resolve the domain
      const domain = trimmedInput.toLowerCase();
      
      // Try tonconsole first (more generous limits), then fallback to tonapi
      let walletAddress: string | null = null;
      
      try {
        const tonconsoleResponse = await fetch(
          `https://tonconsole.com/api/v1/dns/resolve?domain=${encodeURIComponent(domain)}`,
          { next: { revalidate: 300 } } // Cache for 5 minutes
        );
        
        if (tonconsoleResponse.ok) {
          const data = await tonconsoleResponse.json();
          walletAddress = data.address || null;
        }
      } catch {
        // tonconsole failed, try tonapi
      }
      
      // Fallback to tonapi if tonconsole didn't work
      if (!walletAddress) {
        const response = await fetch(
          `https://tonapi.io/v2/dns/${encodeURIComponent(domain)}/resolve`
        );
        
        if (response.ok) {
          const data = await response.json();
          walletAddress = data.wallet?.address || null;
        }
      }
      
      if (!walletAddress) {
        return {
          address: "",
          isValid: false,
          isDomain: true,
          isUsername: false,
          originalInput: input,
          error: "Domain not found or no wallet associated"
        };
      }
      
      // Validate and format the resolved address
      try {
        const parsed = Address.parse(walletAddress);
        return {
          address: parsed.toString({ bounceable: false }),
          isValid: true,
          isDomain: true,
          isUsername: false,
          originalInput: input
        };
      } catch {
        return {
          address: "",
          isValid: false,
          isDomain: true,
          isUsername: false,
          originalInput: input,
          error: "Invalid address format from domain"
        };
      }
    } catch (error) {
      return {
        address: "",
        isValid: false,
        isDomain: true,
        isUsername: false,
        originalInput: input,
        error: error instanceof Error ? error.message : "Failed to resolve domain"
      };
    }
  }

  // It's a regular address, validate it
  try {
    const parsed = Address.parse(trimmedInput);
    return {
      address: parsed.toString({ bounceable: false }),
      isValid: true,
      isDomain: false,
      isUsername: false,
      originalInput: input
    };
  } catch {
    return {
      address: "",
      isValid: false,
      isDomain: false,
      isUsername: false,
      originalInput: input,
      error: "Invalid TON address format"
    };
  }
}

export function isValidTonAddressOrDomain(input: string): boolean {
  const trimmed = input.trim();

  // Check if it's an @username format
  if (trimmed.startsWith("@")) {
    const username = trimmed.slice(1).toLowerCase();
    return username.length >= 3 && /^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(username);
  }
  
  // Check if it's a .ton domain format
  if (trimmed.toLowerCase().endsWith(".ton")) {
    return trimmed.length > 4 && /^[a-zA-Z0-9-]+\.ton$/i.test(trimmed);
  }
  
  // Try to parse as address
  try {
    Address.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
