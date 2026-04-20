import type { PDFDocument, PDFFont } from 'pdf-lib';
import { StandardFonts } from 'pdf-lib';
import type { FontRegistry } from '../types';
import {
  getStandardFontName,
  getFontVariantKey,
  STANDARD_FONT_MAP,
} from './standard-fonts';

/**
 * Manages font resolution, embedding, and caching for PDF generation.
 * Handles both standard PDF fonts and custom user-provided fonts.
 */
export class FontManager {
  private cache = new Map<string, PDFFont>();

  /**
   * Creates a FontManager instance.
   *
   * @param fontRegistry - Registry of custom fonts with their variant bytes
   * @param defaultFont - Default font family to use as fallback
   * @param pdfDoc - The PDF document to embed fonts into
   */
  constructor(
    private fontRegistry: FontRegistry,
    private defaultFont: string,
    private pdfDoc: PDFDocument,
  ) {}

  /**
   * Resolve a font by family, weight, and style.
   * Uses cache if available, otherwise embeds the font.
   *
   * @param fontFamily - Font family name
   * @param fontWeight - Font weight ('normal', 'bold', or numeric)
   * @param fontStyle - Font style ('normal', 'italic', 'oblique')
   * @returns The embedded PDFFont
   */
  async resolve(
    fontFamily: string,
    fontWeight: string | number,
    fontStyle: string,
  ): Promise<PDFFont> {
    // Build variant key
    const variantKey = getFontVariantKey(fontFamily, fontWeight, fontStyle);

    // Check cache first
    const cached = this.cache.get(variantKey);
    if (cached) {
      return cached;
    }

    // Try to resolve the font
    const font = await this.embedFont(fontFamily, fontWeight, fontStyle, variantKey);
    return font;
  }

  /**
   * Get an embedded font from the cache by key.
   *
   * @param key - Font variant key
   * @returns The cached PDFFont or undefined
   */
  getEmbeddedFont(key: string): PDFFont | undefined {
    return this.cache.get(key);
  }

  /**
   * Embed a font into the PDF document.
   * Tries custom registry first, then standard fonts, then falls back to default.
   *
   * @param fontFamily - Font family name
   * @param fontWeight - Font weight
   * @param fontStyle - Font style
   * @param variantKey - Cache key for the variant
   * @returns The embedded PDFFont
   */
  private async embedFont(
    fontFamily: string,
    fontWeight: string | number,
    fontStyle: string,
    variantKey: string,
  ): Promise<PDFFont> {
    // 1. Try custom font registry
    const customFont = await this.tryEmbedCustomFont(fontFamily, fontWeight, fontStyle);
    if (customFont) {
      this.cache.set(variantKey, customFont);
      return customFont;
    }

    // 2. Try standard PDF fonts
    const standardFontName = getStandardFontName(fontFamily);
    if (standardFontName) {
      const standardFont = await this.tryEmbedStandardFont(
        standardFontName,
        fontWeight,
        fontStyle,
      );
      if (standardFont) {
        this.cache.set(variantKey, standardFont);
        return standardFont;
      }
    }

    // 3. Fall back to default font
    const fallbackFont = await this.embedFont(
      this.defaultFont,
      fontWeight,
      fontStyle,
      variantKey,
    );
    return fallbackFont;
  }

  /**
   * Try to embed a custom font from the registry.
   *
   * @param fontFamily - Font family name
   * @param fontWeight - Font weight
   * @param fontStyle - Font style
   * @returns The embedded PDFFont or undefined
   */
  private async tryEmbedCustomFont(
    fontFamily: string,
    fontWeight: string | number,
    fontStyle: string,
  ): Promise<PDFFont | undefined> {
    const variants = this.fontRegistry[fontFamily];
    if (!variants) {
      return undefined;
    }

    // Determine which variant to use
    const isBold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === 700;
    const isItalic = fontStyle === 'italic' || fontStyle === 'oblique';

    let fontBytes: ArrayBuffer | Uint8Array | undefined;

    if (isBold && isItalic && variants.boldItalic) {
      fontBytes = variants.boldItalic;
    } else if (isBold && variants.bold) {
      fontBytes = variants.bold;
    } else if (isItalic && variants.italic) {
      fontBytes = variants.italic;
    } else if (variants.regular) {
      fontBytes = variants.regular;
    }

    if (!fontBytes) {
      return undefined;
    }

    const font = await this.pdfDoc.embedFont(fontBytes);
    return font;
  }

  /**
   * Try to embed a standard PDF font.
   *
   * @param standardFontName - Standard PDF font name
   * @param fontWeight - Font weight
   * @param fontStyle - Font style
   * @returns The embedded PDFFont or undefined
   */
  private async tryEmbedStandardFont(
    standardFontName: string,
    fontWeight: string | number,
    fontStyle: string,
  ): Promise<PDFFont | undefined> {
    // Determine the variant name
    const isBold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === 700;
    const isItalic = fontStyle === 'italic' || fontStyle === 'oblique';

    let variantName = standardFontName;

    // Build variant name (e.g., "Helvetica-BoldOblique")
    if (isBold && isItalic) {
      variantName = `${standardFontName}-BoldOblique`;
      if (standardFontName === 'Times-Roman') {
        variantName = 'Times-BoldItalic';
      }
    } else if (isBold) {
      variantName = `${standardFontName}-Bold`;
    } else if (isItalic) {
      variantName = `${standardFontName}-Oblique`;
      if (standardFontName === 'Times-Roman') {
        variantName = 'Times-Italic';
      }
    }

    const standardFont = STANDARD_FONT_MAP[variantName];
    if (!standardFont) {
      return undefined;
    }

    const font = await this.pdfDoc.embedFont(standardFont);
    return font;
  }
}
