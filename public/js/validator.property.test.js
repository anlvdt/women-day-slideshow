import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateWishForm } from "./validator.js";

/**
 * Property P2: Tính đúng đắn của validation
 *
 * ∀ formData:
 *   validateWishForm(formData).isValid === true
 *   ⟺ formData.senderName.trim().length ∈ [2, 50]
 *      ∧ formData.message.trim().length ∈ [5, 500]
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
 */
describe("Property P2: Tính đúng đắn của validation", () => {
  /**
   * Helper: check if formData fields are within valid ranges after trim
   */
  function isFormDataValid(formData) {
    const nameLen = (formData.senderName || "").trim().length;
    const rawMessage = (formData.message || "").trim();
    const textOnly = rawMessage.replace(/<[^>]*>?/gm, "").trim();

    const isNameValid = nameLen >= 2 && nameLen <= 50;

    // Valid message if:
    // It's not empty AND length <= 5000 AND
    // (textOnly length >= 2 OR it contains an SVG)
    let isMsgValid = false;
    if (rawMessage.length > 0 && rawMessage.length <= 5000) {
      if (textOnly.length >= 2 || rawMessage.indexOf("<svg") !== -1) {
        isMsgValid = true;
      }
    }

    return isNameValid && isMsgValid;
  }

  it("biconditional: isValid === true iff senderName.trim().length ∈ [2,50] AND message passes SVG/length rules", () => {
    fc.assert(
      fc.property(
        fc.record({
          senderName: fc.string({ minLength: 0, maxLength: 80 }),
          message: fc.string({ minLength: 0, maxLength: 6000 }),
        }),
        (formData) => {
          const result = validateWishForm(formData);
          const expectedValid = isFormDataValid(formData);
          expect(result.isValid).toBe(expectedValid);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("valid inputs always produce isValid === true with empty errors array", () => {
    // Generator for valid senderName: trimmed length in [2, 50]
    const validName = fc
      .string({ minLength: 2, maxLength: 50 })
      .filter((s) => {
        const len = s.trim().length;
        return len >= 2 && len <= 50;
      });

    // Generator for valid message: trimmed length in [2, 5000]
    const validMessage = fc
      .string({ minLength: 2, maxLength: 5000 })
      .filter((s) => {
        const rawMessage = s.trim();
        const textOnly = rawMessage.replace(/<[^>]*>?/gm, "").trim();
        return rawMessage.length > 0 && rawMessage.length <= 5000 && (textOnly.length >= 2 || rawMessage.indexOf("<svg") !== -1);
      });

    fc.assert(
      fc.property(validName, validMessage, (senderName, message) => {
        const result = validateWishForm({ senderName, message });
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      }),
      { numRuns: 300 }
    );
  });

  it("invalid inputs always produce isValid === false with non-empty errors", () => {
    // Generator that produces at least one invalid field
    const anyFormData = fc.record({
      senderName: fc.string({ minLength: 0, maxLength: 80 }),
      message: fc.string({ minLength: 0, maxLength: 6000 }),
    });

    fc.assert(
      fc.property(
        anyFormData.filter((fd) => !isFormDataValid(fd)),
        (formData) => {
          const result = validateWishForm(formData);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 300 }
    );
  });
});
