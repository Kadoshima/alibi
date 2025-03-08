const AWS = require('aws-sdk');

// AWS サービスクライアント
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const USERS_TABLE = process.env.USERS_TABLE;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;

/**
 * ログインハンドラー
 */
exports.handler = async (event) => {
  try {
    // リクエストボディのパース
    const requestBody = JSON.parse(event.body);
    const { email, password } = requestBody;
    
    // 必須フィールドの検証
    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'メールアドレスとパスワードは必須です。' 
        })
      };
    }
    
    // Cognito 認証
    const authResult = await authenticateUser(email, password);
    
    // ユーザー情報の取得
    const userInfo = await getUserByEmail(email);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'ログインに成功しました。',
        token: authResult.AuthenticationResult.IdToken,
        refreshToken: authResult.AuthenticationResult.RefreshToken,
        expiresIn: authResult.AuthenticationResult.ExpiresIn,
        user: {
          userId: userInfo.userId,
          email: userInfo.email,
          name: userInfo.name
        }
      })
    };
  } catch (error) {
    console.error('ログインエラー:', error);
    
    // エラーメッセージを適切に処理
    let errorMessage = '認証に失敗しました。';
    let statusCode = 401;
    
    if (error.code === 'UserNotFoundException') {
      errorMessage = 'ユーザーが見つかりません。';
    } else if (error.code === 'NotAuthorizedException') {
      errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
    } else if (error.code === 'UserNotConfirmedException') {
      errorMessage = 'ユーザーはまだ確認されていません。確認コードを確認してください。';
      statusCode = 403;
    } else {
      statusCode = 500;
      errorMessage = 'ログイン処理中にエラーが発生しました。';
    }
    
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: errorMessage 
      })
    };
  }
};

/**
 * Cognito による認証
 */
async function authenticateUser(email, password) {
  const params = {
    AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
    ClientId: COGNITO_APP_CLIENT_ID,
    UserPoolId: COGNITO_USER_POOL_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  };
  
  return cognito.adminInitiateAuth(params).promise();
}

/**
 * メールアドレスによるユーザー情報の取得
 */
async function getUserByEmail(email) {
  const params = {
    TableName: USERS_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  };
  
  const result = await dynamodb.query(params).promise();
  
  if (result.Items.length === 0) {
    throw new Error('ユーザーが見つかりません。');
  }
  
  return result.Items[0];
}