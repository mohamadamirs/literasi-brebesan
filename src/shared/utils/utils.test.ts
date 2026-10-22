import { describe, it, expect } from 'vitest';
import { stripHtml, truncateText, truncateTitle, extractFirstImage, parseWibDateTime, formatWibDateTime } from "@/shared/utils/utils";

describe('Utility Functions', () => {
  describe('stripHtml', () => {
    it('should remove HTML tags and normalize whitespace', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      expect(stripHtml(input)).toBe('Hello World');
    });

    it('should return empty string for null or undefined', () => {
      expect(stripHtml('')).toBe('');
    });
  });

  describe('truncateText', () => {
    it('should truncate text to specified length and add ellipsis', () => {
      const input = 'This is a very long text that needs to be truncated.';
      expect(truncateText(input, 10)).toBe('This is a...');
    });

    it('should not truncate if text is shorter than length', () => {
      const input = 'Short';
      expect(truncateText(input, 10)).toBe('Short');
    });
  });

  describe('truncateTitle', () => {
    it('should truncate title without removing HTML (it assumes plain text)', () => {
      const input = 'Very Long Title that should be shorter';
      expect(truncateTitle(input, 10)).toBe('Very Long...');
    });
  });

  describe('extractFirstImage', () => {
    it('should extract the src of the first image tag', () => {
      const input = '<div><p>Text</p><img src="test.jpg" alt="alt" /></div>';
      expect(extractFirstImage(input)).toBe('test.jpg');
    });

    it('should return null if no image is found', () => {
      const input = '<div><p>No image here</p></div>';
      expect(extractFirstImage(input)).toBe(null);
    });

    it('should handle case-insensitive and extra spaces', () => {
      const input = '<IMG   SRC="case.png" >';
      expect(extractFirstImage(input)).toBe('case.png');
    });
  });

  describe('WIB datetime', () => {
    it('should treat datetime-local value as WIB and convert to UTC', () => {
      const result = parseWibDateTime('2026-10-25T10:00');
      expect(result.toISOString()).toBe('2026-10-25T03:00:00.000Z');
    });

    it('should format a UTC date back to WIB datetime-local value', () => {
      const result = formatWibDateTime(new Date('2026-10-25T03:00:00.000Z'));
      expect(result).toBe('2026-10-25T10:00');
    });

    it('should round-trip WIB datetime-local value', () => {
      expect(formatWibDateTime(parseWibDateTime('2026-01-31T23:45'))).toBe(
        '2026-01-31T23:45',
      );
    });

    it('should return empty string for null value', () => {
      expect(formatWibDateTime(null)).toBe('');
    });
  });
});
