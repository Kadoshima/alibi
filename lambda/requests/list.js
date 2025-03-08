const AWS = require('aws-sdk');

// AWS サービスクライアント
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const REQUESTS_TABLE = process.env.REQUESTS_TABLE;

// ページネーション設定
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * リクエスト一覧取得ハンドラー
 */
exports.handler = async (event) => {
  try {
    // クエリパラメータの取得
    const queryParams = event.queryStringParameters || {};
    const {
      status,
      buyerId,
      category,
      limit,
      nextToken
    } = queryParams;
    
    // ページサイズの設定
    const pageSize = limit ? Math.min(parseInt(limit), MAX_LIMIT) : DEFAULT_LIMIT;
    
    // DynamoDBのクエリパラメータ作成
    let params = {};
    
    // ステータスによるフィルタリング
    if (status) {
      // StatusIndex を使用
      params = {
        TableName: REQUESTS_TABLE,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': status
        },
        Limit: pageSize,
        ScanIndexForward: false // 降順（新しい順）
      };
    } 
    // 購入者IDによるフィルタリング
    else if (buyerId) {
      // BuyerIndex を使用
      params = {
        TableName: REQUESTS_TABLE,
        IndexName: 'BuyerIndex',
        KeyConditionExpression: 'buyerId = :buyerId',
        ExpressionAttributeValues: {
          ':buyerId': buyerId
        },
        Limit: pageSize,
        ScanIndexForward: false // 降順（新しい順）
      };
    } 
    // その他はスキャン（カテゴリ等でフィルタリング）
    else {
      params = {
        TableName: REQUESTS_TABLE,
        Limit: pageSize
      };
      
      // カテゴリによるフィルタリング
      if (category) {
        params.FilterExpression = 'category = :category';
        params.ExpressionAttributeValues = {
          ':category': category
        };
      }
    }
    
    // 継続トークンがあれば追加
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }
    
    // DynamoDBにクエリを実行
    let result;
    
    if (status || buyerId) {
      result = await dynamodb.query(params).promise();
    } else {
      result = await dynamodb.scan(params).promise();
    }
    
    // レスポンスの作成
    const response = {
      requests: result.Items,
      count: result.Count
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
    console.error('リクエスト一覧取得エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'リクエスト一覧取得中にエラーが発生しました。' 
      })
    };
  }
};