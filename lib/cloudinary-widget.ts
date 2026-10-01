export const isCloudinaryWidgetConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
  && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim(),
);
