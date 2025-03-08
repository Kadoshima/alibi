const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// AWS サービスクライアント
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const REQUESTS_TABLE = process.env.REQUESTS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * リクエスト（買いたい）作成ハンドラー
 */
exports.handler = async (event) => {
  try {
    // JWT から userId を取得
    const userId = getUserIdFromEvent(event);
    
    // リクエストボディのパース
    const requestBody = JSON.parse(event.body);
    const { title, description, budget, deadline, category, requirements } = requestBody;
    
    // 必須フィールドの検証
    if (!title || !description || !budget || !deadline) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'タイトル、説明、予算、締切日は必須です。' 
        })
      };
    }
    
    // ユーザー情報の確認
    const user = await getUserById(userId);
    if (!user) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'ユーザーが見つかりません。' 
        })
      };
    }
    
    // 新しいリクエストの作成
    const requestId = uuidv4();
    const now = new Date().toISOString();
    
    const newRequest = {
      requestId,
      buyerId: userId,
      buyerName: user.name,
      title,
      description,
      budget: parseFloat(budget),
      deadline,
      category: category || 'その他',
      requirements: requirements || [],
      status: 'open',
      createdAt: now,
      updatedAt: now
    };
    
    // DynamoDB にリクエストを保存
    await dynamodb.put({
      TableName: REQUESTS_TABLE,
      Item: newRequest
    }).promise();
    
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'リクエストを作成しました。',
        request: newRequest
      })
    };
  } catch (error) {
    console.error('リクエスト作成エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'リクエスト作成中にエラーが発生しました。' 
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
 * ユーザーID によるユーザー情報の取得
 */
async function getUserById(userId) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId
    }
  };
  
  const result = await dynamodb.get(params).promise();
  return result.Item;
}