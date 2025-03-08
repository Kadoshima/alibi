const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// AWS サービスクライアント
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

// 環境変数
const USERS_TABLE = process.env.USERS_TABLE;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;
const EMAIL_SENDER = process.env.EMAIL_SENDER;

/**
 * ユーザー登録ハンドラー
 */
exports.handler = async (event) => {
  try {
    // リクエストボディのパース
    const requestBody = JSON.parse(event.body);
    const { email, password, name } = requestBody;
    
    // 必須フィールドの検証
    if (!email || !password || !name) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'メールアドレス、パスワード、名前は必須です。' 
        })
      };
    }
    
    // メールアドレスの重複チェック
    const existingUser = await checkExistingUser(email);
    if (existingUser) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'このメールアドレスは既に登録されています。' 
        })
      };
    }
    
    // ランダムな確認コードの生成
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 新しいユーザーの作成
    const userId = uuidv4();
    const newUser = {
      userId,
      email,
      name,
      verificationCode,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // DynamoDB にユーザーを仮登録
    await dynamodb.put({
      TableName: USERS_TABLE,
      Item: newUser
    }).promise();
    
    // 確認コードをメールで送信
    await sendVerificationEmail(email, name, verificationCode);
    
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: '確認コードをメールで送信しました。コードを入力して登録を完了してください。',
        userId
      })
    };
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: '登録処理中にエラーが発生しました。' 
      })
    };
  }
};

/**
 * 既存ユーザーのチェック
 */
async function checkExistingUser(email) {
  const params = {
    TableName: USERS_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    }
  };
  
  const result = await dynamodb.query(params).promise();
  return result.Items.length > 0;
}

/**
 * 確認コードをメールで送信
 */
async function sendVerificationEmail(email, name, code) {
  const params = {
    Source: EMAIL_SENDER,
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: '【写真マーケットプレイス】メールアドレス確認コード'
      },
      Body: {
        Text: {
          Data: `${name} 様\n\nマーケットプレイスへのご登録ありがとうございます。\n\n確認コード: ${code}\n\nこのコードを入力して、登録を完了してください。\n\nこのメールに心当たりがない場合は無視してください。`
        }
      }
    }
  };
  
  return ses.sendEmail(params).promise();
}