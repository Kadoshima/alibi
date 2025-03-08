const AWS = require('aws-sdk');

// 環境変数から AWS リージョンを取得
const region = process.env.AWS_REGION || 'ap-northeast-1';

// AWS SDK のグローバル設定
AWS.config.update({ region });

// S3 クライアントの初期化
const s3 = new AWS.S3();

/**
 * S3 バケット名を環境変数から取得
 */
const getBucketName = () => {
  const bucketName = process.env.S3_BUCKET;
  if (!bucketName) {
    throw new Error('環境変数 S3_BUCKET が設定されていません');
  }
  return bucketName;
};

/**
 * 署名付きアップロードURLの生成
 */
const getSignedUploadUrl = async (key, contentType, expiresIn = 3600, metadata = {}, tagging = null) => {
  const params = {
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    Expires: expiresIn,
    Metadata: {
      ...metadata,
      'uploaded-by': 'photo-marketplace'
    }
  };
  
  if (tagging) {
    params.Tagging = tagging;
  }
  
  try {
    return await s3.getSignedUrlPromise('putObject', params);
  } catch (error) {
    console.error('署名付きアップロードURL生成エラー:', error);
    throw error;
  }
};

/**
 * 署名付きダウンロードURLの生成
 */
const getSignedDownloadUrl = async (key, fileName = null, expiresIn = 3600) => {
  const params = {
    Bucket: getBucketName(),
    Key: key,
    Expires: expiresIn
  };
  
  if (fileName) {
    params.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(fileName)}"`;
  }
  
  try {
    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('署名付きダウンロードURL生成エラー:', error);
    throw error;
  }
};

/**
 * S3オブジェクトのタグを更新
 */
const updateObjectTag = async (key, tagKey, tagValue) => {
  const params = {
    Bucket: getBucketName(),
    Key: key,
    Tagging: {
      TagSet: [
        {
          Key: tagKey,
          Value: tagValue
        }
      ]
    }
  };
  
  try {
    return await s3.putObjectTagging(params).promise();
  } catch (error) {
    console.error('S3オブジェクトタグ更新エラー:', error);
    throw error;
  }
};

/**
 * S3オブジェクトを削除
 */
const deleteObject = async (key) => {
  const params = {
    Bucket: getBucketName(),
    Key: key
  };
  
  try {
    return await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('S3オブジェクト削除エラー:', error);
    throw error;
  }
};

/**
 * 複数のS3オブジェクトを一括削除
 */
const deleteObjects = async (keys) => {
  if (!keys || keys.length === 0) {
    return;
  }
  
  const params = {
    Bucket: getBucketName(),
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: false
    }
  };
  
  try {
    return await s3.deleteObjects(params).promise();
  } catch (error) {
    console.error('S3オブジェクト一括削除エラー:', error);
    throw error;
  }
};

/**
 * S3バケット内のオブジェクトを接頭辞でリスト
 */
const listObjectsByPrefix = async (prefix) => {
  const params = {
    Bucket: getBucketName(),
    Prefix: prefix
  };
  
  try {
    return await s3.listObjectsV2(params).promise();
  } catch (error) {
    console.error('S3オブジェクトリスト取得エラー:', error);
    throw error;
  }
};

/**
 * 画像ファイルの種類による拡張子の取得
 */
const getExtensionByContentType = (contentType) => {
  const extensionMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  
  return extensionMap[contentType] || 'jpg';
};

// エクスポート
module.exports = {
  s3,
  getBucketName,
  getSignedUploadUrl,
  getSignedDownloadUrl,
  updateObjectTag,
  deleteObject,
  deleteObjects,
  listObjectsByPrefix,
  getExtensionByContentType
};