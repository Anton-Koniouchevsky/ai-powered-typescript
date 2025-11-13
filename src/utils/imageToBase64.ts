import * as fs from 'fs';
import * as path from 'path';

export function imageToBase64(imagePath: string): string {
  try {
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Get the file extension to determine the MIME type
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg'; // default
    
    switch (ext) {
      case '.png':
        mimeType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
    }
    
    // Convert to base64
    const base64String = imageBuffer.toString('base64');
    
    // Return the complete data URL
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error}`);
  }
}

// Helper function to get just the base64 string without the data URL prefix
export function imageToBase64String(imagePath: string): string {
  const resolvedPath = path.resolve(imagePath);
  const imageBuffer = fs.readFileSync(resolvedPath);
  return imageBuffer.toString('base64');
}