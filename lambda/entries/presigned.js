const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// AWS サービスクライアント
const s3 = new AWS.S3();

// 環境変数
const S3_BUCKET = process.env.S3_BUCKET;

// アップロード設定
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif'
];

/**
 * S3アップロード用署名URL発行ハンドラー
 */
exports.handler = async (event) => {
  try {
    // JWT から userId を取得
    const userId = getUserIdFromEvent(event);
    
    // リクエストパスから requestId を取得
    const requestId = event.pathParameters.requestId;
    
    // リクエストボディのパース
    const requestBody = JSON.parse(event.body);
    const { contentType, fileSize } = requestBody;
    
    // 必須フィールドの検証
    if (!contentType || !fileSize) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'ファイルタイプとサイズは必須です。' 
        })
      };
    }
    
    // MIMEタイプの検証
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: '許可されていないファイルタイプです。JPEG、PNG、GIF のみ許可されています。' 
        })
      };
    }
    
    // ファイルサイズの検証
    if (fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `ファイルサイズが大きすぎます。最大 ${MAX_FILE_SIZE / 1024 / 1024}MB まで許可されています。` 
        })
      };
    }
    
    // ファイルキーの生成（ユニークなファイル名）
    const fileKey = `entries/${requestId}/${userId}/${uuidv4()}`;
    const thumbnailKey = `${fileKey}_thumbnail`;
    
    // オリジナル画像アップロード用の署名付きURL
    const originalUrl = await generatePresignedUrl(fileKey, contentType);
    
    // サムネイル画像アップロード用の署名付きURL
    const thumbnailUrl = await generatePresignedUrl(thumbnailKey, contentType);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalUrl,
        thumbnailUrl,
        fileKey,
        thumbnailKey
      })
    };
  } catch (error) {
    console.error('署名付きURL生成エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: '署名付きURL生成中にエラーが発生しました。' 
      })
    };
  }
};

/**
 * イベントから userId を抽出
 */
function getUserIdFromEvent(event) {
  // Cognito 認証を通過した場合、requestContext.authorizer から情報取得
  const claims = event.requestContext.authorizer.claims;
  return claims['sub'] || claims['cognito:username'];
}

/**
 * 署名付きURLの生成
 */
async function generatePresignedUrl(key, contentType) {
  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    Expires: 3600, // 1時間有効
    Tagging: 'Status=unselected',
    Metadata: {
      'uploaded-by': 'photo-marketplace'
    }
  };
  
  return s3.getSignedUrlPromise('putObject', params);
}