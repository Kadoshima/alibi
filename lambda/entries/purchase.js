const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// AWS サービスクライアント
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// 環境変数
const ENTRIES_TABLE = process.env.ENTRIES_TABLE;
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE;
const REQUESTS_TABLE = process.env.REQUESTS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;

// 決済プロバイダの設定
// 注: 実際の実装では、以下のキーは AWS Secrets Manager や Parameter Store に保存すべき
const PAYMENT_PROVIDER_API_KEY = process.env.PAYMENT_PROVIDER_API_KEY || 'dummy_key';
const PAYMENT_PROVIDER_SECRET = process.env.PAYMENT_PROVIDER_SECRET || 'dummy_secret';

/**
 * 写真購入決済開始ハンドラー
 */
exports.handler = async (event) => {
  try {
    // JWT から userId を取得
    const userId = getUserIdFromEvent(event);
    
    // リクエストパスから requestId を取得
    const requestId = event.pathParameters.requestId;
    
    // リクエストボディのパース
    const requestBody = JSON.parse(event.body);
    const { entryId } = requestBody;
    
    // 必須フィールドの検証
    if (!entryId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: '応募IDは必須です。' 
        })
      };
    }
    
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
    
    // リクエストの存在確認と所有者確認
    const request = await getRequestById(requestId);
    if (!request) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'リクエストが見つかりません。' 
        })
      };
    }
    
    // リクエストの所有者か確認（バイヤーのみ購入可能）
    if (request.buyerId !== userId) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'このリクエストの購入権限がありません。' 
        })
      };
    }
    
    // 応募がこのリクエストに対するものか確認
    if (entry.requestId !== requestId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'この応募は指定されたリクエストに属していません。' 
        })
      };
    }
    
    // 既に購入済みか確認
    if (entry.purchased) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'この応募は既に購入されています。' 
        })
      };
    }
    
    // 新しい決済セッションの作成
    const paymentId = uuidv4();
    const amount = entry.price;
    const now = new Date().toISOString();
    
    // 決済プロバイダへのリクエスト
    // 注: 実際の実装では、ここで実際の決済プロバイダのAPIを呼び出す
    const paymentSession = {
      id: `session_${paymentId}`,
      url: `https://payment-provider.example.com/checkout?session=${paymentId}`,
      amount,
      currency: 'JPY'
    };
    
    // 決済情報をDynamoDBに保存
    const paymentRecord = {
      paymentId,
      requestId,
      entryId,
      buyerId: userId,
      sellerId: entry.sellerId,
      amount,
      status: 'pending',
      sessionId: paymentSession.id,
      createdAt: now,
      updatedAt: now
    };
    
    await dynamodb.put({
      TableName: PAYMENTS_TABLE,
      Item: paymentRecord
    }).promise();
    
    // S3のタグを変更（selected として扱う）
    await updateS3ObjectTag(entry.fileKey, 'selected');
    await updateS3ObjectTag(entry.thumbnailKey, 'selected');
    
    // 応募エントリーを「選択済み」に更新
    await updateEntrySelectedStatus(entryId, true);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '決済セッションを作成しました。',
        redirectUrl: paymentSession.url,
        paymentId,
        entryId,
        amount
      })
    };
  } catch (error) {
    console.error('決済開始エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: '決済処理の開始中にエラーが発生しました。' 
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
 * リクエストID によるリクエスト情報の取得
 */
async function getRequestById(requestId) {
  const params = {
    TableName: REQUESTS_TABLE,
    Key: {
      requestId
    }
  };
  
  const result = await dynamodb.get(params).promise();
  return result.Item;
}

/**
 * エントリーの選択状態を更新
 */
async function updateEntrySelectedStatus(entryId, selected) {
  const params = {
    TableName: ENTRIES_TABLE,
    Key: {
      entryId
    },
    UpdateExpression: 'set selected = :selected, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':selected': selected,
      ':updatedAt': new Date().toISOString()
    }
  };
  
  return dynamodb.update(params).promise();
}

/**
 * S3 オブジェクトのタグを更新
 */
async function updateS3ObjectTag(key, status) {
  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    Tagging: {
      TagSet: [
        {
          Key: 'Status',
          Value: status
        }
      ]
    }
  };
  
  return s3.putObjectTagging(params).promise();
}