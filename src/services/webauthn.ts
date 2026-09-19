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
 * Detect if device is a mobile phone (Android, iPhone, etc.)
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isTouch = (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0);
  const isMobileUa = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 820;
  return isMobileUa || (isTouch && isSmallScreen);
}

/**
 * Get detailed mobile device information for field diagnostics
 */
export function getMobileDeviceInfo(): {
  isMobile: boolean;
  os: 'android' | 'ios' | 'windows' | 'mac' | 'other';
  deviceModel: string;
  biometricType: string;
  label: string;
} {
  if (typeof navigator === 'undefined') {
    return {
      isMobile: false,
      os: 'other',
      deviceModel: 'Desktop Workstation',
      biometricType: 'Biometric Sensor',
      label: 'Standard Biometrics',
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isMobile = isMobileDevice();

  let os: 'android' | 'ios' | 'windows' | 'mac' | 'other' = 'other';
  let deviceModel = isMobile ? 'Mobile Phone' : 'Workstation';
  let biometricType = 'Fingerprint';
  let label = 'Biometric Sensor';

  if (ua.includes('android')) {
    os = 'android';
    biometricType = 'Fingerprint / Face Unlock';
    // Attempt to extract common Android phone vendor
    if (ua.includes('samsung') || ua.includes('sm-')) deviceModel = 'Samsung Galaxy';
    else if (ua.includes('pixel')) deviceModel = 'Google Pixel';
    else if (ua.includes('xiaomi') || ua.includes('redmi')) deviceModel = 'Xiaomi / Redmi';
    else if (ua.includes('tecno')) deviceModel = 'Tecno Mobile';
    else if (ua.includes('infinix')) deviceModel = 'Infinix Mobile';
    else if (ua.includes('oppo') || ua.includes('cph')) deviceModel = 'Oppo Phone';
    else deviceModel = 'Android Smartphone';
    label = `${deviceModel} (${biometricType})`;
  } else if (ua.includes('iphone')) {
    os = 'ios';
    deviceModel = 'Apple iPhone';
    biometricType = 'Face ID / Touch ID';
    label = `iPhone (${biometricType})`;
  } else if (ua.includes('ipad')) {
    os = 'ios';
    deviceModel = 'Apple iPad';
    biometricType = 'Touch ID / Face ID';
    label = `iPad (${biometricType})`;
  } else if (ua.includes('macintosh')) {
    os = 'mac';
    deviceModel = 'MacBook / Mac';
    biometricType = 'Touch ID';
    label = `Mac (${biometricType})`;
  } else if (ua.includes('windows')) {
    os = 'windows';
    deviceModel = 'Windows PC';
    biometricType = 'Windows Hello';
    label = `Windows PC (${biometricType})`;
  }

  return {
    isMobile,
    os,
    deviceModel,
    biometricType,
    label,
  };
}

/**
 * Detect friendly biometric label based on platform
 */
export function getBiometricPlatformLabel(): string {
  const info = getMobileDeviceInfo();
  return info.biometricType;
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
      if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get RP ID safely for mobile domain resolution
   */
  private getRpId(): string {
    if (typeof window === 'undefined') return 'localhost';
    const hostname = window.location.hostname;
    // If hostname is empty or standard localhost
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost';
    }
    return hostname;
  }

  /**
   * Register a new biometric passkey/credential for field staff
   */
  public async registerBiometricCredential(
    user: UserProfile,
    customDeviceLabel?: string
  ): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    const isMobile = isMobileDevice();
    const deviceInfo = getMobileDeviceInfo();

    if (!this.isSupported()) {
      return {
        success: false,
        error: isMobile
          ? 'Mobile WebAuthn is not supported in this mobile browser. Please use Chrome or Safari on your phone.'
          : 'WebAuthn is not supported in this browser or environment.',
      };
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userIdBytes = new TextEncoder().encode(user.id || user.email);
      const rpId = this.getRpId();

      // Mobile-optimized WebAuthn creation options:
      // Accepts both ES256 (-7), RS256 (-257), and Ed25519 (-8)
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Zamzam Pure Water - Field Ops',
          id: rpId,
        },
        user: {
          id: userIdBytes,
          name: user.email,
          displayName: user.name || user.email,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256 (Android Fingerprint / iOS Face ID standard)
          { alg: -257, type: 'public-key' }, // RS256
          { alg: -8, type: 'public-key' }, // Ed25519
        ],
        authenticatorSelection: {
          // On mobile phones, 'preferred' allows native fingerprint/FaceID without failing if hybrid/passkey manager is used
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 90000, // Generous 90s for mobile biometric prompt
        attestation: 'none',
      };

      let credential: PublicKeyCredential | null = null;
      try {
        credential = (await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        })) as PublicKeyCredential | null;
      } catch (innerErr: any) {
        // Fallback for some Android mobile browsers where 'platform' attachment throws NotSupportedError
        if (innerErr?.name === 'NotSupportedError' || innerErr?.name === 'ConstraintError') {
          const fallbackOptions = {
            ...publicKeyCredentialCreationOptions,
            authenticatorSelection: {
              userVerification: 'preferred' as const,
              residentKey: 'preferred' as const,
              requireResidentKey: false,
            },
          };
          credential = (await navigator.credentials.create({
            publicKey: fallbackOptions,
          })) as PublicKeyCredential | null;
        } else {
          throw innerErr;
        }
      }

      if (!credential) {
        return {
          success: false,
          error: isMobile
            ? 'Mobile biometric sensor scan was cancelled on your phone.'
            : 'Biometric registration was cancelled.',
        };
      }

      const credentialId = bufferToBase64Url(credential.rawId);
      const defaultLabel =
        customDeviceLabel ||
        `${deviceInfo.deviceModel} ${deviceInfo.biometricType} (${new Date().toLocaleDateString()})`;

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
        description: `Enrolled mobile biometric key for staff ${user.name} (${defaultLabel})`,
        status: 'success',
      });

      return { success: true, credential: newBiometricCred };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          error: isMobile
            ? 'Mobile biometric scan was cancelled, or screen lock verification timed out. Ensure your phone screen lock (fingerprint or PIN) is enabled in Android/iOS settings.'
            : 'Biometric registration request was cancelled or timed out.',
        };
      }
      if (err.name === 'InvalidStateError') {
        return {
          success: false,
          error: 'This biometric passkey is already enrolled on this mobile device.',
        };
      }
      if (err.name === 'SecurityError') {
        return {
          success: false,
          error: 'Browser security policy restriction: biometric authentication requires HTTPS or a trusted local domain.',
        };
      }
      return {
        success: false,
        error: err.message || 'Failed to complete mobile biometric registration.',
      };
    }
  }

  /**
   * Authenticate field staff using mobile biometric sensor (Fingerprint / Face ID)
   */
  public async authenticateWithBiometrics(
    targetEmail?: string
  ): Promise<{
    success: boolean;
    credential?: BiometricCredential;
    user?: UserProfile;
    error?: string;
  }> {
    const isMobile = isMobileDevice();
    const deviceInfo = getMobileDeviceInfo();

    if (!this.isSupported()) {
      return {
        success: false,
        error: isMobile
          ? 'Biometric WebAuthn authentication is not supported in this mobile browser. Please use Chrome (Android) or Safari (iOS).'
          : 'Biometric WebAuthn authentication is not supported in this browser.',
      };
    }

    const allCreds = storageService.getBiometricCredentials();
    const targetCreds = targetEmail
      ? allCreds.filter((c) => c.userEmail === targetEmail.toLowerCase())
      : allCreds;

    // Notice: If targetCreds is empty on mobile, check if we can trigger passkey discovery
    const hasExistingLocalKeys = targetCreds.length > 0;

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // CRITICAL FOR MOBILE: Support both 'internal' (platform sensor) and 'hybrid' (phone passkeys)
      const allowCredentials: PublicKeyCredentialDescriptor[] | undefined = hasExistingLocalKeys
        ? targetCreds.map((cred) => ({
            id: base64UrlToBuffer(cred.id),
            type: 'public-key',
            transports: ['internal', 'hybrid'],
          }))
        : undefined;

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 90000,
        rpId: this.getRpId(),
        userVerification: 'preferred',
        allowCredentials,
      };

      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential | null;

      if (!assertion) {
        return {
          success: false,
          error: isMobile
            ? 'Mobile biometric scan was cancelled on your phone.'
            : 'Biometric authentication was cancelled.',
        };
      }

      const assertionId = bufferToBase64Url(assertion.rawId);
      let matchedCred = allCreds.find((c) => c.id === assertionId || c.rawId === assertionId);

      // If discovered passkey on mobile that wasn't in local array yet:
      if (!matchedCred && targetCreds.length > 0) {
        matchedCred = targetCreds[0];
      }

      if (!matchedCred) {
        // If resident passkey discovered without local record, use active local user or prompt enrollment
        const storedUser = storageService.getUser();
        if (storedUser) {
          const autoCred: BiometricCredential = {
            id: assertionId,
            rawId: assertionId,
            userId: storedUser.id,
            userEmail: storedUser.email.toLowerCase(),
            userName: storedUser.name,
            deviceLabel: deviceInfo.label,
            createdAt: new Date().toISOString(),
          };
          storageService.saveBiometricCredential(autoCred);
          matchedCred = autoCred;
        } else {
          return {
            success: false,
            error: 'Mobile passkey verified, but no matching staff profile found on this phone. Sign in with your password once to link your profile.',
          };
        }
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
        description: `Staff ${authenticatedUser.name} signed in securely via mobile sensor (${matchedCred.deviceLabel})`,
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
          error: isMobile
            ? 'Mobile biometric scan was cancelled, or the phone sensor check timed out.'
            : 'Biometric authentication was cancelled or user sensor check timed out.',
        };
      }
      if (err.name === 'SecurityError') {
        return {
          success: false,
          error: 'Biometric authentication requires a secure context (HTTPS).',
        };
      }
      // If no credentials registered and get failed
      if (!hasExistingLocalKeys) {
        return {
          success: false,
          error: targetEmail
            ? `No biometric credentials registered on this mobile phone for ${targetEmail}. Sign in with password once to enroll this phone's ${deviceInfo.biometricType}.`
            : `No biometric credentials registered on this phone yet. Sign in once with password to link your ${deviceInfo.biometricType} for instant 1-tap sign in.`,
        };
      }
      return {
        success: false,
        error: err.message || 'Mobile biometric authentication failed. Please use password login.',
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
