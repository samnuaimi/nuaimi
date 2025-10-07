/**
 * Formats a raw phone number string into a US-style string: (XXX) XXX-XXXX.
 * @param {string} value - The raw input string.
 * @returns {string} The formatted phone number string.
 */
function formatPhoneNumber(value) {
  if (!value) return value;

  // 1. Clean the number to only digits
  const rawNumber = value.replace(/[^\d]/g, '');
  const rawLength = rawNumber.length;

  // 2. Format based on length
  if (rawLength < 4) {
    return rawNumber;
  }
  
  // Format for 4-6 digits: (123) 456
  if (rawLength < 7) {
    return `(${rawNumber.slice(0, 3)}) ${rawNumber.slice(3)}`;
  }

  // Format for 7-10 digits: (123) 456-7890
  if (rawLength <= 10) {
    return `(${rawNumber.slice(0, 3)}) ${rawNumber.slice(3, 6)}-${rawNumber.slice(6, 10)}`;
  }
  
  // Optional: Handle numbers longer than 10 digits (e.g., country code)
  // Example for 11 digits: +1 (234) 567-8901
  if (rawLength > 10) {
    const countryCode = rawNumber.slice(0, rawLength - 10);
    const areaCode = rawNumber.slice(rawLength - 10, rawLength - 7);
    const prefix = rawNumber.slice(rawLength - 7, rawLength - 4);
    const line = rawNumber.slice(rawNumber.length - 4);
    
    return `+${countryCode} (${areaCode}) ${prefix}-${line}`;
  }

  return rawNumber;
}


// --- Linking the function to the input field ---

// Get a reference to the input element
const phoneInputField = document.getElementById('phone_number');

// Check if the element exists before trying to attach a listener
if (phoneInputField) {
  // Attach an 'input' event listener to format the number as the user types
  phoneInputField.addEventListener('input', (event) => {
    // Get the current unformatted value
    const rawValue = event.target.value;
    
    // Apply the formatting function
    const formattedValue = formatPhoneNumber(rawValue);
    
    // Set the input field's value to the formatted string
    event.target.value = formattedValue;
  });
}