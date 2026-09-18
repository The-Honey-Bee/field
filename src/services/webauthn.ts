import { UserProfile, BiometricCredential } from '../types';
import { storageService } from './storage';

/**
 * Utility functions to convert between ArrayBuffer and Base64URL
 */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/**
 * Detect friendly biometric label based on platform
 */
export function getBiometricPlatformLabel(): string {
  if (typeof navigator === 'undefined') return 'Biometrics';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('macintosh')) {
    return 'Face ID / Touch ID';
  }
  if (ua.includes('android')) {
    return 'Fingerprint / Face Unlock';
  }
  if (ua.includes('windows')) {
    return 'Windows Hello';
  }
  return 'Biometric Fingerprint';
}

export class WebAuthnService {
  /**
   * Checks if browser supports WebAuthn API
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials !== 'undefined'
    );
  }

  /**
   * Checks if device has a built-in biometric sensor (platform authenticator)
   */
  public async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Register a new biometric passkey/credential for field staff
   */
  public async registerBiometricCredential(
    user: UserProfile,
    customDeviceLabel?: string
  ): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'WebAuthn is not supported in this browser or environment.',
      };
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userIdBytes = new TextEncoder().encode(user.id || user.email);

      // WebAuthn Creation Options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Zamzam Pure Water - Field Ops',
          id: window.location.hostname || 'localhost',
        },
        user: {
          id: userIdBytes,
          name: user.email,
          displayName: user.name || user.email,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Hardware device sensor (fingerprint, Face ID, Windows Hello)
          userVerification: 'preferred',
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        return { success: false, error: 'Biometric registration was cancelled.' };
      }

      const credentialId = bufferToBase64Url(credential.rawId);
      const defaultLabel = customDeviceLabel || `${getBiometricPlatformLabel()} (${new Date().toLocaleDateString()})`;

      const newBiometricCred: BiometricCredential = {
        id: credentialId,
        rawId: credentialId,
        userId: user.id,
        userEmail: user.email.toLowerCase(),
        userName: user.name,
        deviceLabel: defaultLabel,
        createdAt: new Date().toISOString(),
      };

      storageService.saveBiometricCredential(newBiometricCred);
      storageService.addActivityLog({
        action: 'biometric_registered',
        entityType: 'auth',
        entityId: user.id,
        description: `Enrolled ${defaultLabel} for staff ${user.name} (${user.employeeId})`,
        status: 'success',
      });

      return { success: true, credential: newBiometricCred };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Biometric registration request was cancelled or timed out.',
        };
      }
      if (err.name === 'InvalidStateError') {
        return {
          success: false,
          error: 'This biometric credential is already registered on this device.',
        };
      }
      return {
        success: false,
        error: err.message || 'Failed to complete biometric registration.',
      };
    }
  }

  /**
   * Authenticate field staff using biometric sensor (Fingerprint / Face ID)
   */
  public async authenticateWithBiometrics(
    targetEmail?: string
  ): Promise<{
    success: boolean;
    credential?: BiometricCredential;
    user?: UserProfile;
    error?: string;
  }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Biometric WebAuthn authentication is not supported in this browser.',
      };
    }

    const allCreds = storageService.getBiometricCredentials();
    const targetCreds = targetEmail
      ? allCreds.filter((c) => c.userEmail === targetEmail.toLowerCase())
      : allCreds;

    if (targetCreds.length === 0) {
      return {
        success: false,
        error: targetEmail
          ? `No biometric credentials registered for ${targetEmail}. Please login with password or register biometrics first.`
          : 'No biometric credentials registered on this device. Sign in with your password to register your fingerprint or Face ID.',
      };
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const allowCredentials: PublicKeyCredentialDescriptor[] = targetCreds.map((cred) => ({
        id: base64UrlToBuffer(cred.id),
        type: 'public-key',
        transports: ['internal'],
      }));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        rpId: window.location.hostname || 'localhost',
        userVerification: 'preferred',
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      };

      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential | null;

      if (!assertion) {
        return {
          success: false,
          error: 'Biometric authentication was cancelled.',
        };
      }

      const assertionId = bufferToBase64Url(assertion.rawId);
      const matchedCred = allCreds.find((c) => c.id === assertionId || c.rawId === assertionId) || targetCreds[0];

      if (!matchedCred) {
        return {
          success: false,
          error: 'Biometric verification failed: unlinked credential ID.',
        };
      }

      // Check if user profile is stored locally or construct from credential
      const storedUser = storageService.getUser();
      const authenticatedUser: UserProfile =
        storedUser && storedUser.email.toLowerCase() === matchedCred.userEmail.toLowerCase()
          ? storedUser
          : {
              id: matchedCred.userId,
              name: matchedCred.userName,
              email: matchedCred.userEmail,
              phone: '+255 700 000 000',
              role: 'field_staff',
              employeeId: 'ZZ-STAFF',
            };

      storageService.setUser(authenticatedUser);
      storageService.addActivityLog({
        action: 'biometric_login',
        entityType: 'auth',
        entityId: authenticatedUser.id,
        description: `Staff ${authenticatedUser.name} signed in securely via ${matchedCred.deviceLabel}`,
        status: 'success',
      });

      return {
        success: true,
        credential: matchedCred,
        user: authenticatedUser,
      };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Biometric authentication was cancelled or user sensor check timed out.',
        };
      }
      return {
        success: false,
        error: err.message || 'Biometric authentication failed. Please use password login.',
      };
    }
  }

  /**
   * Get all registered biometric credentials for the current device or user
   */
  public getCredentials(userId?: string): BiometricCredential[] {
    const creds = storageService.getBiometricCredentials();
    if (userId) {
      return creds.filter((c) => c.userId === userId);
    }
    return creds;
  }

  /**
   * Remove a biometric credential
   */
  public removeCredential(credentialId: string): void {
    storageService.removeBiometricCredential(credentialId);
  }

  /**
   * Quick check whether a user or device has any active biometric registrations
   */
  public hasRegisteredCredentials(userEmail?: string): boolean {
    const creds = storageService.getBiometricCredentials();
    if (!userEmail) return creds.length > 0;
    return creds.some((c) => c.userEmail.toLowerCase() === userEmail.toLowerCase());
  }
}

export const webAuthnService = new WebAuthnService();
