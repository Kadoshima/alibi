const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// AWS サービスクライアント
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const ENTRIES_TABLE = process.env.ENTRIES_TABLE;
const REQUESTS_TABLE = process.env.REQUESTS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * 応募（写真）メタデータ登録ハンドラー
 */
exports.handler = async (event) => {
  try {
    // JWT から userId を取得
    const userId = getUserIdFromEvent(event);
    
    // リクエストパスから requestId を取得
    const requestId = event.pathParameters.requestId;
    
    // リクエストボディのパース
    const requestBody = JSON.parse(event.body);
    const { 
      fileKey, 
      thumbnailKey, 
      title, 
      description, 
      price,
      metadata
    } = requestBody;
    
    // 必須フィールドの検証
    if (!fileKey || !thumbnailKey || !title || !price) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'ファイルキー、サムネイルキー、タイトル、価格は必須です。' 
        })
      };
    }
    
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
    
    // リクエストがオープン状態か確認
    if (request.status !== 'open') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'このリクエストは既に締め切られています。' 
        })
      };
    }
    
    // 自分自身のリクエストに応募できないようにする
    if (request.buyerId === userId) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: '自分のリクエストには応募できません。' 
        })
      };
    }
    
    // ユーザー情報の取得
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
    
    // 新しい応募エントリーの作成
    const entryId = uuidv4();
    const now = new Date().toISOString();
    
    const newEntry = {
      entryId,
      requestId,
      sellerId: userId,
      sellerName: user.name,
      fileKey,
      thumbnailKey,
      title,
      description: description || '',
      price: parseFloat(price),
      metadata: metadata || {},
      selected: false,
      purchased: false,
      createdAt: now,
      updatedAt: now
    };
    
    // DynamoDB に応募エントリーを保存
    await dynamodb.put({
      TableName: ENTRIES_TABLE,
      Item: newEntry
    }).promise();
    
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '応募を作成しました。',
        entry: newEntry
      })
    };
  } catch (error) {
    console.error('応募作成エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: '応募作成中にエラーが発生しました。' 
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