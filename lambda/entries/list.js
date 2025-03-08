const AWS = require('aws-sdk');

// AWS サービスクライアント
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// 環境変数
const ENTRIES_TABLE = process.env.ENTRIES_TABLE;
const REQUESTS_TABLE = process.env.REQUESTS_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;

// ページネーション設定
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * 応募一覧取得ハンドラー
 */
exports.handler = async (event) => {
  try {
    // パスパラメータから requestId を取得
    const requestId = event.pathParameters.requestId;
    
    // クエリパラメータの取得
    const queryParams = event.queryStringParameters || {};
    const { limit, nextToken } = queryParams;
    
    // ページサイズの設定
    const pageSize = limit ? Math.min(parseInt(limit), MAX_LIMIT) : DEFAULT_LIMIT;
    
    // リクエストの存在確認
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
    
    // クエリパラメータを作成
    const params = {
      TableName: ENTRIES_TABLE,
      IndexName: 'RequestIndex',
      KeyConditionExpression: 'requestId = :requestId',
      ExpressionAttributeValues: {
        ':requestId': requestId
      },
      Limit: pageSize,
      ScanIndexForward: false // 降順（新しいエントリー順）
    };
    
    // 継続トークンがあれば追加
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }
    
    // DynamoDBにクエリを実行
    const result = await dynamodb.query(params).promise();
    
    // エントリーリストを整形（サムネイル用の署名付きURLを生成）
    const entries = await Promise.all(
      result.Items.map(async (entry) => {
        // サムネイル用の一時的な署名付きURLを生成
        const thumbnailUrl = await generatePresignedUrlForThumbnail(entry.thumbnailKey);
        
        // 返却するエントリー情報（プレビュー用）から機密情報を除外
        return {
          entryId: entry.entryId,
          requestId: entry.requestId,
          sellerName: entry.sellerName,
          title: entry.title,
          description: entry.description,
          price: entry.price,
          thumbnailUrl,
          selected: entry.selected,
          purchased: entry.purchased,
          createdAt: entry.createdAt
        };
      })
    );
    
    // レスポンスの作成
    const response = {
      entries,
      count: result.Count,
      request: {
        title: request.title,
        buyerName: request.buyerName,
        budget: request.budget,
        status: request.status
      }
    };
    
    // 継続トークンがあれば追加
    if (result.LastEvaluatedKey) {
      response.nextToken = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString('base64');
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('応募一覧取得エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: '応募一覧取得中にエラーが発生しました。' 
      })
    };
  }
};

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
 * サムネイル用の署名付きURLを生成
 */
async function generatePresignedUrlForThumbnail(thumbnailKey) {
  const params = {
    Bucket: S3_BUCKET,
    Key: thumbnailKey,
    Expires: 3600 // 1時間有効
  };
  
  return s3.getSignedUrlPromise('getObject', params);
}