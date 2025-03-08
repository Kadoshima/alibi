const AWS = require('aws-sdk');

// AWS サービスクライアント
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const USERS_TABLE = process.env.USERS_TABLE;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;

/**
 * メール確認コード検証ハンドラー
 */
exports.handler = async (event) => {
  try {
    // リクエストボディのパース
    const requestBody = JSON.parse(event.body);
    const { userId, code, password } = requestBody;
    
    // 必須フィールドの検証
    if (!userId || !code || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'ユーザーID、確認コード、パスワードは必須です。' 
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
    
    // 確認コードの検証
    if (user.verificationCode !== code) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: '確認コードが一致しません。' 
        })
      };
    }
    
    // Cognito ユーザープールにユーザーを本登録
    await createCognitoUser(user.email, password, user.name);
    
    // DynamoDB のユーザー情報を更新（確認済みにする）
    await updateUserVerificationStatus(userId);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'ユーザー登録が完了しました。ログインしてください。' 
      })
    };
  } catch (error) {
    console.error('メール確認エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: '確認処理中にエラーが発生しました。' 
      })
    };
  }
};

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

/**
 * Cognito ユーザープールへのユーザー登録
 */
async function createCognitoUser(email, password, name) {
  const params = {
    UserPoolId: COGNITO_USER_POOL_ID,
    Username: email,
    TemporaryPassword: password,
    MessageAction: 'SUPPRESS', // 確認メールを送信しない
    UserAttributes: [
      {
        Name: 'email',
        Value: email
      },
      {
        Name: 'email_verified',
        Value: 'true'
      },
      {
        Name: 'name',
        Value: name
      }
    ]
  };
  
  // ユーザー作成
  await cognito.adminCreateUser(params).promise();
  
  // 一時パスワードを永続的なパスワードに設定
  const setPasswordParams = {
    Password: password,
    UserPoolId: COGNITO_USER_POOL_ID,
    Username: email,
    Permanent: true
  };
  
  await cognito.adminSetUserPassword(setPasswordParams).promise();
}

/**
 * ユーザーの確認ステータスを更新
 */
async function updateUserVerificationStatus(userId) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId
    },
    UpdateExpression: 'set verified = :verified, verificationCode = :code, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':verified': true,
      ':code': null,
      ':updatedAt': new Date().toISOString()
    }
  };
  
  return dynamodb.update(params).promise();
}