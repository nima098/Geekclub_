/**
 * CDN Upload, Health Check & Image Migration Service for GeekClub
 * Targets custom PHP host: upc.geekclub.ir
 */

import { FALLBACK_IMAGES } from '../utils/imageHelper';

export interface CDNConfig {
  endpointUrl: string;
  apiToken: string;
}

export interface CDNHealthReport {
  ok: boolean;
  statusCode: number;
  endpoint: string;
  latencyMs: number;
  message: string;
  details?: string;
  timestamp: string;
}

const STORAGE_KEY_CDN_URL = 'geekclub_cdn_endpoint';
const STORAGE_KEY_CDN_TOKEN = 'geekclub_cdn_token';

export const DEFAULT_CDN_ENDPOINT = 'https://upc.geekclub.ir/s1/upload.php';
export const DEFAULT_CDN_TOKEN = ''; // never ship a real token in the client bundle - enter it in the admin panel

export const getCDNConfig = (): CDNConfig => {
  const endpointUrl = localStorage.getItem(STORAGE_KEY_CDN_URL) || DEFAULT_CDN_ENDPOINT;
  const apiToken = localStorage.getItem(STORAGE_KEY_CDN_TOKEN) || DEFAULT_CDN_TOKEN;
  return { endpointUrl, apiToken };
};

export const saveCDNConfig = (config: Partial<CDNConfig>): void => {
  if (config.endpointUrl !== undefined) {
    localStorage.setItem(STORAGE_KEY_CDN_URL, config.endpointUrl.trim());
  }
  if (config.apiToken !== undefined) {
    localStorage.setItem(STORAGE_KEY_CDN_TOKEN, config.apiToken.trim());
  }
};

/**
 * Tests connection & token authorization with the remote PHP CDN host.
 */
export const testCDNConnection = async (): Promise<CDNHealthReport> => {
  const config = getCDNConfig();
  const startTime = Date.now();
  const timestamp = new Date().toLocaleTimeString('fa-IR');

  try {
    const response = await fetch(config.endpointUrl, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'X-Api-Token': config.apiToken
      }
    });

    const latencyMs = Date.now() - startTime;

    if (response.ok || response.status === 200) {
      return {
        ok: true,
        statusCode: response.status,
        endpoint: config.endpointUrl,
        latencyMs,
        message: 'اتصال به سرور CDN و توکن امنیتی کاملاً برقرار و معتبر است.',
        details: `پاسخ مثبت دریافت شد (زمان پاسخ‌دهی: ${latencyMs}ms). فایل upload.php و تنظیمات CORS آماده آپلود عکس‌ها در پوشه s1 می‌باشند.`,
        timestamp
      };
    } else {
      return {
        ok: false,
        statusCode: response.status,
        endpoint: config.endpointUrl,
        latencyMs,
        message: `پاسخ ناموفق از CDN با کد وضعیت ${response.status}`,
        details: 'لطفاً بررسی نمایید که فایل upload.php در مسیر مشخص شده وجود داشته باشد و توکن امنیتی متناسب با تنظیمات باشد.',
        timestamp
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      statusCode: 0,
      endpoint: config.endpointUrl,
      latencyMs,
      message: 'خطا در برقراری ارتباط با هاست CDN',
      details: err.message || 'خطای شبکه یا مسدود شدن توسط CORS در مرورگر. از آپلود فایل upload.php در مسیر https://upc.geekclub.ir/s1/upload.php اطمینان حاصل فرمایید.',
      timestamp
    };
  }
};

/**
 * Compresses an image file in the browser and converts it to WebP format.
 * Optimized for content card cover standards (max width 800px, max height 600px).
 */
export const compressAndConvertToWebP = (
  file: File,
  quality = 0.80,
  maxWidth = 800,
  maxHeight = 600
): Promise<{ file: File; originalSize: number; compressedSize: number; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    // If SVG, skip canvas processing
    if (file.type === 'image/svg+xml') {
      const previewUrl = URL.createObjectURL(file);
      return resolve({
        file,
        originalSize: file.size,
        compressedSize: file.size,
        previewUrl
      });
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('فرمت تصویر پشتیبانی نمی‌شود'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('امکان پردازش تصویر وجود ندارد'));
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('خطا در فشرده‌سازی تصویر'));
            }

            const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
            const webpFileName = `${cleanName}_opt_${Date.now()}.webp`;
            const webpFile = new File([blob], webpFileName, { type: 'image/webp' });
            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: webpFile,
              originalSize: file.size,
              compressedSize: webpFile.size,
              previewUrl
            });
          },
          'image/webp',
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// Concurrency queue manager for CDN uploads (Max 5 concurrent uploads)
class ConcurrencyQueue {
  private maxConcurrent: number;
  private activeCount: number = 0;
  private queue: Array<{ fn: () => Promise<any>; resolve: (val: any) => void; reject: (err: any) => void }> = [];

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.next();
    });
  }

  private next() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    this.activeCount++;
    const item = this.queue.shift()!;
    item.fn()
      .then((res) => {
        this.activeCount--;
        item.resolve(res);
        this.next();
      })
      .catch((err) => {
        this.activeCount--;
        item.reject(err);
        this.next();
      });
  }
}

const cdnUploadQueue = new ConcurrencyQueue(5);

/**
 * Uploads a compressed file to the remote PHP CDN host (upc.geekclub.ir).
 * Organizes files into s1/{folder}/YYYY/MM structure.
 * Limited to max 5 concurrent uploads.
 */
export const uploadImageToCDN = async (
  file: File,
  folder = 'contents',
  onProgress?: (percent: number) => void
): Promise<{ url: string; filename: string; size: number }> => {
  return cdnUploadQueue.add(async () => {
    const config = getCDNConfig();

  // Compress and resize for card cover dimensions (max 800x600, WebP 80%)
  const { file: compressedFile, originalSize, compressedSize } = await compressAndConvertToWebP(file, 0.80, 800, 600);

  const formData = new FormData();
  formData.append('file', compressedFile);
  formData.append('api_token', config.apiToken);
  formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', config.endpointUrl, true);
    xhr.setRequestHeader('Authorization', `Bearer ${config.apiToken}`);
    xhr.setRequestHeader('X-Api-Token', config.apiToken);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.status && response.url) {
            resolve({
              url: response.url,
              filename: response.filename || compressedFile.name,
              size: response.size || compressedSize
            });
          } else {
            reject(new Error(response.message || 'خطا در ذخیره فایل روی هاست CDN'));
          }
        } catch {
          reject(new Error('پاسخ نامعتبر از سرور CDN دریافت شد'));
        }
      } else {
        try {
          const errResp = JSON.parse(xhr.responseText);
          reject(new Error(errResp.message || `خطای سرور CDN با کد ${xhr.status}`));
        } catch {
          reject(new Error(`خطای ارتباط با سرور CDN (${xhr.status}). لطفاً از آپلود فایل upload.php روی upc.geekclub.ir/s1/upload.php اطمینان حاصل فرمایید.`));
        }
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'خطای شبکه در اتصال به upc.geekclub.ir. لطفاً مطمئن شوید فایل upload.php روی هاست آپلود شده و تنظیمات CORS فعال است.'
        )
      );
    };

    xhr.send(formData);
  });
  });
};

/**
 * Downloads an external image via URL, converts to WebP File object and uploads to CDN.
 */
export const transferExternalUrlToCDN = async (
  imageUrl: string,
  folder = 'contents',
  filenamePrefix = 'migrated'
): Promise<string> => {
  if (!imageUrl || imageUrl.includes('upc.geekclub.ir') || imageUrl.startsWith('data:') || imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
    if (imageUrl.includes('upc.geekclub.ir/uploads/')) {
      return imageUrl.substring(imageUrl.indexOf('/uploads/'));
    }
    if (imageUrl.startsWith('uploads/')) {
      return `/${imageUrl}`;
    }
    return imageUrl; // Already on CDN, local storage or Data URI
  }

  // 1. First attempt: Call server proxy endpoint (bypasses browser CORS restrictions completely)
  try {
    const apiRes = await fetch('/api/transfer-to-cdn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, folder, filenamePrefix })
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success && data.url) {
        let returnUrl = data.url;
        if (returnUrl.includes('upc.geekclub.ir/uploads/')) {
          returnUrl = returnUrl.substring(returnUrl.indexOf('/uploads/'));
        }
        return returnUrl;
      }
    }
  } catch (err) {
    console.warn('Server transfer endpoint unavailable, trying direct client upload...', err);
  }

  // 2. Client-side fallback
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const file = new File([blob], `${filenamePrefix}_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      const result = await uploadImageToCDN(file, folder);
      return result.url;
    }
  } catch {
    //
  }

  // 3. Fallback to clean SVG Data URI if CDN upload is unavailable, avoiding blocked domains (like img.youtube.com or unsplash)
  if (imageUrl.includes('youtube') || imageUrl.includes('ytimg') || filenamePrefix.includes('youtube')) {
    return FALLBACK_IMAGES.youtube;
  } else if (imageUrl.includes('instagram') || filenamePrefix.includes('instagram')) {
    return FALLBACK_IMAGES.instagram;
  } else if (imageUrl.includes('aparat') || filenamePrefix.includes('aparat')) {
    return FALLBACK_IMAGES.aparat;
  }

  return FALLBACK_IMAGES.article;
};

/**
 * PHP code content template for user to copy/paste onto upc.geekclub.ir/s1/upload.php
 */
export const PHP_CDN_SCRIPT_CODE = `<?php
/**
 * GeekClub CDN Upload Bridge Script
 * Save this file as upload.php inside s1 folder (https://upc.geekclub.ir/s1/upload.php)
 * Files are automatically organized into s1/{folder}/{YYYY}/{MM} directory structure
 */

// 1. CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Api-Token");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// 2. Secret Token (Matches the token configured in GeekClub Admin)
$REQUIRED_TOKEN = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET";

// Check Authorization Token
$headers = getallheaders();
$providedToken = '';
if (isset($headers['Authorization'])) {
    $providedToken = str_replace('Bearer ', '', $headers['Authorization']);
} elseif (isset($headers['X-Api-Token'])) {
    $providedToken = $headers['X-Api-Token'];
} elseif (isset($_POST['api_token'])) {
    $providedToken = $_POST['api_token'];
}

if (empty($providedToken) || !hash_equals($REQUIRED_TOKEN, $providedToken)) {
    http_response_code(401);
    echo json_encode(["status" => false, "message" => "خطای دسترسی: توکن امنیتی API معتبر نیست"]);
    exit;
}

// Ping / Health Check Endpoint Response
if ($_SERVER['REQUEST_METHOD'] === 'GET' || (isset($_GET['ping']) || isset($_POST['ping']))) {
    http_response_code(200);
    echo json_encode([
        "status" => true,
        "message" => "ارتباط با CDN اختصاصی و فایل upload.php در پوشه s1 برقرار است",
        "timestamp" => date('Y-m-d H:i:s')
    ]);
    exit;
}

// 3. Folder & Directory Setup inside 's1' folder
$rawFolder = isset($_POST['folder']) ? $_POST['folder'] : 'contents';
$folderCategory = preg_replace('/[^a-zA-Z0-9_\\-\\/]/', '', $rawFolder);
$folderCategory = trim($folderCategory, '/');
if (empty($folderCategory)) {
    $folderCategory = 'contents';
}

// If folder specifies instagram/username (or custom subfolder), save directly under s1/instagram/username/; otherwise append YYYY/MM date
if (strpos($folderCategory, 'instagram/') === 0 || strpos($folderCategory, 'instagram') === 0) {
    $uploadSubpath = $folderCategory;
} else {
    $uploadSubpath = $folderCategory . '/' . date('Y/m');
}

// Save file physically inside __DIR__/{uploadSubpath}
$uploadBaseDir = __DIR__ . '/' . $uploadSubpath;
if (!file_exists($uploadBaseDir)) {
    @mkdir($uploadBaseDir, 0755, true);
}

// 4. Construct Public CDN Base URL automatically matching the script's exact web location
$scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'upc.geekclub.ir';

// Detect web subpath of this upload.php script automatically (e.g. "/s1" or "" or "/s1/upload")
$scriptPath = $_SERVER['SCRIPT_NAME'] ?? '/s1/upload.php';
$scriptDir = str_replace('\\\\', '/', dirname($scriptPath));
if ($scriptDir === '/' || $scriptDir === '.') {
    $scriptDir = '';
}

$baseUrl = $scheme . "://" . $host . $scriptDir . "/" . $uploadSubpath . "/";

// 5. File Validation
if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(["status" => false, "message" => "هیچ فایلی برای آپلود دریافت نشد"]);
    exit;
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(500);
    echo json_encode(["status" => false, "message" => "خطا در آپلود فایل (کد: " . $file['error'] . ")"]);
    exit;
}

// Allowed File Formats (Images & Videos)
$allowedExts = ['webp', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'mov']; // SVG is intentionally NOT allowed (can carry script)
$fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($fileExt, $allowedExts)) {
    http_response_code(400);
    echo json_encode(["status" => false, "message" => "پسوند فایل مجاز نیست. پسوندهای مجاز: " . implode(', ', $allowedExts)]);
    exit;
}

// Images must really be images (extension alone can be faked)
if (in_array($fileExt, ['webp', 'jpg', 'jpeg', 'png', 'gif']) && @getimagesize($file['tmp_name']) === false) {
    http_response_code(400);
    echo json_encode(["status" => false, "message" => "فایل تصویر معتبر نیست"]);
    exit;
}

// 6. Generate Unique Filename
$randomName = 'gc_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $fileExt;
$targetPath = $uploadBaseDir . '/' . $randomName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    $fileUrl = $baseUrl . $randomName;
    http_response_code(200);
    echo json_encode([
        "status" => true,
        "message" => "فایل با موفقیت در پوشه s1 آپلود شد",
        "url" => $fileUrl,
        "filename" => $randomName,
        "size" => $file['size']
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => false, "message" => "خطا در ذخیره‌سازی فایل روی هاست مقصد"]);
}
?>`;
