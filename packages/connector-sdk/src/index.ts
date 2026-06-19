import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface DeseoPayload {
  userId: string;
  installationId?: string;
  clientId: string;
}

export class ConnectorSDK {
  constructor(private clientSecret: string) {}

  /**
   * Signs a payload to be sent back to the Hub or for internal use.
   */
  sign(payload: DeseoPayload): string {
    return jwt.sign(payload, this.clientSecret, { expiresIn: '1h' });
  }

  /**
   * Verifies a token from the Hub.
   */
  verify(token: string): DeseoPayload {
    return jwt.verify(token, this.clientSecret) as DeseoPayload;
  }

  /**
   * Express middleware to protect connector routes.
   * Expects the Hub to send a 'x-deseo-token' header signed with the clientSecret.
   */
  authMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const token = req.headers['x-deseo-token'] as string;

      if (!token) {
        return res.status(401).json({ success: false, error: 'Missing x-deseo-token' });
      }

      try {
        const decoded = this.verify(token);
        (req as any).deseo = decoded;
        next();
      } catch (error) {
        console.error('[ConnectorSDK] Verification failed:', error);
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
      }
    };
  }
}

/**
 * Utility to decrypt/verify sensitive data sent in the request body
 * if it was encrypted with the clientSecret.
 */
export function decryptPayload<T>(encrypted: string, secret: string): T {
  return jwt.verify(encrypted, secret) as T;
}
