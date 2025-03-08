const AWS = require('aws-sdk');

// 環境変数から AWS リージョンを取得
const region = process.env.AWS_REGION || 'ap-northeast-1';

// AWS SDK のグローバル設定
AWS.config.update({ region });

// Cognito Identity Provider クライアントの初期化
const cognito = new AWS.CognitoIdentityServiceProvider();

/**
 * 環境変数からCognitoユーザープールIDを取得
 */
const getUserPoolId = () => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('環境変数 COGNITO_USER_POOL_ID が設定されていません');
  }
  return userPoolId;
};

/**
 * 環境変数からCognitoアプリクライアントIDを取得
 */
const getAppClientId = () => {
  const appClientId = process.env.COGNITO_APP_CLIENT_ID;
  if (!appClientId) {
    throw new Error('環境変数 COGNITO_APP_CLIENT_ID が設定されていません');
  }
  return appClientId;
};

/**
 * Cognito ユーザーを作成
 */
const createCognitoUser = async (email, password, name) => {
  const params = {
    UserPoolId: getUserPoolId(),
    Username: email,
    TemporaryPassword: password,
    MessageAction: 'SUPPRESS', // 確認メールを送信しない（自前で送るため）
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
  
  try {
    // ユーザー作成
    const result = await cognito.adminCreateUser(params).promise();
    
    // 一時パスワードを永続的なパスワードに設定
    const setPasswordParams = {
      Password: password,
      UserPoolId: getUserPoolId(),
      Username: email,
      Permanent: true
    };
    
    await cognito.adminSetUserPassword(setPasswordParams).promise();
    
    return result;
  } catch (error) {
    console.error('Cognito ユーザー作成エラー:', error);
    throw error;
  }
};

/**
 * Cognito 認証
 */
const authenticateUser = async (email, password) => {
  const params = {
    AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
    ClientId: getAppClientId(),
    UserPoolId: getUserPoolId(),
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  };
  
  try {
    return await cognito.adminInitiateAuth(params).promise();
  } catch (error) {
    console.error('Cognito 認証エラー:', error);
    throw error;
  }
};

/**
 * Cognito リフレッシュトークンを使用してトークンを更新
 */
const refreshToken = async (refreshToken) => {
  const params = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: getAppClientId(),
    AuthParameters: {
      REFRESH_TOKEN: refreshToken
    }
  };
  
  try {
    return await cognito.initiateAuth(params).promise();
  } catch (error) {
    console.error('トークン更新エラー:', error);
    throw error;
  }
};

/**
 * Cognito からユーザー情報を取得
 */
const getCognitoUser = async (username) => {
  const params = {
    UserPoolId: getUserPoolId(),
    Username: username
  };
  
  try {
    return await cognito.adminGetUser(params).promise();
  } catch (error) {
    console.error('Cognito ユーザー取得エラー:', error);
    throw error;
  }
};

/**
 * Cognito ユーザーを無効化
 */
const disableCognitoUser = async (username) => {
  const params = {
    UserPoolId: getUserPoolId(),
    Username: username
  };
  
  try {
    return await cognito.adminDisableUser(params).promise();
  } catch (error) {
    console.error('Cognito ユーザー無効化エラー:', error);
    throw error;
  }
};

/**
 * Cognito ユーザーを有効化
 */
const enableCognitoUser = async (username) => {
  const params = {
    UserPoolId: getUserPoolId(),
    Username: username
  };
  
  try {
    return await cognito.adminEnableUser(params).promise();
  } catch (error) {
    console.error('Cognito ユーザー有効化エラー:', error);
    throw error;
  }
};

/**
 * Lambda イベントから userId を抽出
 */
const getUserIdFromEvent = (event) => {
  // Cognito 認証を通過した場合、requestContext.authorizer から情報取得
  if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
    const claims = event.requestContext.authorizer.claims;
    return claims['sub'] || claims['cognito:username'];
  }
  return null;
};

// エクスポート
module.exports = {
  cognito,
  getUserPoolId,
  getAppClientId,
  createCognitoUser,
  authenticateUser,
  refreshToken,
  getCognitoUser,
  disableCognitoUser,
  enableCognitoUser,
  getUserIdFromEvent
};