export function photosToFormData(photos: Blob[], formData = new FormData()) {
  photos.forEach((photo, index) => formData.append("photos", photo, `photo-${index + 1}.jpg`));
  return formData;
}
