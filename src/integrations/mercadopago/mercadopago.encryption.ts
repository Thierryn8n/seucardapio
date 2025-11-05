import * as crypto from 'crypto';

export class RoleEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;

  private static getMasterKey(): Buffer {
    const masterKey = import.meta.env.VITE_ROLE_ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('Chave de criptografia não configurada');
    }
    return Buffer.from(masterKey, 'hex');
  }

  private static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, 'sha256');
  }

  static encryptRole(role: string, userId: string): { encrypted: string; salt: string; tag: string } {
    try {
      const masterKey = this.getMasterKey();
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Derivar chave usando userId como senha
      const key = this.deriveKey(userId, salt);
      
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(Buffer.from(userId));
      
      let encrypted = cipher.update(role, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        salt: salt.toString('hex'),
        tag: tag.toString('hex'),
      };
    } catch (error) {
      console.error('Erro ao criptografar role:', error);
      throw new Error('Falha na criptografia do role');
    }
  }

  static decryptRole(encryptedData: { encrypted: string; salt: string; tag: string }, userId: string): string {
    try {
      const masterKey = this.getMasterKey();
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      // Derivar chave usando userId como senha
      const key = this.deriveKey(userId, salt);
      
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(userId));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar role:', error);
      throw new Error('Falha na descriptografia do role');
    }
  }

  static hashRole(role: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(role);
    return hash.digest('hex');
  }

  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateApiKey(): string {
    const prefix = 'mp_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return prefix + randomBytes;
  }

  static validateEncryptedRole(encryptedRole: any): boolean {
    if (!encryptedRole || typeof encryptedRole !== 'object') {
      return false;
    }
    
    const requiredFields = ['encrypted', 'salt', 'tag'];
    return requiredFields.every(field => 
      typeof encryptedRole[field] === 'string' && 
      encryptedRole[field].length > 0
    );
  }

  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  static createWebhookSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createWebhookSignature(payload, secret);
    return this.secureCompare(signature, expectedSignature);
  }
}

// Funções auxiliares para uso no frontend
export const encryptUserRole = (role: string, userId: string): string => {
  const encrypted = RoleEncryption.encryptRole(role, userId);
  return JSON.stringify(encrypted);
};

export const decryptUserRole = (encryptedData: string, userId: string): string => {
  try {
    const parsed = JSON.parse(encryptedData);
    return RoleEncryption.decryptRole(parsed, userId);
  } catch (error) {
    console.error('Erro ao descriptografar role do usuário:', error);
    return 'user'; // Role padrão em caso de erro
  }
};

export const validateUserRole = (encryptedRole: string, userId: string, expectedRole: string): boolean => {
  try {
    const decryptedRole = decryptUserRole(encryptedRole, userId);
    return RoleEncryption.secureCompare(decryptedRole, expectedRole);
  } catch (error) {
    console.error('Erro na validação do role:', error);
    return false;
  }
};