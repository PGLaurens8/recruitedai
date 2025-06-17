
export const fileToDataURI = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const textToDataURI = (text: string, mimeType: string = 'text/plain'): string => {
  try {
    // For UTF-8 characters, direct btoa can fail.
    // Encode to UTF-8 URI components, then unescape to get byte string, then btoa.
    const base64Text = btoa(unescape(encodeURIComponent(text)));
    return `data:${mimeType};base64,${base64Text}`;
  } catch (e) {
    console.error("Error converting text to data URI:", e);
    // Fallback for simpler cases or if above fails unexpectedly
    const base64Text = btoa(text);
    return `data:${mimeType};base64,${base64Text}`;
  }
};
