const AWS = require('aws-sdk');

// AWS サービスクライアント
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// 環境変数
const ENTRIES_TABLE = process.env.ENTRIES_TABLE;
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;

/**
 * 高解像度画像ダウンロード用URL発行ハンドラー
 */
exports.handler = async (event) => {
  try {
    // JWT から userId を取得
    const userId = getUserIdFromEvent(event);
    
    // パスパラメータから requestId と entryId を取得
    const requestId = event.pathParameters.requestId;
    const entryId = event.pathParameters.entryId;
    
    // エントリー（応募写真）の存在確認
    const entry = await getEntryById(entryId);
    if (!entry) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: '応募が見つかりません。' 
        })
      };
    }
    
    // リクエストIDの確認
    if (entry.requestId !== requestId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: '応募とリクエストが一致しません。' 
        })
      };
    }
    
    // 支払い確認 - バイヤーが支払い済みか確認
    const payment = await getPaymentByEntryId(requestId, entryId);
    
    // 権限チェック
    let authorized = false;
    
    // 1. 購入者（バイヤー）の場合 - 支払いが完了している必要がある
    if (payment && payment.buyerId === userId && payment.status === 'completed') {
      authorized = true;
    }
    // 2. 出品者（セラー）の場合 - 自分の出品した写真なら閲覧可能
    else if (entry.sellerId === userId) {
      authorized = true;
    }
    
    if (!authorized) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'この画像をダウンロードする権限がありません。支払いが完了していることを確認してください。' 
        })
      };
    }
    
    // オリジナル画像のダウンロード用署名付きURLを生成
    const downloadUrl = await generatePresignedDownloadUrl(entry.fileKey, entry.title);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'ダウンロードURLを発行しました。',
        downloadUrl,
        fileName: `${entry.title}.jpg` // 実際のファイル形式に合わせて変更すべき
      })
    };
  } catch (error) {
    console.error('ダウンロードURL発行エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'ダウンロードURL発行中にエラーが発生しました。' 
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
 * エントリーID による応募情報の取得
 */
async function getEntryById(entryId) {
  const params = {
    TableName: ENTRIES_TABLE,
    Key: {
      entryId
    }
  };
  
  const result = await dynamodb.get(params).promise();
  return result.Item;
}

/**
 * リクエストIDとエントリーIDによる支払い情報の取得
 */
async function getPaymentByEntryId(requestId, entryId) {
  const params = {
    TableName: PAYMENTS_TABLE,
    IndexName: 'RequestEntryIndex',
    KeyConditionExpression: 'requestId = :requestId AND entryId = :entryId',
    ExpressionAttributeValues: {
      ':requestId': requestId,
      ':entryId': entryId
    }
  };
  
  const result = await dynamodb.query(params).promise();
  
  if (result.Items.length === 0) {
    return null;
  }
  
  return result.Items[0];
}

/**
 * ダウンロード用の署名付きURLを生成
 */
async function generatePresignedDownloadUrl(fileKey, title) {
  const params = {
    Bucket: S3_BUCKET,
    Key: fileKey,
    Expires: 3600, // 1時間有効
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(title)}.jpg"` // 適切なファイル名とMIMEタイプ
  };
  
  return s3.getSignedUrlPromise('getObject', params);
}