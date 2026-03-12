import { auth, db } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

// Helper to convert ArrayBuffer to Base64
export const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Helper to convert Base64 to ArrayBuffer
export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Registers a new passkey for the currently logged-in user.
 * Saves the credential ID and public key info to Firestore under the user's document.
 */
export const registerPasskey = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Kullanıcı girişi yapılmamış.');

  if (!window.PublicKeyCredential) {
    throw new Error('Tarayıcınız WebAuthn (Passkey) desteklemiyor.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdBuffer = new TextEncoder().encode(user.uid);

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Hatim Pro',
          id: window.location.hostname,
        },
        user: {
          id: userIdBuffer,
          name: user.email || user.uid,
          displayName: user.displayName || user.email || 'Kullanıcı',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential;

    if (!credential) throw new Error('Passkey oluşturulamadı.');

    // Store the credential info in Firestore under the user's document
    const credentialIdStr = bufferToBase64(credential.rawId);
    
    await setDoc(doc(db, 'users', user.uid, 'passkeys', credentialIdStr), {
      credentialId: credentialIdStr,
      createdAt: new Date().toISOString(),
      clientExtensionResults: credential.getClientExtensionResults(),
      // Note: In a real production app with a backend, we would parse the attestationObject 
      // to extract and store the actual Public Key (COSE format) for signature verification.
      // Since this is a client-side implementation, we store the credential ID.
      status: 'active'
    });

    return credential;
  } catch (error: any) {
    console.error('Passkey registration error:', error);
    throw new Error(error.message || 'Biyometrik kayıt sırasında bir hata oluştu.');
  }
};

/**
 * Authenticates a user using a previously registered passkey.
 * Note: Full Firebase Auth login via Passkeys requires a backend (Cloud Functions) 
 * to verify the signature and mint a custom token. This function performs the 
 * WebAuthn client-side verification.
 */
export const loginWithPasskey = async () => {
  if (!window.PublicKeyCredential) {
    throw new Error('Tarayıcınız WebAuthn (Passkey) desteklemiyor.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential;

    if (!assertion) throw new Error('Passkey doğrulaması başarısız.');

    const credentialIdStr = bufferToBase64(assertion.rawId);

    // In a full implementation, we would send the assertion to a backend:
    // 1. Backend verifies the signature using the stored Public Key.
    // 2. Backend mints a Firebase Custom Token.
    // 3. Client calls signInWithCustomToken(auth, token).
    
    return {
      success: true,
      credentialId: credentialIdStr,
      message: 'Biyometrik doğrulama başarılı! (Not: Firebase Auth tam entegrasyonu için backend gereklidir.)'
    };
  } catch (error: any) {
    console.error('Passkey login error:', error);
    throw new Error(error.message || 'Biyometrik giriş sırasında bir hata oluştu.');
  }
};
