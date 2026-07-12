// utils/CodeGenerator.ts
import { nanoid, customAlphabet } from 'nanoid';

export class CodeGenerator {
  private static instance: CodeGenerator;
  private defaultLength: number = 8;
  private defaultAlphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  private constructor() {}

  public static getInstance(): CodeGenerator {
    if (!CodeGenerator.instance) {
      CodeGenerator.instance = new CodeGenerator();
    }
    return CodeGenerator.instance;
  }

  // Generate a simple short code
  public generate(length: number = this.defaultLength): string {
    return nanoid(length);
  }

  // Generate code with custom alphabet
  public generateWithAlphabet(alphabet: string, length: number = this.defaultLength): string {
    const customNanoId = customAlphabet(alphabet, length);
    return customNanoId();
  }

  // Generate URL-friendly code (no special chars)
  public generateUrlFriendly(length: number = this.defaultLength): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const customNanoId = customAlphabet(alphabet, length);
    return customNanoId();
  }

  // Generate code with prefix
  public generateWithPrefix(prefix: string, length: number = this.defaultLength): string {
    const code = this.generate(length);
    return `${prefix}${code}`;
  }

  // Generate code that is easy to read (no ambiguous characters)
  public generateReadable(length: number = this.defaultLength): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const customNanoId = customAlphabet(alphabet, length);
    return customNanoId();
  }

  // Generate code with custom length and alphabet
  public generateCustom(options: {
    length?: number;
    alphabet?: string;
    prefix?: string;
    suffix?: string;
  }): string {
    const {
      length = this.defaultLength,
      alphabet = this.defaultAlphabet,
      prefix = '',
      suffix = ''
    } = options;

    const customNanoId = customAlphabet(alphabet, length);
    const code = customNanoId();
    return `${prefix}${code}${suffix}`;
  }

  // Generate multiple unique codes
  public generateMultiple(count: number, length: number = this.defaultLength): string[] {
    const codes = new Set<string>();
    let attempts = 0;
    const maxAttempts = count * 10;

    while (codes.size < count && attempts < maxAttempts) {
      codes.add(this.generate(length));
      attempts++;
    }

    if (codes.size < count) {
      throw new Error(`Failed to generate ${count} unique codes after ${maxAttempts} attempts`);
    }

    return Array.from(codes);
  }

  // Validate if a code is in the correct format
  public validateCode(code: string, expectedLength?: number): boolean {
    if (!code) return false;
    if (expectedLength && code.length !== expectedLength) return false;
    
    // Check if code contains only allowed characters
    const allowedChars = /^[A-Za-z0-9_-]+$/;
    return allowedChars.test(code);
  }

  // Generate code with built-in collision check (async version)
  public async generateUniqueCode(
    checkExists: (code: string) => Promise<boolean>,
    maxAttempts: number = 10,
    length: number = this.defaultLength
  ): Promise<string> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const code = this.generate(length);
      const exists = await checkExists(code);
      
      if (!exists) {
        return code;
      }
      
      attempts++;
    }

    throw new Error(`Failed to generate unique code after ${maxAttempts} attempts`);
  }

  // Generate code with built-in collision check (sync version)
  public generateUniqueCodeSync(
    checkExists: (code: string) => boolean,
    maxAttempts: number = 10,
    length: number = this.defaultLength
  ): string {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const code = this.generate(length);
      const exists = checkExists(code);
      
      if (!exists) {
        return code;
      }
      
      attempts++;
    }

    throw new Error(`Failed to generate unique code after ${maxAttempts} attempts`);
  }
}

// Export singleton instance
export const codeGenerator = CodeGenerator.getInstance();

// Export individual functions for convenience
export const generateShortCode = (length?: number) => codeGenerator.generate(length);
export const generateUrlFriendlyCode = (length?: number) => codeGenerator.generateUrlFriendly(length);
export const generateReadableCode = (length?: number) => codeGenerator.generateReadable(length);