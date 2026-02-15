/**
 * Validation Utilities
 *
 * Common validation functions for request data.
 */

/**
 * Validate UUID v4 format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid UUID v4
 */
function isValidUUID(id) {
  if (!id || typeof id !== "string") {
    return false;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

module.exports = {
  isValidUUID,
};
